import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { Planta, Wall, Opening, PlantaRoom } from '../lib/planta';
import type { GalleryItem, PlacedObject } from './ThreeGallery/types';

type Props = { planta: Planta; width?: number; height?: number; selectedGalleryItem?: GalleryItem | null; onPlaceObject?: (p: PlacedObject) => void };

function WallMesh({ w }: { w: Wall }) {
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
  const midX = (w.x1 + w.x2) / 2;
  const midY = (w.y1 + w.y2) / 2;
  const height = w.height || 2.7;
  const thickness = w.thickness || 0.1;

  const geom = useMemo(() => {
    // Simplified: don't perform CSG here to avoid requiring three-csg-ts at build time.
    // We render the wall as a solid box and draw openings separately with `OpeningHole`.
    const safeLen = Number.isFinite(len) && len > 0 ? Math.max(0.001, len) : 0.001;
    const safeHeight = Number.isFinite(height) && height > 0 ? Math.max(0.01, height) : 0.01;
    const safeTh = Number.isFinite(thickness) && thickness > 0 ? Math.max(0.01, thickness) : 0.01;
    try {
      const baseGeom = new THREE.BoxGeometry(safeLen, safeHeight, safeTh);
      return baseGeom;
    } catch (err) {
      console.warn('WallMesh geometry creation failed, using fallback box', err);
      return new THREE.BoxGeometry(0.1, 0.1, 0.1);
    }
  }, [w.id, JSON.stringify(w.openings || []), len, height, thickness, w.type]);

  return (
    <mesh geometry={geom} position={[midX, height / 2, -midY]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={w.type === 'externa' ? '#e5e7eb' : '#f3f4f6'} metalness={0.1} roughness={0.9} />
    </mesh>
  );
}

function OpeningHole({ w, o }: { w: Wall; o: Opening }) {
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
  const ux = (w.x2 - w.x1) / len; const uy = (w.y2 - w.y1) / len;
  const cx = Number.isFinite(ux) ? (w.x1 + (Number(o.offset) + (Number(o.width) / 2)) * ux) : (w.x1 + (w.x2)) / 2;
  const cy = Number.isFinite(uy) ? (w.y1 + (Number(o.offset) + (Number(o.width) / 2)) * uy) : (w.y1 + (w.y2)) / 2;
  const oHeight = Number.isFinite(Number(o.height)) ? Number(o.height) : (o.type === 'porta' ? 2.1 : 1.2);
  const oBottom = Number.isFinite(Number((o as any).bottom)) ? Number((o as any).bottom) : 0; // meters from floor to bottom of opening
  const thickness = Number.isFinite(Number(w.thickness)) ? Number(w.thickness) : 0.1;
  const safeWidth = Number.isFinite(Number(o.width)) && Number(o.width) > 0 ? Math.max(0.01, Number(o.width)) : 0.01;
  return (
    <mesh position={[cx, oBottom + oHeight / 2, -cy]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[safeWidth, oHeight, thickness + 0.01]} />
      <meshStandardMaterial color={o.type === 'porta' ? '#b91c1c' : '#d97706'} opacity={0.6} transparent />
    </mesh>
  );
}

function Floor({ rooms }: { rooms: PlantaRoom[] }) {
  return (
    <group>
      {rooms.map((r) => (
        <mesh key={r.id} position={[r.x + r.width / 2, 0.001, -(r.y + r.length / 2)]} receiveShadow>
          <boxGeometry args={[r.width, 0.02, r.length]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
}

export default function Planta3DInner({ planta, width = 800, height = 600, selectedGalleryItem = null, onPlaceObject }: Props) {
  // sanitize planta input so three.js never receives NaN/undefined
  const { walls, rooms } = useMemo(() => {
    const rawRooms: PlantaRoom[] = Array.isArray(planta?.ambientes) ? planta.ambientes : [];
    const rawWalls: Wall[] = Array.isArray(planta?.paredes) ? planta.paredes : [];
    const saneRooms = rawRooms.map(r => ({
      id: String(r.id),
      name: r.name || 'R',
      x: Number.isFinite(Number(r.x)) ? Number(r.x) : 0,
      y: Number.isFinite(Number(r.y)) ? Number(r.y) : 0,
      width: Number.isFinite(Number(r.width)) ? Number(r.width) : 0,
      length: Number.isFinite(Number(r.length)) ? Number(r.length) : 0,
      height: Number.isFinite(Number(r.height)) ? Number(r.height) : 2.7,
      isClosed: !!r.isClosed,
      countsAsAlvenaria: !!r.countsAsAlvenaria,
      hasForro: !!r.hasForro,
    } as PlantaRoom));
    const saneWalls = rawWalls.map(w => ({
      id: String(w.id),
      x1: Number.isFinite(Number(w.x1)) ? Number(w.x1) : 0,
      y1: Number.isFinite(Number(w.y1)) ? Number(w.y1) : 0,
      x2: Number.isFinite(Number(w.x2)) ? Number(w.x2) : 0,
      y2: Number.isFinite(Number(w.y2)) ? Number(w.y2) : 0,
      thickness: Number.isFinite(Number(w.thickness)) ? Number(w.thickness) : 0.1,
      height: Number.isFinite(Number(w.height)) ? Number(w.height) : 2.7,
      type: w.type || 'interna',
      ambiente_origem: w.ambiente_origem || null,
      openings: Array.isArray(w.openings) ? w.openings.map(o => ({ id: o.id || String(Math.random()), type: o.type || 'porta', width: Number.isFinite(Number(o.width)) ? Number(o.width) : 0, height: Number.isFinite(Number(o.height)) ? Number(o.height) : (o.type === 'porta' ? 2.1 : 1.2), offset: Number.isFinite(Number(o.offset)) ? Number(o.offset) : 0, bottom: Number.isFinite(Number((o as any).bottom)) ? Number((o as any).bottom) : 0 })) : [],
    } as Wall));
    // filter out degenerate walls/rooms that would produce invalid geometry
    const filteredWalls = saneWalls.filter(w => Number.isFinite(w.x1) && Number.isFinite(w.y1) && Number.isFinite(w.x2) && Number.isFinite(w.y2) && !(isNaN(w.x1) || isNaN(w.y1) || isNaN(w.x2) || isNaN(w.y2)) && (Math.hypot(w.x2 - w.x1, w.y2 - w.y1) > 1e-6));
    const filteredRooms = saneRooms.filter(r => Number.isFinite(r.width) && Number.isFinite(r.length) && r.width > 0 && r.length > 0);
    return { walls: filteredWalls, rooms: filteredRooms };
  }, [planta]);

  const bounds = useMemo(() => {
    const xs: number[] = []; const ys: number[] = [];
    rooms.forEach(r => { xs.push(Number(r.x)); xs.push(Number(r.x) + Number(r.width)); ys.push(Number(r.y)); ys.push(Number(r.y) + Number(r.length)); });
    if (xs.length === 0) return { cx: 0, cy: 0, size: 10 };
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2; const size = Math.max(maxX - minX, maxY - minY) + 2;
    return { cx, cy, size };
  }, [rooms]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas style={{ width: '100%', height: '100%' }} shadows camera={{ position: [bounds.cx + bounds.size, bounds.size * 0.8, -(bounds.cy + bounds.size)], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <Suspense fallback={<Html>Carregando 3D...</Html>}>
          <group position={[-0.01, 0, 0]}> 
            <Floor rooms={rooms} />
            {walls.map((w) => (
              <group key={w.id} onClick={(e) => {
                // allow placing only when an item is selected in the gallery
                try {
                  if (!selectedGalleryItem) return;
                  e.stopPropagation();
                  // e.point is the clicked point in world coords
                  const pt: any = (e as any).point || { x: 0, y: 0, z: 0 };
                  const worldX = Number(pt.x || 0);
                  const worldY = Number(pt.y || 0);
                  const worldZ = Number(pt.z || 0);
                  // convert world coords to 2D planta coords: note we render with z = -y
                  const px = worldX; const py = -worldZ;
                  const dx = w.x2 - w.x1; const dy = w.y2 - w.y1; const len = Math.hypot(dx, dy);
                  const ux = dx / (len || 1); const uy = dy / (len || 1);
                  // projection of point onto wall start
                  const rel = ( (px - w.x1) * ux + (py - w.y1) * uy );
                  const offset = Math.max(0, rel - (selectedGalleryItem.width || 0) / 2);
                  const placed: PlacedObject = {
                    id: `obj_${Date.now()}`,
                    tipo: selectedGalleryItem.category === 'portas' ? 'porta' : (selectedGalleryItem.category === 'janelas' ? 'janela' : 'movel'),
                    modelo: selectedGalleryItem.id,
                    paredeId: w.id,
                    ambienteId: null,
                    largura: selectedGalleryItem.width,
                    altura: selectedGalleryItem.height,
                    posicao: { x: px, y: py, offset }
                  };
                  if (typeof onPlaceObject === 'function') onPlaceObject(placed);
                } catch (err) {
                  console.warn('place object failed', err);
                }
              }}>
                <WallMesh w={w} />
                {(w.openings || []).map((o) => <OpeningHole key={o.id} w={w} o={o} />)}
              </group>
            ))}
            {rooms.map((r, i) => (
              <mesh key={`sofa-${i}`} position={[r.x + 0.5, 0.3, -(r.y + 0.5)]}>
                <boxGeometry args={[0.8, 0.6, 0.6]} />
                <meshStandardMaterial color="#9ca3af" />
              </mesh>
            ))}
          </group>
        </Suspense>
        {/* Grid and axes helper to make the scene visible even when empty */}
        <gridHelper args={[Math.max(bounds.size, 10), Math.max(10, Math.ceil(bounds.size))]} position={[bounds.cx, 0, -bounds.cy]} />
        <axesHelper args={[Math.min(Math.max(bounds.size / 4, 1), 10)]} position={[bounds.cx, 0, -bounds.cy]} />
        <OrbitControls enablePan enableZoom enableRotate />
        <Stats />
      </Canvas>
    </div>
  );
}
