import { calcularEstimativa, Coefs as CalcCoefs } from './calculadora';

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
  openings?: Opening[];
};

export type Opening = {
  id: string;
  type: 'porta' | 'janela';
  width: number; // m
  height?: number; // m
  offset: number; // meters from wall start
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
  let perimetroExternal = 0;
  const warnings: string[] = [];

  for (const a of planta.ambientes || []) {
    const piso = Number((a.width || 0) * (a.length || 0));
    areaPisoTotal += piso;
    if (a.countsAsAlvenaria === undefined ? true : !!a.countsAsAlvenaria) areaPisoAlvenaria += piso;
    if (a.hasForro === undefined ? true : !!a.hasForro) areaForro += piso;
    const perim = 2 * ((a.width || 0) + (a.length || 0));
    if (a.isClosed === false) perimetroExternal += perim;
  }

  // If explicit walls are provided, compute wall length and openings
  let wallTotalLen = 0;
  let wallExternalLen = 0;
  let openingsArea = 0;
  if (planta.paredes && planta.paredes.length > 0) {
    for (const w of planta.paredes) {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      wallTotalLen += len;
      if (w.type === 'externa') wallExternalLen += len;
      const h = w.height || 2.7;
      if (w.openings) {
        for (const o of w.openings) {
          const oh = o.height || (o.type === 'porta' ? 2.1 : 1.2);
          openingsArea += o.width * oh;
        }
      }
    }
  }

  const areaParede = planta.paredes && planta.paredes.length > 0
    ? Number((Math.max(0, wallTotalLen * (planta.paredes[0].height || 2.7) - openingsArea)).toFixed(3))
    : Number((areaPisoAlvenaria * cfg.fator_parede).toFixed(3));
  const areaTelhado = Number((areaPisoTotal * cfg.fator_inclinacao).toFixed(2));

  // Basic validations
  if (areaPisoAlvenaria === 0 && (planta.ambientes || []).length > 0) {
    warnings.push('Nenhum ambiente marcado como `countsAsAlvenaria=true`. Verifique flags.');
  }
  if (areaParede > 0 && areaPisoTotal > 0) {
    const ratio = areaParede / areaPisoTotal;
    if (ratio < 2.5 || ratio > 3.5) warnings.push('Área de parede fora da faixa esperada (verifique fator_parede e flags).');
  }

  return {
    area_piso_total: Number(areaPisoTotal.toFixed(3)),
    area_piso_alvenaria: Number(areaPisoAlvenaria.toFixed(3)),
    area_parede_total: areaParede,
    area_forro: Number(areaForro.toFixed(3)),
    area_telhado: areaTelhado,
    perimetro_externo: planta.paredes && planta.paredes.length > 0 ? Number(wallExternalLen.toFixed(3)) : Number(perimetroExternal.toFixed(3)),
    warnings,
  };
}

export function calcularMateriaisFromPlanta(planta: Planta, precos?: Record<string, number>, coefs?: Partial<CalcCoefs>) {
  // The existing calcularEstimativa expects rooms with flags; map PlantaRoom -> Room shape
  const rooms = (planta.ambientes || []).map((a) => ({
    name: a.name,
    width: a.width,
    length: a.length,
    height: a.height,
    isClosed: a.isClosed,
    countsAsAlvenaria: a.countsAsAlvenaria,
    hasForro: a.hasForro,
  } as any));

  // Pass rooms and also override coefs (fator_parede is used in planta metrics; calculadora uses fator_parede too)
  const input: any = { rooms, telhadoInclinationFactor: coefs?.fator_inclinacao };
  // @ts-ignore
  return calcularEstimativa(input, precos, coefs as any);
}
