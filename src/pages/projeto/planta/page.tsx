import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { calculatePlantaMetrics, calcularMateriaisFromPlanta, Planta, PlantaRoom, generateWallsFromRooms } from '../../../lib/planta';
import { supabase } from '../../../lib/supabase';

// lazy load 3D viewer to keep bundle small
const Planta3D = React.lazy(() => import('../../../components/Planta3D'));

// Simple SVG-based planta editor with drag/snap and shared wall detection
export default function PlantaPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [ambientes, setAmbientes] = useState<PlantaRoom[]>([]);
  const [form, setForm] = useState<Partial<PlantaRoom>>({ name: '', width: 3, length: 3, height: 2.7, isClosed: true, countsAsAlvenaria: true, hasForro: true });
  const [precos] = useState<Record<string, number>>({});
  const [coefs, setCoefs] = useState<any>({ fator_parede: 3.0, fator_inclinacao: 1.2 });
  const [materialRows, setMaterialRows] = useState<any[]>([]);

  // editor state (positions in meters)
  const [placedRooms, setPlacedRooms] = useState<any[]>([] as any[]);
  const [placedWalls, setPlacedWalls] = useState<any[]>([] as any[]);
  const [wallMode, setWallMode] = useState<'idle'|'placing'>('idle');
  const wallStartRef = useRef<{x:number,y:number}|null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string| null>(null);
  const openingDragRef = useRef<{ wallId: string; openingId: string; pointerId?: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pixelsPerMeter, setPixelsPerMeter] = useState(50); // scale for the editor (px per meter)
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const gridStep = 0.5; // meters for snapping

  useEffect(() => {
    // initialize placedRooms from ambientes if empty
    if (ambientes.length && placedRooms.length === 0) {
      const seeded = ambientes.map((a, i) => ({ ...a, x: 1 + i *  (a.width + 0.5), y: 1 + i *  (a.length + 0.5) }));
      setPlacedRooms(seeded);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientes]);

  // regenerate walls automatically from placedRooms (rooms supply x/y positions)
  useEffect(() => {
    try {
      const generated = generateWallsFromRooms(placedRooms.map(r => ({ ...r })) as PlantaRoom[]);
      // merge openings from existing placedWalls into generated walls by geometry
      const tol = 0.01;
      const merged = generated.map((gw) => {
        const match = (placedWalls || []).find((ew:any) => {
          const dx1 = Math.abs(ew.x1 - gw.x1); const dy1 = Math.abs(ew.y1 - gw.y1);
          const dx2 = Math.abs(ew.x2 - gw.x2); const dy2 = Math.abs(ew.y2 - gw.y2);
          const rev_dx1 = Math.abs(ew.x1 - gw.x2); const rev_dy1 = Math.abs(ew.y1 - gw.y2);
          const rev_dx2 = Math.abs(ew.x2 - gw.x1); const rev_dy2 = Math.abs(ew.y2 - gw.y1);
          return (dx1<=tol && dy1<=tol && dx2<=tol && dy2<=tol) || (rev_dx1<=tol && rev_dy1<=tol && rev_dx2<=tol && rev_dy2<=tol);
        });
        if (match) {
          return { ...gw, openings: match.openings || [], id: gw.id };
        }
        return gw;
      });
      // preserve selectedWallId mapping
      if (selectedWallId) {
        const found = merged.find(mw => (placedWalls || []).some((ew:any) => {
          const dx1 = Math.abs(ew.x1 - mw.x1); const dy1 = Math.abs(ew.y1 - mw.y1);
          const dx2 = Math.abs(ew.x2 - mw.x2); const dy2 = Math.abs(ew.y2 - mw.y2);
          const rev_dx1 = Math.abs(ew.x1 - mw.x2); const rev_dy1 = Math.abs(ew.y1 - mw.y2);
          const rev_dx2 = Math.abs(ew.x2 - mw.x1); const rev_dy2 = Math.abs(ew.y2 - mw.y1);
          return (dx1<=tol && dy1<=tol && dx2<=tol && dy2<=tol) || (rev_dx1<=tol && rev_dy1<=tol && rev_dx2<=tol && rev_dy2<=tol);
        }));
        if (!found) setSelectedWallId(null);
      }
      setPlacedWalls(merged as any[]);
    } catch (e) {
      console.warn('Could not generate walls from rooms', e);
    }
  }, [placedRooms]);

  function addAmbiente() {
    if (!form.name || !form.width || !form.length) return;
    const a: PlantaRoom = {
      id: String(Date.now()),
      name: String(form.name),
      width: Number(form.width),
      length: Number(form.length),
      height: form.height || 2.7,
      isClosed: form.isClosed === undefined ? true : !!form.isClosed,
      countsAsAlvenaria: form.countsAsAlvenaria === undefined ? true : !!form.countsAsAlvenaria,
      hasForro: form.hasForro === undefined ? true : !!form.hasForro,
    };
    setAmbientes((s) => [...s, a]);
    // place room at free spot
    setPlacedRooms((s) => [...s, { ...a, x: 1 + s.length * (a.width + 0.5), y: 1 + s.length * (a.length + 0.5) }]);
  }

  function removeAmbiente(id: string) {
    setAmbientes((s) => s.filter((x) => x.id !== id));
    setPlacedRooms((s) => s.filter((x) => x.id !== id));
  }

  // pointer drag state (move or resize)
  const dragState = useRef<{ id?: string; offsetX?: number; offsetY?: number; lastX?: number; lastY?: number; lastW?: number; lastH?: number; mode?: 'move'|'resize'; handle?: 'nw'|'ne'|'se'|'sw'; pointerId?: number } | null>(null);

  const [measure, setMeasure] = useState<{ visible: boolean; text: string; x: number; y: number }>({ visible: false, text: '', x: 0, y: 0 });

  function toPixels(m: number) {
    return Math.round(m * pixelsPerMeter);
  }
  function toMeters(px: number) {
    return +(px / pixelsPerMeter).toFixed(3);
  }

  function zoomIn() { setPixelsPerMeter(p => Math.min(200, Math.round(p * 1.2))); }
  function zoomOut() { setPixelsPerMeter(p => Math.max(10, Math.round(p / 1.2))); }
  function toggleFullscreenEditor() { setEditorFullscreen(s => !s); }

  function onPointerDown(e: React.PointerEvent, roomId: string) {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = (e as any).clientX; pt.y = (e as any).clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const room = placedRooms.find((r) => r.id === roomId);
    if (!room) return;
    dragState.current = { id: roomId, offsetX: loc.x - toPixels(room.x), offsetY: loc.y - toPixels(room.y), lastX: room.x, lastY: room.y, mode: 'move', pointerId: e.pointerId };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = (e as any).clientX; pt.y = (e as any).clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const id = dragState.current.id!;
    let nx = toMeters(loc.x - (dragState.current.offsetX || 0));
    let ny = toMeters(loc.y - (dragState.current.offsetY || 0));
    // snap to grid
    nx = Math.round(nx / gridStep) * gridStep;
    ny = Math.round(ny / gridStep) * gridStep;

    if (dragState.current.mode === 'move') {
      const lastX = dragState.current.lastX ?? nx;
      const lastY = dragState.current.lastY ?? ny;
      const dx = +(nx - lastX).toFixed(3);
      const dy = +(ny - lastY).toFixed(3);
      // update room position
      setPlacedRooms((s) => s.map((r) => r.id === id ? { ...r, x: nx, y: ny } : r));
      // translate walls that originated from this room
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        setPlacedWalls((walls) => walls.map((w:any) => {
          if (w.ambiente_origem === id) {
            return { ...w, x1: +(w.x1 + dx).toFixed(3), y1: +(w.y1 + dy).toFixed(3), x2: +(w.x2 + dx).toFixed(3), y2: +(w.y2 + dy).toFixed(3) };
          }
          return w;
        }));
      }
      // update last positions
      dragState.current.lastX = nx; dragState.current.lastY = ny;
      // show trena near room
      setMeasure({ visible: true, text: `${nx.toFixed(2)}m × ${ny.toFixed(2)}m`, x: toPixels(nx), y: toPixels(ny) });
      return;
    }

    if (dragState.current.mode === 'resize') {
      // resizing: compute new width/height depending on handle
      const handle = dragState.current.handle || 'se';
      setPlacedRooms((rooms) => rooms.map((r:any) => {
        if (r.id !== id) return r;
        let newX = r.x; let newY = r.y; let newW = r.width; let newH = r.length;
        if (handle === 'se') {
          newW = Math.max(0.5, +(toMeters(loc.x) - r.x).toFixed(3));
          newH = Math.max(0.5, +(toMeters(loc.y) - r.y).toFixed(3));
        } else if (handle === 'nw') {
          const ex = toMeters(loc.x); const ey = toMeters(loc.y);
          newW = Math.max(0.5, +(r.x + r.width - ex).toFixed(3));
          newH = Math.max(0.5, +(r.y + r.length - ey).toFixed(3));
          newX = +(ex).toFixed(3);
          newY = +(ey).toFixed(3);
        } else if (handle === 'ne') {
          const ex = toMeters(loc.x); const ey = toMeters(loc.y);
          newW = Math.max(0.5, +(ex - r.x).toFixed(3));
          newH = Math.max(0.5, +(r.y + r.length - ey).toFixed(3));
          newY = +(ey).toFixed(3);
        } else if (handle === 'sw') {
          const ex = toMeters(loc.x); const ey = toMeters(loc.y);
          newW = Math.max(0.5, +(r.x + r.width - ex).toFixed(3));
          newH = Math.max(0.5, +(ey - r.y).toFixed(3));
          newX = +(ex).toFixed(3);
        }
        // after changing room geometry, update walls that belong to this room to match new edges
        setPlacedWalls((walls) => {
          // compute new corners
          const corners = [ [newX, newY], [newX + newW, newY], [newX + newW, newY + newH], [newX, newY + newH] ];
          // segments in order
          const newSegs = [] as any[];
          for (let i=0;i<4;i++) {
            const a = corners[i]; const b = corners[(i+1)%4];
            newSegs.push({ x1: +a[0], y1: +a[1], x2: +b[0], y2: +b[1], len: +(Math.hypot(b[0]-a[0], b[1]-a[1]).toFixed(3)) });
          }
          return walls.map((w:any) => {
            if (w.ambiente_origem !== id) return w;
            // find best matching new segment
            let bestIdx = -1; let bestScore = Infinity;
            for (let i=0;i<newSegs.length;i++) {
              const s = newSegs[i];
              const score = Math.hypot(w.x1 - s.x1, w.y1 - s.y1) + Math.hypot(w.x2 - s.x2, w.y2 - s.y2);
              const rev = Math.hypot(w.x1 - s.x2, w.y1 - s.y2) + Math.hypot(w.x2 - s.x1, w.y2 - s.y1);
              const sc = Math.min(score, rev);
              if (sc < bestScore) { bestScore = sc; bestIdx = i; }
            }
            if (bestIdx === -1 || bestScore > 1.0) return w; // no good match
            const s = newSegs[bestIdx];
            const newWLen = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
            // clamp openings within new wall length
            const newOpenings = (w.openings||[]).map((o:any) => {
              const off = Math.max(0, Math.min(o.offset || 0, Math.max(0, newWLen - (o.width||0))));
              return { ...o, offset: Number(off.toFixed(3)) };
            });
            return { ...w, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, openings: newOpenings };
          });
        });

        return { ...r, x: newX, y: newY, width: newW, length: newH };
      }));
      // update measure
      setMeasure({ visible: true, text: `${ (dragState.current.lastW || 0).toFixed(2) }m × ${ (dragState.current.lastH || 0).toFixed(2) }m`, x: toPixels(nx), y: toPixels(ny) });
      return;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragState.current) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch (err) { console.debug('releasePointerCapture failed', err); }
    dragState.current = null;
    setMeasure({ visible: false, text: '', x: 0, y: 0 });
  }

  function onHandlePointerDown(e: React.PointerEvent, roomId: string, handle: 'nw'|'ne'|'se'|'sw') {
    const svg = svgRef.current; if (!svg) return;
    const room = placedRooms.find((r) => r.id === roomId);
    if (!room) return;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { console.debug('setPointerCapture failed', err); }
    dragState.current = { id: roomId, mode: 'resize', handle, lastX: room.x, lastY: room.y, lastW: room.width, lastH: room.length, pointerId: e.pointerId };
  }

  function copyRoom(roomId: string) {
    const room = placedRooms.find((r) => r.id === roomId);
    if (!room) return;
    const newId = String(Date.now());
    const copy = { ...room, id: newId, x: +(room.x + 0.5).toFixed(3), y: +(room.y + 0.5).toFixed(3), name: room.name + ' (cópia)' };
    setAmbientes((s) => [...s, { id: copy.id, name: copy.name, width: copy.width, length: copy.length, height: copy.height, isClosed: copy.isClosed, countsAsAlvenaria: copy.countsAsAlvenaria, hasForro: copy.hasForro }]);
    setPlacedRooms((s) => [...s, copy]);
  }

  function onRoomDoubleClick(e: React.MouseEvent, roomId: string) {
    e.stopPropagation();
    copyRoom(roomId);
  }

  function startEditRoom(room: any) {
    setEditingRoomId(room.id);
    setEditForm({ name: room.name, width: room.width, length: room.length, height: room.height });
  }

  function cancelEditRoom() {
    setEditingRoomId(null);
    setEditForm({});
  }

  function saveEditRoom(id: string) {
    // validate and commit
    const w = Number(editForm.width || 0);
    const l = Number(editForm.length || 0);
    const h = Number(editForm.height || 2.7);
    if (!editForm.name || !w || !l) return alert('Preencha nome, largura e comprimento válidos');
    setAmbientes((s) => s.map((a) => a.id === id ? { ...a, name: String(editForm.name), width: w, length: l, height: h } : a));
    setPlacedRooms((s) => s.map((r:any) => r.id === id ? { ...r, name: String(editForm.name), width: w, length: l, height: h } : r));
    setEditingRoomId(null);
    setEditForm({});
  }

  // compute wall segments and external perimeter by comparing room edges
  function computeWallSegments(rooms: any[]) {
    type Seg = { x1:number,y1:number,x2:number,y2:number,len:number };
    const segs: Seg[] = [];
    for (const r of rooms) {
      const x = r.x; const y = r.y; const w = r.width; const h = r.length;
      const corners = [ [x,y], [x+w,y], [x+w,y+h], [x,y+h] ];
      for (let i=0;i<4;i++){
        const a = corners[i]; const b = corners[(i+1)%4];
        const sx1 = Math.min(a[0],b[0]); const sy1 = Math.min(a[1],b[1]);
        const sx2 = Math.max(a[0],b[0]); const sy2 = Math.max(a[1],b[1]);
        const len = Math.hypot(sx2-sx1, sy2-sy1);
        segs.push({ x1:+sx1.toFixed(3), y1:+sy1.toFixed(3), x2:+sx2.toFixed(3), y2:+sy2.toFixed(3), len });
      }
    }
    // normalize segments for matching: horizontal or vertical only
    const norm = segs.map(s => {
      if (Math.abs(s.x1 - s.x2) < 1e-6) return { key: `v:${s.x1}:${s.y1}-${s.y2}`, len: s.len, s };
      return { key: `h:${s.y1}:${s.x1}-${s.x2}`, len: s.len, s };
    });
    const map = new Map<string, {count:number, len:number}>();
    for (const n of norm) {
      const existing = map.get(n.key);
      if (existing) existing.count += 1;
      else map.set(n.key, { count: 1, len: n.len });
    }
    // external segments are those with count === 1
    let externalLen = 0;
    for (const v of map.values()) if (v.count === 1) externalLen += v.len;
    return { totalWallLen: segs.reduce((s,x)=>s+x.len,0), externalLen };
  }

  const planta: Planta = { ambientes: placedRooms.map((r) => ({ id: r.id, name: r.name, width: r.width, length: r.length, height: r.height, isClosed: r.isClosed, countsAsAlvenaria: r.countsAsAlvenaria, hasForro: r.hasForro })), paredes: placedWalls };
  const metrics = calculatePlantaMetrics(planta, coefs);
  const segsInfo = computeWallSegments(placedRooms);

  const [saving, setSaving] = useState(false);
  const [_loadedPlantaId, setLoadedPlantaId] = useState<string | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlantaRoom>>({});
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [copiedRoom, setCopiedRoom] = useState<any | null>(null);
  const [selectedOpening, setSelectedOpening] = useState<{ wallId: string; openingId: string } | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedPlantas, setSavedPlantas] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [openStatus, setOpenStatus] = useState<string | null>(null);

  // refs to hold latest values for keyboard handler to avoid variable-length deps
  const selectedRoomIdsRef = useRef<string[]>(selectedRoomIds);
  const placedRoomsRef = useRef<any[]>(placedRooms);
  const copiedRoomRef = useRef<any | null>(copiedRoom);
  const selectedOpeningRef = useRef<{ wallId: string; openingId: string } | null>(selectedOpening);
  const placedWallsRef = useRef<any[]>(placedWalls);
  const editingRoomIdRef = useRef<string | null>(editingRoomId);

  // keep refs in sync
  selectedRoomIdsRef.current = selectedRoomIds;
  placedRoomsRef.current = placedRooms;
  copiedRoomRef.current = copiedRoom;
  selectedOpeningRef.current = selectedOpening;
  placedWallsRef.current = placedWalls;
  editingRoomIdRef.current = editingRoomId;

  // debug: log when placedRooms or placedWalls change and expose helper
  useEffect(() => {
    console.log('placedRooms changed:', (placedRooms || []).length, placedRooms);
    // expose quick debug helper
    try { (window as any).plantaDebug = () => console.log({ placedRooms, placedWalls, placedRoomsRef: placedRoomsRef.current, placedWallsRef: placedWallsRef.current }); } catch (err) { console.warn('plantaDebug attach failed', err); }
  }, [placedRooms]);
  useEffect(() => { console.log('placedWalls changed:', (placedWalls || []).length, placedWalls); }, [placedWalls]);

  const shortcutDepsHash = useMemo(() => JSON.stringify({ s: selectedRoomIds, pr: placedRooms, cr: copiedRoom, so: selectedOpening, pw: placedWalls, er: editingRoomId }), [selectedRoomIds, placedRooms, copiedRoom, selectedOpening, placedWalls, editingRoomId]);

  async function savePlanta(overridePayload?: { ambientes: any[]; paredes: any[] }) {
    if (!params.id) return alert('Projeto não identificado');
    setSaving(true);
    try {
      // sanitize payload to avoid accidentally serializing DOM/React nodes
      function sanitizePlantaData(raw: { ambientes: any[]; paredes: any[] } | undefined) {
        const a = (raw?.ambientes || []).map((r:any) => ({ id: r.id, name: r.name, x: Number(r.x||0), y: Number(r.y||0), width: Number(r.width||0), length: Number(r.length||0), height: Number(r.height||0), isClosed: !!r.isClosed, countsAsAlvenaria: !!r.countsAsAlvenaria, hasForro: !!r.hasForro, groupId: r.groupId }));
        const p = (raw?.paredes || []).map((w:any) => ({ id: w.id, x1: Number(w.x1||0), y1: Number(w.y1||0), x2: Number(w.x2||0), y2: Number(w.y2||0), thickness: Number(w.thickness||0.1), height: Number(w.height||2.7), type: w.type || 'interna', ambiente_origem: w.ambiente_origem || null, openings: (w.openings||[]).map((o:any) => ({ id: o.id, type: o.type, width: Number(o.width||0), height: Number(o.height||0), offset: Number(o.offset||0), bottom: Number(o.bottom||0) })) }));
        return { ambientes: a, paredes: p };
      }

      // prefer latest refs to avoid saving stale state when called right after setState
      const currentRooms = overridePayload?.ambientes ?? placedRoomsRef.current ?? placedRooms;
      const currentWalls = overridePayload?.paredes ?? placedWallsRef.current ?? placedWalls;
      const payload = sanitizePlantaData({ ambientes: currentRooms, paredes: currentWalls });
      // debug: log payload before sending to Supabase
      console.log('savePlanta payload (sanitized):', payload);
      // get current user to set owner
      const userResp = await supabase.auth.getUser();
      const owner = (userResp as any)?.data?.user?.id || null;

      // try to find existing planta for this projeto (maybeSingle avoids throwing when 0 rows)
      const { data: existing, error: existingErr } = await supabase.from('plantas').select('id,owner').eq('projeto_id', params.id).limit(1).maybeSingle();
      if (existingErr) throw existingErr;
      if (existing && (existing as any).id) {
        // include owner in update payload (if it's null we attempt to claim it)
        const updatePayload: any = { data: payload, updated_at: new Date().toISOString() };
        if (owner) updatePayload.owner = owner;
        const { data: updatedRow, error: updateErr } = await supabase.from('plantas').update(updatePayload).eq('id', existing.id).select().single();
        if (updateErr) throw updateErr;
        console.log('savePlanta update result:', updatedRow);
        setLoadedPlantaId(existing.id);
      } else {
        const insertPayload: any = { projeto_id: params.id, title: `Planta ${new Date().toISOString()}`, data: payload };
        if (owner) insertPayload.owner = owner;
        const { data: inserted, error: insertErr } = await supabase.from('plantas').insert([insertPayload]).select().single();
        if (insertErr) throw insertErr;
        console.log('savePlanta insert result:', inserted);
        setLoadedPlantaId(inserted.id);
      }
      alert('Planta salva.');
    } catch (err:any) {
      console.error(err);
      alert('Erro ao salvar planta: ' + (err.message || err));
    } finally { setSaving(false); }
  }

  async function loadPlanta() {
    if (!params.id) return alert('Projeto não identificado');
    try {
      // use maybeSingle to avoid error when no rows are returned
      const { data, error } = await supabase.from('plantas').select('id,data').eq('projeto_id', params.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data || !data.data) return alert('Nenhuma planta encontrada para este projeto');
      const doc = data.data as any;
      // load ambientes and paredes with positions
      setPlacedRooms(doc.ambientes || []);
      setPlacedWalls(doc.paredes || []);
      setAmbientes((doc.ambientes || []).map((a:any) => ({ id: a.id, name: a.name, width: a.width, length: a.length, height: a.height, isClosed: a.isClosed, countsAsAlvenaria: a.countsAsAlvenaria, hasForro: a.hasForro })));
      setLoadedPlantaId(data.id);
      alert('Planta carregada');
    } catch (err:any) {
      console.error(err);
      alert('Erro ao carregar planta: ' + (err.message || err));
    }
  }

  // Fetch list of saved plantas for this project
  async function fetchSavedPlantas() {
    if (!params.id) return;
    setLoadingSaved(true);
    try {
      // include `data` column for diagnostic purposes
      const { data, error } = await supabase.from('plantas').select('id,title,owner,created_at,updated_at,data').eq('projeto_id', params.id).order('created_at', { ascending: false });
      if (error) throw error;
      console.log('fetchSavedPlantas result (rows):', data);
      // log per-row summary of stored `data`
      (data || []).forEach((row:any) => {
        try {
          const d = row.data;
          if (!d) return console.log(`row ${row.id} data: <empty>`);
          // if nested under .data (double-wrapped), try to normalize
          const candidate = typeof d === 'string' ? (() => { try { return JSON.parse(d); } catch { return d; } })() : d;
          const ambientesCount = Array.isArray(candidate?.ambientes) ? candidate.ambientes.length : (Array.isArray(candidate?.rooms) ? candidate.rooms.length : 'n/a');
          const paredesCount = Array.isArray(candidate?.paredes) ? candidate.paredes.length : (Array.isArray(candidate?.walls) ? candidate.walls.length : 'n/a');
          console.log(`row ${row.id} summary -> ambientes: ${ambientesCount}, paredes: ${paredesCount}`);
        } catch (e) { console.warn('Error summarizing row data', e); }
      });
      setSavedPlantas(data || []);
    } catch (err:any) {
      console.error('Erro ao buscar plantas salvas', err);
      alert('Erro ao buscar plantas salvas: ' + (err.message || err));
    } finally { setLoadingSaved(false); }
  }

  async function openSavedPlanta(plantaId: string) {
    setOpenStatus('Abrindo planta...');
    setLoadingSaved(true);
    try {
      // request more fields for debugging
      const resp = await supabase.from('plantas').select('id,projeto_id,title,owner,created_at,updated_at,data').eq('id', plantaId).maybeSingle();
      const { data, error } = resp as any;
      console.log('openSavedPlanta raw response:', resp);
      if (error) throw error;
      if (!data) {
        setOpenStatus('Planta não encontrada');
        return alert('Planta não encontrada');
      }
      // data.data might be an object or a JSON string depending on how it was stored
      let docAny: any = data.data;
      console.log('planta row.data (raw):', docAny);
      console.log('planta row.data typeof:', typeof docAny);
      if (typeof docAny === 'string') console.log('planta row.data (string length):', docAny.length);
      if (!docAny) {
        setOpenStatus('Planta sem conteúdo');
        return alert('Planta sem conteúdo');
      }
      if (typeof docAny === 'string') {
        try { docAny = JSON.parse(docAny); } catch (e) { console.warn('Could not parse planta.data JSON string', e); }
      }
      // support legacy shapes: { ambientes, paredes } or { rooms, walls }
      const ambientesData = docAny.ambientes || docAny.rooms || [];
      const paredesData = docAny.paredes || docAny.walls || [];
      // ensure arrays
      const saneAmb = Array.isArray(ambientesData) ? ambientesData : [];
      const saneParedes = Array.isArray(paredesData) ? paredesData : [];
      setPlacedRooms(saneAmb.map((a:any) => ({ ...a })));
      setPlacedWalls(saneParedes.map((w:any) => ({ ...w })));
      console.log('placedRooms set to:', saneAmb);
      console.log('placedWalls set to:', saneParedes);
      setAmbientes(saneAmb.map((a:any) => ({ id: a.id, name: a.name, width: a.width, length: a.length, height: a.height, isClosed: a.isClosed, countsAsAlvenaria: a.countsAsAlvenaria, hasForro: a.hasForro })));
      setLoadedPlantaId(plantaId);
      if ((saneAmb.length === 0 && saneParedes.length === 0)) {
        setOpenStatus('Planta aberta, mas está vazia (0 ambientes e 0 paredes)');
        // keep modal open so user can choose another planta
        alert('Planta aberta, mas está vazia (0 ambientes e 0 paredes)');
      } else {
        setShowSavedModal(false);
        setOpenStatus('Planta aberta');
        alert('Planta aberta');
      }
    } catch (err:any) {
      console.error(err);
      setOpenStatus('Erro ao abrir planta: ' + (err.message || err));
      alert('Erro ao abrir planta: ' + (err.message || err));
    } finally {
      setLoadingSaved(false);
    }
  }

  async function deleteSavedPlanta(plantaId: string) {
    if (!confirm('Deseja realmente excluir essa planta?')) return;
    try {
      const { error } = await supabase.from('plantas').delete().eq('id', plantaId);
      if (error) throw error;
      setSavedPlantas((s) => s.filter(p => p.id !== plantaId));
      alert('Planta excluída');
    } catch (err:any) {
      console.error(err);
      alert('Erro ao excluir planta: ' + (err.message || err));
    }
  }

  // Wall placement handlers
  function onSvgClickForWall(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = (e as any).clientX; pt.y = (e as any).clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const mx = toMeters(loc.x); const my = toMeters(loc.y);
    if (wallMode === 'placing') {
      if (!wallStartRef.current) {
        wallStartRef.current = { x: mx, y: my };
        return;
      }
      // finish wall
      const start = wallStartRef.current; wallStartRef.current = null; setWallMode('idle');
      const id = String(Date.now());
      const newWall = { id, x1: start.x, y1: start.y, x2: mx, y2: my, thickness: 0.10, height: 2.7, type: 'interna', openings: [] };
      setPlacedWalls((s) => [...s, newWall]);
      return;
    }
    // not placing wall: try to pick nearest wall to click
    pickWallNearPoint(mx, my);
  }

  function pickWallNearPoint(mx: number, my: number) {
    // choose nearest wall within threshold (meters)
    const threshold = 0.25; // 25 cm
    let best: { id: string; dist: number } | null = null;
    for (const w of placedWalls) {
      const x1 = w.x1; const y1 = w.y1; const x2 = w.x2; const y2 = w.y2;
      // point-to-segment distance
      const A = mx - x1; const B = my - y1; const C = x2 - x1; const D = y2 - y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, dot / lenSq));
      const px = x1 + t * C; const py = y1 + t * D;
      const dist = Math.hypot(mx - px, my - py);
      if (dist <= threshold && (!best || dist < best.dist)) best = { id: w.id, dist };
    }
    if (best) {
      setSelectedWallId(best.id);
      return true;
    }
    // nothing near
    setSelectedWallId(null);
    return false;
  }

  function startOpeningDrag(e: React.PointerEvent, wallId: string, openingId: string) {
    const el = e.target as Element;
    try { el.setPointerCapture(e.pointerId); } catch (err) { console.debug('setPointerCapture (opening) failed', err); }
    openingDragRef.current = { wallId, openingId, pointerId: e.pointerId };
  }

  function moveOpeningDrag(e: React.PointerEvent) {
    if (!openingDragRef.current) return;
    const { wallId, openingId } = openingDragRef.current;
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = (e as any).clientX; pt.y = (e as any).clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const mx = toMeters(loc.x); const my = toMeters(loc.y);
    // find wall
    const w = placedWalls.find((x) => x.id === wallId);
    if (!w) return;
    const dx = w.x2 - w.x1; const dy = w.y2 - w.y1; const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const ux = dx / len; const uy = dy / len;
    // projection distance from wall start
    const proj = ( (mx - w.x1) * ux + (my - w.y1) * uy );
    const openings = w.openings || [];
    const oidx = openings.findIndex((o:any)=>o.id===openingId);
    if (oidx === -1) return;
    const o = openings[oidx];
    // center-based proj -> convert to offset (start of opening)
    let newOffset = proj - (o.width || 0) / 2;
    // clamp
    newOffset = Math.max(0, Math.min(newOffset, Math.max(0, len - (o.width || 0))));
    // update wall openings
    setPlacedWalls((s) => s.map((ww) => {
      if (ww.id !== wallId) return ww;
      const newOpenings = (ww.openings || []).map((oo:any)=> oo.id === openingId ? { ...oo, offset: Number(newOffset.toFixed(3)) } : oo);
      return { ...ww, openings: newOpenings };
    }));
  }

  function endOpeningDrag(e: React.PointerEvent) {
    if (!openingDragRef.current) return;
    const el = e.target as Element;
    try { el.releasePointerCapture(e.pointerId); } catch (err) { console.debug('releasePointer failed', err); }
    openingDragRef.current = null;
    // clear any temporary selection from drag (keep selection)
    // autosave after finishing drag (delay to allow state updates to flush)
    setTimeout(() => {
      savePlanta({ ambientes: placedRoomsRef.current, paredes: placedWallsRef.current }).catch((err) => console.warn('Auto-save after drag failed', err));
    }, 80);
  }

  function addOpeningToWall(wallId: string, opening: any) {
    const next = (placedWalls || []).map((w:any) => w.id === wallId ? { ...w, openings: [...(w.openings||[]), opening] } : w);
    setPlacedWalls(next);
    // auto-save after adding opening (use refs to avoid stale state)
    savePlanta({ ambientes: placedRoomsRef.current, paredes: next }).catch((e) => console.warn('Auto-save falhou', e));
  }

  // selection, copy/paste and grouping utilities
  function handleRoomClick(e: React.MouseEvent, r: any) {
    e.stopPropagation();
    const shift = (e as any).shiftKey;
    setSelectedRoomIds(prev => {
      if (shift) {
        if (prev.includes(r.id)) return prev.filter(id => id !== r.id);
        return [...prev, r.id];
      }
      return [r.id];
    });
    // also attempt to pick a nearby wall inside this room (existing behavior)
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint(); pt.x = (e as any).clientX; pt.y = (e as any).clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const loc = pt.matrixTransform(ctm.inverse());
    const mx = toMeters(loc.x); const my = toMeters(loc.y);
    pickWallNearPoint(mx, my);
  }

  function pasteCopiedRoom() {
    if (!copiedRoom) return alert('Nada copiado');
    const newId = String(Date.now());
    const room = { ...copiedRoom, id: newId, x: +(copiedRoom.x + 0.5).toFixed(3), y: +(copiedRoom.y + 0.5).toFixed(3), name: (copiedRoom.name||'Cópia') };
    setAmbientes((s) => [...s, { id: room.id, name: room.name, width: room.width, length: room.length, height: room.height, isClosed: room.isClosed, countsAsAlvenaria: room.countsAsAlvenaria, hasForro: room.hasForro }]);
    setPlacedRooms((s) => [...s, room]);
  }

  function organizeRooms() {
    const rooms = [...placedRooms];
    if (rooms.length === 0) return;
    const n = rooms.length;
    const cols = Math.ceil(Math.sqrt(n));
    const maxW = Math.max(...rooms.map(r=>r.width));
    const maxH = Math.max(...rooms.map(r=>r.length));
    const spacing = 0.8;
    const arranged = rooms.map((r, idx) => {
      const cx = idx % cols; const cy = Math.floor(idx / cols);
      return { ...r, x: +(1 + cx * (maxW + spacing)).toFixed(3), y: +(1 + cy * (maxH + spacing)).toFixed(3) };
    });
    setPlacedRooms(arranged);
  }

  function groupSelectedRooms() {
    if (selectedRoomIds.length < 2) return alert('Selecione pelo menos dois cômodos (Shift+Clique)');
    const gid = `g_${Date.now()}`;
    setPlacedRooms((s) => s.map(r => selectedRoomIds.includes(r.id) ? { ...r, groupId: gid } : r));
  }

  function ungroupSelectedRooms() {
    if (selectedRoomIds.length === 0) return alert('Nenhum cômodo selecionado');
    setPlacedRooms((s) => s.map(r => selectedRoomIds.includes(r.id) ? { ...r, groupId: undefined } : r));
  }

  // keyboard shortcuts for copy/paste
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        // copy
        const sel = selectedRoomIdsRef.current;
        if (sel.length !== 1) return; // only copy single
        const id = sel[0];
        const r = placedRoomsRef.current.find(rr => rr.id === id);
        if (!r) return;
        setCopiedRoom(JSON.parse(JSON.stringify(r)));
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        // paste
        e.preventDefault();
        if (!copiedRoomRef.current) return;
        pasteCopiedRoom();
      }
      // Enter to save current edit
      if (e.key === 'Enter' && editingRoomIdRef.current) {
        e.preventDefault();
        saveEditRoom(editingRoomIdRef.current);
      }
      // Delete or Backspace: remove selected opening if any
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOpeningRef.current) {
        e.preventDefault();
        const selOpen = selectedOpeningRef.current!;
        const nextWalls = (placedWallsRef.current || []).map((w:any) => {
          if (w.id !== selOpen.wallId) return w;
          return { ...w, openings: (w.openings || []).filter((o:any) => (o.id || String(o.offset || '')) !== selOpen.openingId) };
        });
        setPlacedWalls(nextWalls);
        setSelectedOpening(null);
        // auto-save with updated walls (sanitize happens inside savePlanta)
        savePlanta({ ambientes: placedRoomsRef.current, paredes: nextWalls }).catch((err) => console.warn('Auto-save delete opening failed', err));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // depend on serialized snapshot to re-register handler when relevant state changes
  }, [shortcutDepsHash]);

  function handleCalcular() {
    const res = calcularMateriaisFromPlanta(planta, precos, coefs as any);
    setMaterialRows(res.rows || []);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (params?.id) navigate(`/projeto/${params.id}`); else navigate(-1); }} className="px-3 py-1 bg-gray-100 rounded text-sm">← Voltar</button>
          <h1 className="text-2xl font-bold text-sky-600">Planta Baixa — Projeto</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => { setShowSavedModal(true); await fetchSavedPlantas(); }} className="bg-gray-100 px-3 py-1 rounded">Plantas salvas</button>
        </div>
        {editingRoomId && (
          <div className="flex items-center gap-2">
            <button onClick={() => saveEditRoom(editingRoomId)} className="bg-green-600 text-white px-3 py-1 rounded">Salvar</button>
            <button onClick={cancelEditRoom} className="bg-gray-200 px-3 py-1 rounded">Cancelar</button>
          </div>
        )}
      </div>

      <div className={`mt-4 grid grid-cols-1 ${editorFullscreen ? '' : 'lg:grid-cols-3'} gap-4`}>
        {!editorFullscreen && compactSidebar ? (
          <div className="col-span-1 w-20 p-2 flex flex-col items-center gap-2">
            <button title="Expandir painel" onClick={() => setCompactSidebar(false)} className="p-2 rounded bg-gray-100 border"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
            <button title="Organizar" onClick={organizeRooms} className="p-2 rounded bg-violet-100 border"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/><rect x="14" y="3" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/></svg></button>
            <button title="Agrupar" onClick={groupSelectedRooms} className="p-2 rounded bg-sky-100 border"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="7" height="12" stroke="#0ea5a4" strokeWidth="1.2"/></svg></button>
            <button title="Desagrupar" onClick={ungroupSelectedRooms} className="p-2 rounded bg-gray-100 border"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7L17 17M17 7L7 17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
            <div className="mt-2 border-t pt-2 w-full flex flex-col items-center gap-2">
              <button title="Zoom+" onClick={zoomIn} className="p-2 rounded bg-gray-100 border">+</button>
              <button title="Zoom-" onClick={zoomOut} className="p-2 rounded bg-gray-100 border">−</button>
              <button title="Tela cheia editor" onClick={toggleFullscreenEditor} className="p-2 rounded bg-gray-100 border mt-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V3h6" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 15v6h-6" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
          </div>
        ) : null}
        {!editorFullscreen && !compactSidebar ? (
        <div className="col-span-1 space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold">Novo Ambiente</h2>
            <label className="block text-sm mt-2">Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded" />
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <label className="block text-sm">Largura (m)</label>
                <input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
              </div>
              <div className="flex-1">
                <label className="block text-sm">Comprimento (m)</label>
                <input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.countsAsAlvenaria} onChange={(e) => setForm({ ...form, countsAsAlvenaria: e.target.checked })} /> Conta como alvenaria</label>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={addAmbiente} className="bg-green-600 text-white px-3 py-1 rounded">Adicionar</button>
              <button onClick={() => setForm({ name: '', width: 3, length: 3, height: 2.7, isClosed: true, countsAsAlvenaria: true, hasForro: true })} className="bg-red-500 text-white px-3 py-1 rounded">Limpar</button>
              <button onClick={() => setCompactSidebar(true)} className="ml-2 px-2 py-1 border rounded text-sm">Reduzir painel</button>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold">Lista de Ambientes</h2>
            <ul className="space-y-2 mt-2">
              {placedRooms.map((a) => (
                <li key={a.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    {editingRoomId === a.id ? (
                      <div>
                        <input className="border p-1 mb-1 w-full" value={String(editForm.name || '')} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
                        <div className="flex gap-2">
                          <input type="number" step="0.1" className="border p-1 flex-1" value={Number(editForm.width || a.width)} onChange={(e)=>setEditForm({...editForm, width: parseFloat(e.target.value)})} />
                          <input type="number" step="0.1" className="border p-1 flex-1" value={Number(editForm.length || a.length)} onChange={(e)=>setEditForm({...editForm, length: parseFloat(e.target.value)})} />
                        </div>
                        <div className="text-xs text-gray-600">Altura: <input type="number" step="0.1" className="border p-1 w-24 inline" value={Number(editForm.height || a.height || 2.7)} onChange={(e)=>setEditForm({...editForm, height: parseFloat(e.target.value)})} /></div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium cursor-pointer text-sky-700" onClick={() => startEditRoom(a)}>{a.name}</div>
                        <div className="text-xs text-gray-600">{a.width}m × {a.length}m — area {(a.width*a.length).toFixed(2)} m²</div>
                        <div className="text-xs text-gray-600">pos: {a.x}m, {a.y}m</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingRoomId === a.id ? (
                      <>
                        <button onClick={() => saveEditRoom(a.id)} className="text-green-600">Salvar</button>
                        <button onClick={cancelEditRoom} className="text-gray-600">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditRoom(a)} className="text-blue-600">Editar</button>
                        <button onClick={() => copyRoom(a.id)} className="text-sky-600">Copiar</button>
                        <button onClick={() => removeAmbiente(a.id)} className="text-red-600">Remover</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold">Ajustes</h2>
            <label className="block text-sm">Fator parede</label>
            <input type="number" step="0.01" value={coefs.fator_parede} onChange={(e) => setCoefs({ ...coefs, fator_parede: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
            <label className="block text-sm mt-2">Fator inclinação telhado</label>
            <input type="number" step="0.01" value={coefs.fator_inclinacao} onChange={(e) => setCoefs({ ...coefs, fator_inclinacao: parseFloat(e.target.value) })} className="w-full p-2 border rounded" />
            <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={handleCalcular} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h18v4H3z" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 15h10" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 19h10" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Calcular materiais</span>
                </button>

                <button onClick={() => savePlanta({ ambientes: placedRoomsRef.current, paredes: placedWallsRef.current })} disabled={saving} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 22h14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{saving ? 'Salvando...' : 'Salvar planta'}</span>
                </button>

                <button onClick={loadPlanta} className="flex items-center justify-center gap-2 bg-slate-600 text-white px-3 py-2 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10l5-5 5 5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Carregar planta</span>
                </button>

                <button onClick={() => setShow3D(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l9 4.5v9L12 22 3 15.5v-9L12 2z" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Visualizar em 3D</span>
                </button>
            </div>
          </div>
        </div>
        ) : null}

        <div className={editorFullscreen ? 'col-span-1' : 'col-span-2'}>
          <div className="p-4 border rounded mb-4">
            <h2 className="font-semibold">Ferramentas</h2>
            <div className="flex gap-2 mt-2">
              <button title={wallMode==='placing' ? 'Cancelar criação de parede' : 'Adicionar parede'} aria-label="Adicionar parede" onClick={() => setWallMode(w => w === 'placing' ? 'idle' : 'placing')} className={`p-2 rounded ${wallMode==='placing'?'bg-yellow-500':'bg-gray-100'} hover:bg-gray-200 border`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              <button title="Adicionar porta" aria-label="Adicionar porta" onClick={() => {
                if (!selectedWallId) return alert('Selecione uma parede');
                const width = parseFloat(prompt('Largura da porta (m)', '0.8') || '0.8');
                const offset = parseFloat(prompt('Offset da parede (m) a partir do início', '0.2') || '0.2');
                addOpeningToWall(selectedWallId, { id: String(Date.now()), type: 'porta', width, height: 2.1, offset, bottom: 0 });
              }} className="p-2 rounded bg-green-100 hover:bg-green-200 border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="3" width="12" height="18" stroke="#065f46" strokeWidth="1.5" fill="none"/><circle cx="17" cy="12" r="1" fill="#065f46"/></svg>
              </button>

              <button title="Adicionar janela" aria-label="Adicionar janela" onClick={() => {
                if (!selectedWallId) return alert('Selecione uma parede');
                const width = parseFloat(prompt('Largura da janela (m)', '1.0') || '1.0');
                const offset = parseFloat(prompt('Offset da parede (m) a partir do início', '0.5') || '0.5');
                const wall = placedWalls.find((w:any)=>w.id === selectedWallId);
                if (!wall) return alert('Parede não encontrada');
                if (wall.type !== 'externa') return alert('Janela só pode ser adicionada em paredes externas');
                addOpeningToWall(selectedWallId, { id: String(Date.now()), type: 'janela', width, height: 1.2, offset, bottom: 1.0 });
              }} className="p-2 rounded bg-amber-100 hover:bg-amber-200 border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" stroke="#92400e" strokeWidth="1.2" fill="none"/><line x1="3" y1="12" x2="21" y2="12" stroke="#92400e" strokeWidth="1"/></svg>
              </button>

              <button title="Organizar cômodos" aria-label="Organizar cômodos" onClick={() => organizeRooms()} className="p-2 rounded bg-violet-100 hover:bg-violet-200 border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/><rect x="14" y="3" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/><rect x="3" y="14" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/><rect x="14" y="14" width="7" height="7" stroke="#5b21b6" strokeWidth="1.2"/></svg>
              </button>

              <button title="Agrupar cômodos" aria-label="Agrupar cômodos" onClick={() => groupSelectedRooms()} className="p-2 rounded bg-sky-100 hover:bg-sky-200 border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="7" height="12" stroke="#0ea5a4" strokeWidth="1.2"/><rect x="10" y="3" width="11" height="9" stroke="#0ea5a4" strokeWidth="1.2"/></svg>
              </button>

              <button title="Desagrupar" aria-label="Desagrupar" onClick={() => ungroupSelectedRooms()} className="p-2 rounded bg-gray-100 hover:bg-gray-200 border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 7L17 17M17 7L7 17" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
              <button title="Zoom +" aria-label="Zoom in" onClick={() => zoomIn()} className="p-2 rounded bg-gray-100 hover:bg-gray-200 border">+</button>
              <button title="Zoom -" aria-label="Zoom out" onClick={() => zoomOut()} className="p-2 rounded bg-gray-100 hover:bg-gray-200 border">−</button>
              <button title="Tela cheia editor" aria-label="Tela cheia" onClick={() => toggleFullscreenEditor()} className="p-2 rounded bg-gray-100 hover:bg-gray-200 border">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9V3h6" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 15v6h-6" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            {/* Opening editor when an opening is selected */}
            {selectedOpening && (() => {
              const wall = placedWalls.find(w => w.id === selectedOpening.wallId);
              const opening = wall ? (wall.openings || []).find((o:any) => (o.id || String(o.offset || '')) === selectedOpening.openingId) : null;
              if (!wall || !opening) return null;
              return (
                <div className="mt-3 p-2 border rounded bg-gray-50">
                  <div className="text-sm font-medium">Editar Abertura</div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="text-xs">Tipo</label>
                      <select value={opening.type} onChange={(e) => {
                        const val = e.target.value;
                        setPlacedWalls((s) => s.map(w => {
                          if (w.id !== wall.id) return w;
                          return { ...w, openings: (w.openings||[]).map((oo:any) => (oo.id || String(oo.offset||'')) === selectedOpening.openingId ? { ...oo, type: val } : oo) };
                        }));
                      }} className="w-full p-1 border rounded">
                        <option value="porta">porta</option>
                        <option value="janela">janela</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs">Largura (m)</label>
                      <input type="number" step="0.01" defaultValue={opening.width} onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setPlacedWalls((s) => s.map(w => {
                          if (w.id !== wall.id) return w;
                          return { ...w, openings: (w.openings||[]).map((oo:any) => (oo.id || String(oo.offset||'')) === selectedOpening.openingId ? { ...oo, width: Number(v.toFixed(3)) } : oo) };
                        }));
                      }} className="w-full p-1 border rounded" />
                    </div>
                    <div>
                      <label className="text-xs">Altura (m)</label>
                      <input type="number" step="0.01" defaultValue={opening.height || 0} onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setPlacedWalls((s) => s.map(w => {
                          if (w.id !== wall.id) return w;
                          return { ...w, openings: (w.openings||[]).map((oo:any) => (oo.id || String(oo.offset||'')) === selectedOpening.openingId ? { ...oo, height: Number(v.toFixed(3)) } : oo) };
                        }));
                      }} className="w-full p-1 border rounded" />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs">Offset (m)</label>
                      <input type="number" step="0.01" defaultValue={opening.offset || 0} onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setPlacedWalls((s) => s.map(w => {
                          if (w.id !== wall.id) return w;
                          return { ...w, openings: (w.openings||[]).map((oo:any) => (oo.id || String(oo.offset||'')) === selectedOpening.openingId ? { ...oo, offset: Number(v.toFixed(3)) } : oo) };
                        }));
                      }} className="w-full p-1 border rounded" />
                    </div>
                    <div>
                      <label className="text-xs">Peitoril / base (m)</label>
                      <input type="number" step="0.01" defaultValue={(opening as any).bottom || 0} onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setPlacedWalls((s) => s.map(w => {
                          if (w.id !== wall.id) return w;
                          return { ...w, openings: (w.openings||[]).map((oo:any) => (oo.id || String(oo.offset||'')) === selectedOpening.openingId ? { ...oo, bottom: Number(v.toFixed(3)) } : oo) };
                        }));
                      }} className="w-full p-1 border rounded" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={async () => {
                        // auto-save after editing opening
                        try {
                          await savePlanta({ ambientes: placedRoomsRef.current, paredes: placedWallsRef.current });
                          alert('Abertura atualizada e salva');
                        } catch (e:any) { console.error(e); alert('Erro ao salvar abertura: ' + (e?.message||e)); }
                      }} className="px-3 py-1 bg-emerald-600 text-white rounded">Salvar abertura</button>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="text-xs text-gray-600 mt-2">Clique no canvas para definir início e fim da parede quando em modo "Adicionar Parede".</div>
          </div>
          <div className="p-2 border rounded mb-4">
            <div className="text-sm text-gray-600">Editor (arraste retângulos; snap {gridStep} m)</div>
            <div className="overflow-auto mt-2">
              <svg ref={svgRef} width={800} height={600} className="bg-white border" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
                <rect x={0} y={0} width={800} height={600} fill="transparent" onClick={onSvgClickForWall} />
                {/* grid */}
                {Array.from({length: 40}).map((_,i)=> (
                  <line key={'v'+i} x1={toPixels(i*0.5)} y1={0} x2={toPixels(i*0.5)} y2={600} stroke="#f3f4f6" strokeWidth={1} />
                ))}
                {Array.from({length: 40}).map((_,i)=> (
                  <line key={'h'+i} x1={0} y1={toPixels(i*0.5)} x2={800} y2={toPixels(i*0.5)} stroke="#f3f4f6" strokeWidth={1} />
                ))}
                {/* rooms */}
                {placedRooms.map((r) => (
                  <g key={r.id}>
                    <rect x={toPixels(r.x)} y={toPixels(r.y)} width={toPixels(r.width)} height={toPixels(r.length)} fill="#bfdbfe" stroke={selectedRoomIds.includes(r.id) ? '#f97316' : '#0369a1'} strokeWidth={selectedRoomIds.includes(r.id) ? 3 : 2} rx={6}
                      onPointerDown={(e) => onPointerDown(e, r.id)} onClick={(e) => handleRoomClick(e, r)} onDoubleClick={(e) => onRoomDoubleClick(e, r.id)} style={{ cursor: 'pointer' }} />
                    <text x={toPixels(r.x)+6} y={toPixels(r.y)+16} fontSize={12} fill="#064e3b">{r.name}</text>
                    {/* medidas externas: largura, comprimento, área */}
                    <text x={toPixels(r.x) + toPixels(Math.max(0.1, r.width))/2} y={toPixels(r.y) - 8} fontSize={11} fill="#111827" textAnchor="middle">{r.width.toFixed(2)} m</text>
                    <text x={toPixels(r.x + r.width) + 8} y={toPixels(r.y) + toPixels(Math.max(0.1, r.length))/2} fontSize={11} fill="#111827">{r.length.toFixed(2)} m</text>
                    <text x={toPixels(r.x) + 6} y={toPixels(r.y) + toPixels(r.length) + 16} fontSize={11} fill="#374151">Área: {(r.width * r.length).toFixed(2)} m²</text>
                    {/* resize handles (corners) */}
                    {/* NW */}
                    <rect x={toPixels(r.x) - 6} y={toPixels(r.y) - 6} width={12} height={12} fill="#ffffff" stroke="#0ea5a4" strokeWidth={1}
                      style={{ cursor: 'nwse-resize' }} onPointerDown={(e) => onHandlePointerDown(e, r.id, 'nw')} />
                    {/* NE */}
                    <rect x={toPixels(r.x + r.width) - 6} y={toPixels(r.y) - 6} width={12} height={12} fill="#ffffff" stroke="#0ea5a4" strokeWidth={1}
                      style={{ cursor: 'nesw-resize' }} onPointerDown={(e) => onHandlePointerDown(e, r.id, 'ne')} />
                    {/* SE */}
                    <rect x={toPixels(r.x + r.width) - 6} y={toPixels(r.y + r.length) - 6} width={12} height={12} fill="#ffffff" stroke="#0ea5a4" strokeWidth={1}
                      style={{ cursor: 'nwse-resize' }} onPointerDown={(e) => onHandlePointerDown(e, r.id, 'se')} />
                    {/* SW */}
                    <rect x={toPixels(r.x) - 6} y={toPixels(r.y + r.length) - 6} width={12} height={12} fill="#ffffff" stroke="#0ea5a4" strokeWidth={1}
                      style={{ cursor: 'nesw-resize' }} onPointerDown={(e) => onHandlePointerDown(e, r.id, 'sw')} />
                  </g>
                ))}
                {/* walls */}
                {placedWalls.map((w) => (
                  <g key={w.id} onClick={() => setSelectedWallId(w.id)}>
                    <line x1={toPixels(w.x1)} y1={toPixels(w.y1)} x2={toPixels(w.x2)} y2={toPixels(w.y2)} stroke={selectedWallId===w.id ? '#06b6d4' : '#111827'} strokeWidth={selectedWallId===w.id ? Math.max(3, toPixels(w.thickness)+1) : Math.max(2, toPixels(w.thickness))} />
                    {/* openings */}
                    {(w.openings||[]).map((o:any, idx:number) => {
                      // compute opening center along wall
                      const dx = w.x2 - w.x1; const dy = w.y2 - w.y1; const len = Math.hypot(dx,dy);
                      const ux = dx/ len; const uy = dy/ len;
                      const ox = w.x1 + ((o.offset || 0) + (o.width||0)/2) * ux; const oy = w.y1 + ((o.offset || 0) + (o.width||0)/2) * uy;
                      const size = Math.max(8, Math.min(24, toPixels((o.width||0)))) ;
                      return (
                        <rect key={o.id || idx}
                          x={toPixels(ox) - size/2}
                          y={toPixels(oy) - size/2}
                          width={size}
                          height={size}
                          fill={o.type==='porta' ? '#ef4444' : '#f59e0b'}
                          onPointerDown={(e) => { e.stopPropagation(); setSelectedOpening({ wallId: w.id, openingId: o.id || String(idx) }); startOpeningDrag(e, w.id, o.id || String(idx)); }}
                          onClick={(e) => { e.stopPropagation(); setSelectedOpening({ wallId: w.id, openingId: o.id || String(idx) }); }}
                          onPointerMove={(e) => moveOpeningDrag(e)}
                          onPointerUp={(e) => endOpeningDrag(e)}
                          onPointerCancel={(e) => endOpeningDrag(e)}
                          style={{ cursor: 'grab', stroke: (selectedOpening && selectedOpening.wallId === w.id && selectedOpening.openingId === (o.id || String(idx))) ? '#064e3b' : 'none', strokeWidth: (selectedOpening && selectedOpening.wallId === w.id && selectedOpening.openingId === (o.id || String(idx))) ? 1.5 : 0 }}
                        />
                      );
                    })}
                  </g>
                ))}
                {/* external perimeter highlight */}
                <g>
                  <text x={10} y={580} fontSize={12} fill="#111827">Perímetro externo (aprox): {segsInfo.externalLen.toFixed(2)} m</text>
                </g>
                {measure.visible && (
                  <g>
                    <line x1={measure.x} y1={measure.y} x2={measure.x + 80} y2={measure.y} stroke="#111827" strokeWidth={1} strokeDasharray="4 2" />
                    <rect x={measure.x + 80} y={measure.y - 12} width={6} height={18} fill="#111827" />
                    <text x={measure.x + 4} y={measure.y - 6} fontSize={12} fill="#111827">{measure.text}</text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* 3D Viewer modal (read-only) */}
          {show3D && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded shadow-lg p-2 w-[90%] h-[90%] relative" style={{ zIndex: 100000 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShow3D(false); }}
                    onPointerDown={(e) => { e.stopPropagation(); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    style={{ zIndex: 100001, pointerEvents: 'auto' }}
                    className="absolute right-3 top-3 bg-red-500 text-white px-2 py-1 rounded"
                  >Fechar</button>
                  <div className="w-full h-full" style={{ position: 'relative', zIndex: 1 }}>
                    {/* lazy load Planta3D to keep bundle small */}
                    <React.Suspense fallback={<div>Carregando visual 3D...</div>}>
                      <Planta3D planta={{ ambientes: placedRooms.map((r:any)=>({ id: r.id, name: r.name, width: r.width, length: r.length, height: r.height, isClosed: r.isClosed, countsAsAlvenaria: r.countsAsAlvenaria, hasForro: r.hasForro })), paredes: placedWalls }} width={Math.round(window.innerWidth * 0.85)} height={Math.round(window.innerHeight * 0.85)} />
                    </React.Suspense>
                  </div>
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded">
              <h2 className="font-semibold">Métricas da planta</h2>
              <div className="mt-2">Área piso total: <strong>{metrics.area_piso_total} m²</strong></div>
              <div>Área piso (alvenaria): <strong>{metrics.area_piso_alvenaria} m²</strong></div>
              <div>Área paredes (calc): <strong>{metrics.area_parede_total} m²</strong></div>
              <div>Área forro: <strong>{metrics.area_forro} m²</strong></div>
              <div>Área telhado: <strong>{metrics.area_telhado} m²</strong></div>
              <div>Perímetro externo (aprox): <strong>{segsInfo.externalLen.toFixed(2)} m</strong></div>
              {metrics.warnings.length > 0 && (
                <div className="mt-2 text-sm text-yellow-700">
                  {metrics.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                </div>
              )}
            </div>

            <div className="p-4 border rounded">
              <h2 className="font-semibold">Materiales estimados</h2>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-600">
                      <th>Categoria</th>
                      <th>Material</th>
                      <th>Qtd</th>
                      <th>Un</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((r:any, i:number) => (
                      <tr key={i} className="border-t">
                        <td className="py-1">{r.categoria}</td>
                        <td>{r.material}</td>
                        <td>{r.quantidade}</td>
                        <td>{r.unidade}</td>
                        <td>{r.valor_total ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {materialRows.length === 0 && <div className="text-sm text-gray-500 mt-2">Nenhum cálculo feito ainda.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved plantas modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded shadow-lg p-4 w-[90%] max-w-2xl relative">
            <button onClick={() => setShowSavedModal(false)} className="absolute right-3 top-3 bg-red-500 text-white px-2 py-1 rounded">Fechar</button>
            <h3 className="text-lg font-semibold mb-2">Plantas salvas</h3>
            {loadingSaved ? (
              <div>Carregando...</div>
            ) : (
              <div className="space-y-2">
                {openStatus && <div className="text-sm text-gray-700">{openStatus}</div>}
                {savedPlantas.length === 0 && <div className="text-sm text-gray-500">Nenhuma planta salva para este projeto.</div>}
                <div className="mb-2">
                  <button onClick={async () => {
                    try {
                      setOpenStatus('Forçando save diagnóstico...');
                      await savePlanta({ ambientes: placedRooms, paredes: placedWalls });
                      await fetchSavedPlantas();
                      setOpenStatus('Save diagnóstico executado');
                      alert('Save diagnóstico executado — ver console para payload e resposta.');
                    } catch (e:any) {
                      console.error('Forçar save diagnóstico falhou', e);
                      alert('Falha no save diagnóstico: ' + (e?.message||e));
                    }
                  }} className="px-3 py-1 bg-yellow-500 text-white rounded">Forçar salvar diagnóstico</button>
                </div>
                {savedPlantas.map((p:any) => (
                  <div key={p.id} className="flex items-center justify-between border p-2 rounded">
                    <div>
                      <div className="font-medium">{p.title || 'Sem título'}</div>
                      <div className="text-xs text-gray-500">Salva em: {new Date(p.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openSavedPlanta(p.id)} disabled={loadingSaved} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50">Abrir</button>
                      <button onClick={() => deleteSavedPlanta(p.id)} disabled={loadingSaved} className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
