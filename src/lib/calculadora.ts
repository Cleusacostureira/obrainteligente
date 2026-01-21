export type Room = {
  name: string;
  width: number; // m
  length: number; // m
  height?: number; // m (default 2.7)
  // flags for geometry and material inclusion
  isClosed?: boolean; // closed against outside (default: true)
  countsAsAlvenaria?: boolean; // include in masonry/walls (default: true)
  hasForro?: boolean; // include in ceiling/forro calculation (default: true)
};

export type CalculadoraInput = {
  rooms?: Room[];
  telhadoTipo?: 'Cerâmico' | 'Fibrocimento' | 'Isotérmico' | 'Madeira aparente' | 'Nenhum';
  telhadoInclinationFactor?: number; // multiplier for roof area
};

export type MaterialRow = {
  categoria: string;
  material: string;
  quantidade: number;
  unidade: string;
  valor_unitario?: number;
  valor_total?: number;
};

export type Coefs = {
  tijolo_un_m2: number; // units per m2 parede
  cimento_assent_sac_m2: number; // sacos per m2 parede (assentamento)
  cimento_reboco_sac_m2: number; // sacos per m2 de reboco (por m2 parede, por lado)
  cimento_estrutura_sac_m2: number; // sacos per m2 piso
  areia_assent_m3_m2: number;
  areia_reboco_m3_m2: number; // per m2 parede (then *2 for two sides)
  brita_m3_m2_piso: number;
  pintura_m2_por_litro: number;
  telhas_un_por_m2: number;
  reboco_lados?: number;
  // new geometric/behaviour coefficients
  fator_parede?: number; // multiplier area parede = piso_alvenaria * fator_parede
  reboco_lados_internal?: number; // default 2
  reboco_lados_external?: number; // default 1
  fator_inclinacao?: number; // roof inclination multiplier (default 1.2)
};

const DEFAULT_COEFS: Coefs = {
  tijolo_un_m2: 27,
  cimento_assent_sac_m2: 1 / 5,
  cimento_reboco_sac_m2: 0.2,
  cimento_estrutura_sac_m2: 1,
  areia_assent_m3_m2: 0.02,
  areia_reboco_m3_m2: 0.03,
  brita_m3_m2_piso: 0.03,
  pintura_m2_por_litro: 2.5,
  telhas_un_por_m2: 10,
  reboco_lados: 2,
  fator_parede: 3.0,
  reboco_lados_internal: 2,
  reboco_lados_external: 1,
  fator_inclinacao: 1.2,
};

// Default densities for conversions (approximate)
const DEFAULT_DENSITIES = {
  areia_t_per_m3: 1.6, // tons per m3 (typical dry sand)
};

export function calcularEstimativa(
  input: CalculadoraInput,
  precosOverride?: Record<string, number>,
  coefsOverride?: Partial<Coefs>
): { rows: MaterialRow[]; resumo: { piso_m2: number; paredes_m2: number; perimetro_m: number; area_telhado_m2: number; custo_total: number } } {
  const rooms = input.rooms || [];
  const coefs: Coefs = { ...DEFAULT_COEFS, ...(coefsOverride || {}) };

  // default prices
  const defaultPrecos: Record<string, number> = {
    tijolo: 0.8,
    cimento: 40,
    areia_m3: 180,
    brita_m3: 220,
    argamassa_saco: 30,
    rejunte_kg: 10,
    tinta_litro: 60,
    telha_un: 2.5,
  };
  const precos = { ...defaultPrecos, ...(precosOverride || {}) };

  // Aggregate areas/perimeters with flags
  let totalPisoAll = 0; // all rooms
  let totalPisoAlvenaria = 0; // area that counts as alvenaria
  let totalPerimeterAll = 0;
  let perimeterExternal = 0; // approximation: sum perimeters of rooms marked external (isClosed === false)
  let areaForro = 0; // sum of floor areas where hasForro === true

  for (const r of rooms) {
    const h = r.height && r.height > 0 ? r.height : 2.7;
    const perim = 2 * (r.width + r.length);
    const piso = r.width * r.length;
    totalPerimeterAll += perim;
    totalPisoAll += piso;
    const countsAlv = r.countsAsAlvenaria === undefined ? true : !!r.countsAsAlvenaria;
    const closed = r.isClosed === undefined ? true : !!r.isClosed;
    const forro = r.hasForro === undefined ? true : !!r.hasForro;
    if (countsAlv) totalPisoAlvenaria += piso;
    if (!closed) perimeterExternal += perim; // treat open rooms as contributing to external perimeter
    if (forro) areaForro += piso;
  }

  const fator_parede = coefs.fator_parede || 3.0;
  // area of walls (m2) derived from total floor area of rooms that count as alvenaria
  const areaParede = +(totalPisoAlvenaria * fator_parede).toFixed(3);

  // determine average number of reboco sides using proportion of external floor area
  const areaPisoExternal = rooms.reduce((s, r) => {
    const countsAlv = r.countsAsAlvenaria === undefined ? true : !!r.countsAsAlvenaria;
    const closed = r.isClosed === undefined ? true : !!r.isClosed;
    const piso = r.width * r.length;
    // consider external if not closed and counting as alvenaria
    return s + (!(closed) && countsAlv ? piso : 0);
  }, 0);

  const propExternal = totalPisoAlvenaria > 0 ? Math.min(1, Math.max(0, areaPisoExternal / totalPisoAlvenaria)) : 0;
  const internalSides = coefs.reboco_lados_internal || 2;
  const externalSides = coefs.reboco_lados_external || 1;
  const avgLados = +(propExternal * externalSides + (1 - propExternal) * internalSides).toFixed(3);

  const fator_inclinacao = input.telhadoInclinationFactor || coefs.fator_inclinacao || 1.2;
  const areaTelhado = +(totalPisoAll * fator_inclinacao).toFixed(2);

  const rows: MaterialRow[] = [];

  // Alvenaria-derived metrics should only use the area that counts as alvenaria
  const totalTijolos = Math.ceil(areaParede * coefs.tijolo_un_m2);
  rows.push({ categoria: 'Alvenaria', material: 'Tijolo cerâmico 8 furos', quantidade: totalTijolos, unidade: 'un', valor_unitario: precos.tijolo, valor_total: +(totalTijolos * precos.tijolo).toFixed(2) });

  // Cimento: assentamento (uses areaParede)
  const sacos_assent = Math.ceil(areaParede * coefs.cimento_assent_sac_m2);
  rows.push({ categoria: 'Alvenaria', material: 'Cimento - assentamento (sac)', quantidade: sacos_assent, unidade: 'sac', valor_unitario: precos.cimento, valor_total: +(sacos_assent * precos.cimento).toFixed(2) });

  // Reboco uses areaParede multiplied by average number of sides
  const areaReboco = +(areaParede * avgLados).toFixed(3); // m2 considering sides
  const sacos_reboco = Math.ceil(areaReboco * coefs.cimento_reboco_sac_m2);
  rows.push({ categoria: 'Acabamento', material: 'Cimento - reboco (sac)', quantidade: sacos_reboco, unidade: 'sac', valor_unitario: precos.cimento, valor_total: +(sacos_reboco * precos.cimento).toFixed(2) });

  // Cimento de estrutura uses total floor area (all rooms)
  const sacos_estrutura = Math.ceil(totalPisoAll * coefs.cimento_estrutura_sac_m2);
  rows.push({ categoria: 'Estrutura', material: 'Cimento - estrutura (sac)', quantidade: sacos_estrutura, unidade: 'sac', valor_unitario: precos.cimento, valor_total: +(sacos_estrutura * precos.cimento).toFixed(2) });

  // Areia
  const areia_assent_m3 = +(areaParede * coefs.areia_assent_m3_m2).toFixed(3);
  rows.push({ categoria: 'Alvenaria', material: 'Areia - assentamento (m³)', quantidade: areia_assent_m3, unidade: 'm³', valor_unitario: precos.areia_m3, valor_total: +(areia_assent_m3 * precos.areia_m3).toFixed(2) });

  const areia_reboco_m3 = +(areaParede * coefs.areia_reboco_m3_m2 * avgLados).toFixed(3); // lados considered
  rows.push({ categoria: 'Acabamento', material: 'Areia - reboco (m³)', quantidade: areia_reboco_m3, unidade: 'm³', valor_unitario: precos.areia_m3, valor_total: +(areia_reboco_m3 * precos.areia_m3).toFixed(2) });

  // Convert areia to toneladas (approx)
  const areia_assent_t = +(areia_assent_m3 * DEFAULT_DENSITIES.areia_t_per_m3).toFixed(3);
  const areia_reboco_t = +(areia_reboco_m3 * DEFAULT_DENSITIES.areia_t_per_m3).toFixed(3);
  rows.push({ categoria: 'Alvenaria', material: 'Areia - assentamento (t)', quantidade: areia_assent_t, unidade: 't' });
  rows.push({ categoria: 'Acabamento', material: 'Areia - reboco (t)', quantidade: areia_reboco_t, unidade: 't' });

  // Brita (estrutura)
  const brita_m3 = +(totalPisoAll * coefs.brita_m3_m2_piso).toFixed(3);
  rows.push({ categoria: 'Estrutura', material: 'Brita (m³)', quantidade: brita_m3, unidade: 'm³', valor_unitario: precos.brita_m3, valor_total: +(brita_m3 * precos.brita_m3).toFixed(2) });

  // Reboco (area already computed) and pintura
  rows.push({ categoria: 'Acabamento', material: 'Área de reboco (m²)', quantidade: +areaReboco.toFixed(2) as any, unidade: 'm²' });

  const litros_tinta = Math.ceil((areaReboco / coefs.pintura_m2_por_litro) * 2); // 2 demãos
  rows.push({ categoria: 'Acabamento', material: 'Tinta (litro)', quantidade: litros_tinta, unidade: 'L', valor_unitario: precos.tinta_litro, valor_total: +(litros_tinta * precos.tinta_litro).toFixed(2) });

  // Argamassa de piso (1 saco / 4 m2 de piso)
  const argamassa_sacos = Math.ceil(totalPisoAll / 4);
  rows.push({ categoria: 'Acabamento', material: 'Argamassa - piso (sac)', quantidade: argamassa_sacos, unidade: 'sac', valor_unitario: precos.argamassa_saco, valor_total: +(argamassa_sacos * precos.argamassa_saco).toFixed(2) });

  // Forro — use only rooms explicitly flagged with hasForro
  rows.push({ categoria: 'Forro', material: 'Área de forro (m²)', quantidade: +areaForro.toFixed(2) as any, unidade: 'm²' });

  // Telhado
  if (input.telhadoTipo && input.telhadoTipo !== 'Nenhum') {
    const telhas = Math.ceil(areaTelhado * coefs.telhas_un_por_m2);
    rows.push({ categoria: 'Telhado', material: 'Área telhado (m²)', quantidade: areaTelhado as any, unidade: 'm²' });
    rows.push({ categoria: 'Telhado', material: 'Telha (un)', quantidade: telhas, unidade: 'un', valor_unitario: precos.telha_un, valor_total: +(telhas * precos.telha_un).toFixed(2) });
    // Calhas/Rufos should use external perimeter approximation
    rows.push({ categoria: 'Telhado', material: 'Calhas/Rufos/Pingadeiras (m)', quantidade: +perimeterExternal.toFixed(2) as any, unidade: 'm' });
  }

  // Hidráulica & Elétrica - simple estimativa based on rooms
  const pontos_hidraulicos = rooms.reduce((s, r) => s + (Math.round((r.width * r.length) / 10) > 0 ? 1 : 0), 0) + Math.max(0, rooms.length > 0 ? 1 : 0);
  const tubo_m = Math.ceil(pontos_hidraulicos * 7);
  rows.push({ categoria: 'Hidráulica', material: 'Tubo (m)', quantidade: tubo_m, unidade: 'm', valor_unitario: 5, valor_total: +(tubo_m * 5).toFixed(2) });

  const pontos_eletricos = Math.max(1, Math.ceil(totalPisoAll / 5));
  const tomadas = Math.ceil(totalPisoAll / 3);
  rows.push({ categoria: 'Elétrica', material: 'Pontos elétricos (un)', quantidade: pontos_eletricos, unidade: 'un', valor_unitario: 25, valor_total: +(pontos_eletricos * 25).toFixed(2) });
  rows.push({ categoria: 'Elétrica', material: 'Tomadas (un)', quantidade: tomadas, unidade: 'un', valor_unitario: 8, valor_total: +(tomadas * 8).toFixed(2) });

  const custo_total = rows.reduce((s, r) => s + (r.valor_total || 0), 0);

  return {
    rows,
    resumo: { piso_m2: +totalPisoAll.toFixed(2), paredes_m2: +areaParede.toFixed(2), perimetro_m: +totalPerimeterAll.toFixed(2), area_telhado_m2: +areaTelhado.toFixed(2), custo_total: +custo_total.toFixed(2) },
  };
}

export default { calcularEstimativa };
