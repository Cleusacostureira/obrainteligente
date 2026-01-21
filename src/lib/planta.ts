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
  paredes?: any[]; // placeholder for future wall objects
  portas?: any[];
  janelas?: any[];
  moveis?: any[];
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

  const areaParede = Number((areaPisoAlvenaria * cfg.fator_parede).toFixed(3));
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
    perimetro_externo: Number(perimetroExternal.toFixed(3)),
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
