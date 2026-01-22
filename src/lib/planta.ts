import { Coefs as CalcCoefs } from './calculadora';

export type PlantaRoom = {
  id: string;
  name: string;
  width: number; // m
  length: number; // m
  height?: number; // m
  isClosed?: boolean; // closed/internal? default true
  countsAsAlvenaria?: boolean; // include in masonry
  hasForro?: boolean; // include in forro
};

export type Planta = {
  ambientes: PlantaRoom[];
  paredes?: Wall[];
  portas?: Opening[];
  janelas?: Opening[];
  moveis?: any[];
};

export type Wall = {
  id: string;
  x1: number; y1: number; x2: number; y2: number; // meters
  thickness?: number; // m
  height?: number; // m
  type?: 'interna' | 'externa' | 'geminada';
  ambiente_origem?: string | null;
  openings?: Opening[];
};

export type Opening = {
  id: string;
  type: 'porta' | 'janela';
  width: number; // m
  height?: number; // m
  offset: number; // meters from wall start
  /** distance from floor to bottom of opening (m) */
  bottom?: number;
};

export type PlantaMetrics = {
  area_piso_total: number;
  area_piso_alvenaria: number;
  area_parede_total: number;
  area_forro: number;
  area_telhado: number;
  perimetro_externo: number;
  warnings: string[];
};

const DEFAULT = {
  fator_parede: 3.0,
  fator_inclinacao: 1.2,
};

export function calculatePlantaMetrics(planta: Planta, coefs?: Partial<CalcCoefs>): PlantaMetrics {
  const cfg = { ...DEFAULT, ...(coefs || {}) } as any;

  let areaPisoTotal = 0;
  let areaPisoAlvenaria = 0;
  let areaForro = 0;
  const warnings: string[] = [];

  for (const a of planta.ambientes || []) {
    const piso = Number((a.width || 0) * (a.length || 0));
    areaPisoTotal += piso;
    if (a.countsAsAlvenaria === undefined ? true : !!a.countsAsAlvenaria) areaPisoAlvenaria += piso;
    if (a.hasForro === undefined ? true : !!a.hasForro) areaForro += piso;
    const perim = 2 * ((a.width || 0) + (a.length || 0));
    if (a.isClosed === false) perimetroExternal += perim;
  }

  // Build walls: prefer explicit `planta.paredes`, otherwise generate from ambientes
  const walls: Wall[] = (planta.paredes && planta.paredes.length > 0)
    ? planta.paredes
    : generateWallsFromRooms(planta.ambientes || []);

  // compute wall totals and openings area per wall (net area = length*height - openings)
  let wallExternalLen = 0;
  let netWallArea = 0;
  const openingsArea = { total: 0 };
  for (const w of walls) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    wallTotalLen += len;
    if (w.type === 'externa') wallExternalLen += len;
    const h = w.height || 2.7;
    let wallOpeningsArea = 0;
    if (w.openings) {
      for (const o of w.openings) {
        const oh = o.height || (o.type === 'porta' ? 2.1 : 1.2);
        const a = (o.width || 0) * oh;
        wallOpeningsArea += a;
        openingsArea.total += a;
      }
    }
    const wallArea = Math.max(0, len * h - wallOpeningsArea);
    netWallArea += wallArea;
  }

  const areaParede = Number(netWallArea.toFixed(3));
  const areaTelhado = Number((areaPisoTotal * cfg.fator_inclinacao).toFixed(2));

  // Basic validations
  if (areaPisoAlvenaria === 0 && (planta.ambientes || []).length > 0) {
    warnings.push('Nenhum ambiente marcado como `countsAsAlvenaria=true`. Verifique flags.');
  }
  if (areaParede > 0 && areaPisoTotal > 0) {
    const ratio = areaParede / areaPisoTotal;
    if (Math.abs(ratio - cfg.fator_parede) / cfg.fator_parede > 0.15) warnings.push('Área de parede real difere mais de 15% do valor estimado pelo fator (alerta).');
  }

  // Additional validations
  for (const w of walls) {
    if (w.openings) {
      for (const o of w.openings) {
        if (o.type === 'janela' && w.type !== 'externa') warnings.push('Janela adicionada em parede não externa.');
      }
    }
  }

  return {
    area_piso_total: Number(areaPisoTotal.toFixed(3)),
    area_piso_alvenaria: Number(areaPisoAlvenaria.toFixed(3)),
    area_parede_total: areaParede,
    area_forro: Number(areaForro.toFixed(3)),
    area_telhado: areaTelhado,
    perimetro_externo: Number(wallExternalLen.toFixed(3)),
    warnings,
  };
}

// Generate walls (segments) from closed rooms and merge overlapping segments
export function generateWallsFromRooms(rooms: PlantaRoom[]): Wall[] {
  type Seg = { x1:number,y1:number,x2:number,y2:number, roomId:string };
  const segs: Seg[] = [];
  for (const r of rooms) {
    if (r.isClosed === false) continue;
    // if UI provides position (x,y) in room object, use it; otherwise assume origin
    const x = (r as any).x || 0;
    const y = (r as any).y || 0;
    const w = r.width; const h = r.length;
    const corners = [ [x,y], [x+w,y], [x+w,y+h], [x,y+h] ];
    for (let i=0;i<4;i++){
      const a = corners[i]; const b = corners[(i+1)%4];
      segs.push({ x1: +a[0], y1: +a[1], x2: +b[0], y2: +b[1], roomId: r.id });
    }
  }
  // normalize keys for horizontal/vertical
  const map = new Map<string, { seg: Seg, count:number, roomIds:Set<string> }>();
  for (const s of segs) {
    const key = Math.abs(s.x1 - s.x2) < 1e-6
      ? `v:${s.x1.toFixed(3)}:${Math.min(s.y1,s.y2).toFixed(3)}-${Math.max(s.y1,s.y2).toFixed(3)}`
      : `h:${s.y1.toFixed(3)}:${Math.min(s.x1,s.x2).toFixed(3)}-${Math.max(s.x1,s.x2).toFixed(3)}`;
    const prev = map.get(key);
    if (prev) { prev.count += 1; prev.roomIds.add(s.roomId); }
    else map.set(key, { seg: s, count: 1, roomIds: new Set([s.roomId]) });
  }
  const walls: Wall[] = [];
  for (const [k, v] of map.entries()) {
    const s = v.seg;
    const type = v.count === 1 ? 'externa' : (v.count > 1 ? 'geminada' : 'interna');
    walls.push({ id: `w_${k}`, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, thickness: 0.10, height: 2.7, type: type as any, ambiente_origem: Array.from(v.roomIds)[0], openings: [] });
  }
  return walls;
}

export function calcularMateriaisFromPlanta(planta: Planta, precos?: Record<string, number>, coefs?: Partial<CalcCoefs>) {
  const cfg = { coef_tijolo: 50, reboco_lados: 2, pintura_rendimento: 10, ...coefs } as any;
  const metrics = calculatePlantaMetrics(planta, coefs);
  const wallArea = metrics.area_parede_total; // m2 (liquid)
  const externalPerimeter = metrics.perimetro_externo; // m
  const telhadoArea = metrics.area_telhado;

  const rows: any[] = [];

  // Tijolo
  const tijoloQty = Number((wallArea * (cfg.coef_tijolo || 50)).toFixed(2));
  rows.push({ categoria: 'Alvenaria', material: 'Tijolo', quantidade: tijoloQty, unidade: 'un', valor_total: precos?.tijolo ? Number((tijoloQty * precos.tijolo).toFixed(2)) : undefined });

  // Reboco (area * lados)
  const rebocoArea = Number((wallArea * (cfg.reboco_lados || 2)).toFixed(3));
  rows.push({ categoria: 'Acabamento', material: 'Reboco (m²)', quantidade: rebocoArea, unidade: 'm²', valor_total: precos?.reboco ? Number((rebocoArea * precos.reboco).toFixed(2)) : undefined });

  // Pintura (litros) = area_reboco / rendimento
  const pinturaLitros = Number((rebocoArea / (cfg.pintura_rendimento || 10)).toFixed(3));
  rows.push({ categoria: 'Acabamento', material: 'Pintura (L)', quantidade: pinturaLitros, unidade: 'L', valor_total: precos?.tinta ? Number((pinturaLitros * precos.tinta).toFixed(2)) : undefined });

  // Calhas / rufos / pingadeiras — linear by external perimeter
  const calhaQty = Number(externalPerimeter.toFixed(3));
  rows.push({ categoria: 'Telhado', material: 'Calha / Rufos (m)', quantidade: calhaQty, unidade: 'm', valor_total: precos?.calha ? Number((calhaQty * precos.calha).toFixed(2)) : undefined });

  // Telhado: basic area output
  rows.push({ categoria: 'Telhado', material: 'Área telhado (m²)', quantidade: Number(telhadoArea.toFixed(2)), unidade: 'm²', valor_total: precos?.telha ? Number((telhadoArea * precos.telha).toFixed(2)) : undefined });

  return { metrics, rows };
}
