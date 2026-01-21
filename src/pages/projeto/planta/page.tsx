import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calculatePlantaMetrics, calcularMateriaisFromPlanta, Planta, PlantaRoom } from '../../../lib/planta';
import { supabase } from '../../../lib/supabase';

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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pixelsPerMeter = 50; // scale for the editor
  const gridStep = 0.5; // meters for snapping

  useEffect(() => {
    // initialize placedRooms from ambientes if empty
    if (ambientes.length && placedRooms.length === 0) {
      const seeded = ambientes.map((a, i) => ({ ...a, x: 1 + i *  (a.width + 0.5), y: 1 + i *  (a.length + 0.5) }));
      setPlacedRooms(seeded);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientes]);

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

  // pointer drag state
  const dragState = useRef<{ id?: string; offsetX?: number; offsetY?: number } | null>(null);

  function toPixels(m: number) {
    return Math.round(m * pixelsPerMeter);
  }
  function toMeters(px: number) {
    return +(px / pixelsPerMeter).toFixed(3);
  }

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
    dragState.current = { id: roomId, offsetX: loc.x - toPixels(room.x), offsetY: loc.y - toPixels(room.y) };
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
    setPlacedRooms((s) => s.map((r) => r.id === id ? { ...r, x: nx, y: ny } : r));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragState.current) return;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
    dragState.current = null;
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
    for (const [k,v] of map.entries()) if (v.count === 1) externalLen += v.len;
    return { totalWallLen: segs.reduce((s,x)=>s+x.len,0), externalLen };
  }

  const planta: Planta = { ambientes: placedRooms.map((r) => ({ id: r.id, name: r.name, width: r.width, length: r.length, height: r.height, isClosed: r.isClosed, countsAsAlvenaria: r.countsAsAlvenaria, hasForro: r.hasForro })) };
  const metrics = calculatePlantaMetrics(planta, coefs);
  const segsInfo = computeWallSegments(placedRooms);

  const [saving, setSaving] = useState(false);
  const [loadedPlantaId, setLoadedPlantaId] = useState<string | null>(null);

  async function savePlanta() {
    if (!params.id) return alert('Projeto não identificado');
    setSaving(true);
    try {
      const payload = { ambientes: placedRooms };
      const { data: existing } = await supabase.from('plantas').select('id').eq('projeto_id', params.id).limit(1).single().catch(() => ({ data: null }));
      if (existing && existing.id) {
        const { error } = await supabase.from('plantas').update({ data: payload, updated_at: new Date().toISOString() }).eq('id', existing.id);
        if (error) throw error;
        setLoadedPlantaId(existing.id);
      } else {
        const { data, error } = await supabase.from('plantas').insert([{ projeto_id: params.id, title: `Planta ${new Date().toISOString()}`, data: payload }]).select().single();
        if (error) throw error;
        setLoadedPlantaId(data.id);
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
      const { data, error } = await supabase.from('plantas').select('id,data').eq('projeto_id', params.id).order('created_at', { ascending: false }).limit(1).single();
      if (error) throw error;
      if (!data || !data.data) return alert('Nenhuma planta encontrada para este projeto');
      const doc = data.data as any;
      // load ambientes with positions
      setPlacedRooms(doc.ambientes || []);
      setAmbientes((doc.ambientes || []).map((a:any) => ({ id: a.id, name: a.name, width: a.width, length: a.length, height: a.height, isClosed: a.isClosed, countsAsAlvenaria: a.countsAsAlvenaria, hasForro: a.hasForro })));
      setLoadedPlantaId(data.id);
      alert('Planta carregada');
    } catch (err:any) {
      console.error(err);
      alert('Erro ao carregar planta: ' + (err.message || err));
    }
  }

  function handleCalcular() {
    const res = calcularMateriaisFromPlanta(planta, precos, coefs as any);
    setMaterialRows(res.rows || []);
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-sky-600">Planta Baixa — Projeto</h1>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
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
            </div>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold">Lista de Ambientes</h2>
            <ul className="space-y-2 mt-2">
              {placedRooms.map((a) => (
                <li key={a.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-600">{a.width}m × {a.length}m — area {(a.width*a.length).toFixed(2)} m²</div>
                    <div className="text-xs text-gray-600">pos: {a.x}m, {a.y}m</div>
                  </div>
                  <div>
                    <button onClick={() => removeAmbiente(a.id)} className="text-red-600">Remover</button>
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
            <div className="mt-2">
                <button onClick={handleCalcular} className="bg-blue-600 text-white px-3 py-1 rounded">Calcular materiais</button>
                <button onClick={savePlanta} disabled={saving} className="ml-2 bg-emerald-600 text-white px-3 py-1 rounded">{saving ? 'Salvando...' : 'Salvar planta'}</button>
                <button onClick={loadPlanta} className="ml-2 bg-slate-600 text-white px-3 py-1 rounded">Carregar planta</button>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="p-2 border rounded mb-4">
            <div className="text-sm text-gray-600">Editor (arraste retângulos; snap {gridStep} m)</div>
            <div className="overflow-auto mt-2">
              <svg ref={svgRef} width={800} height={600} className="bg-white border" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
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
                    <rect x={toPixels(r.x)} y={toPixels(r.y)} width={toPixels(r.width)} height={toPixels(r.length)} fill="#bfdbfe" stroke="#0369a1" strokeWidth={2} rx={6}
                      onPointerDown={(e) => onPointerDown(e, r.id)} />
                    <text x={toPixels(r.x)+6} y={toPixels(r.y)+16} fontSize={12} fill="#064e3b">{r.name}</text>
                  </g>
                ))}
                {/* external perimeter highlight */}
                <g>
                  <text x={10} y={580} fontSize={12} fill="#111827">Perímetro externo (aprox): {segsInfo.externalLen.toFixed(2)} m</text>
                </g>
              </svg>
            </div>
          </div>

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
    </div>
  );
}
