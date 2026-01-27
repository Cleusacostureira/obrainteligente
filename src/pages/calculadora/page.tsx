import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calcularEstimativa, CalculadoraInput, MaterialRow, Room, Coefs } from '../../lib/calculadora';
import { supabase } from '../../lib/supabase';

export default function CalculadoraPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [area, setArea] = useState<number | ''>('');
  const [padrao, setPadrao] = useState<'Econômico' | 'Médio' | 'Alto'>('Médio');
  const [telhado, setTelhado] = useState<'Cerâmico' | 'Fibrocimento' | 'Isotérmico' | 'Madeira aparente' | 'Nenhum'>('Cerâmico');
  const [pisoTipo, setPisoTipo] = useState<'Cerâmico' | 'Porcelanato' | 'Nenhum'>('Cerâmico');
  const [forroTipo, setForroTipo] = useState<'PVC' | 'Gesso' | 'Laje' | 'Nenhum'>('PVC');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomDraft, setRoomDraft] = useState<Partial<Room>>({ name: '', width: 3, length: 3, height: 2.7 });

  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [resumo, setResumo] = useState<any | null>(null);

  const defaultPrices = {
    tijolo: 0.8,
    cimento: 40,
    areia_m3: 180,
    brita_m3: 220,
    argamassa_saco: 30,
    rejunte_kg: 10,
    piso_m2: 25,
    porcelanato_m2: 55,
    tinta_litro: 60,
    telha_un: 2.5,
  } as const;

  const [prices, setPrices] = useState<Record<string, number>>({ ...defaultPrices });
  const [coefs, setCoefs] = useState<Coefs>({
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
  });
  const [presets, setPresets] = useState<Array<{ name: string; prices: Record<string, number> }>>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('calc_presets');
      if (raw) setPresets(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const projetoId = (params as any)?.projetoId || (params as any)?.id || null;
    if (!projetoId) return;
    (async () => {
      const { data } = await supabase.from('calculadora_presets').select('*').eq('projeto_id', projetoId).order('created_at', { ascending: true });
      if (data && Array.isArray(data)) {
        const remotePresets = data.map((r: any) => ({ name: r.name, prices: r.data }));
        setPresets((prev) => [...prev, ...remotePresets]);
      }
    })();
  }, [params]);

  function savePresetsToStorage(list: any) {
    localStorage.setItem('calc_presets', JSON.stringify(list));
  }

  async function savePreset() {
    const name = prompt('Nome do preset:');
    if (!name) return;
    const next = [...presets, { name, prices }];
    setPresets(next);
    savePresetsToStorage(next);

    const projetoId = (params as any)?.projetoId || (params as any)?.id || null;
    if (!projetoId) return;
    try {
      const userResp = await supabase.auth.getUser();
      const owner = (userResp as any)?.data?.user?.id || null;
      await supabase.from('calculadora_presets').insert([{ projeto_id: projetoId, owner, name, data: prices }]);
    } catch (e) {
      // ignore remote save errors
    }
  }

  function applyPreset(idx: number) {
    const p = presets[idx];
    if (!p) return;
    setSelectedPresetIndex(idx);
    setPrices(p.prices);
    // compute using the preset prices immediately
    const input: CalculadoraInput = {
      rooms: rooms.length ? rooms : undefined,
      telhadoTipo: telhado,
      telhadoInclinationFactor: 1.2,
      pisoTipo,
      forroTipo,
    } as any;
    const result = calcularEstimativa(input, p.prices, coefs as any);
    setRows(result.rows);
    setResumo(result.resumo as any);
  }

  function deletePreset(idx: number) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next);
    savePresetsToStorage(next);
  }

  function addRoom() {
    if (!roomDraft.name || !roomDraft.width || !roomDraft.length) return;
    const r: Room = { name: String(roomDraft.name), width: Number(roomDraft.width), length: Number(roomDraft.length), height: roomDraft.height };
    setRooms((s) => [...s, r]);
    setRoomDraft({ name: '', width: 3, length: 3, height: 2.7 });
  }

  function removeRoom(idx: number) {
    setRooms((s) => s.filter((_, i) => i !== idx));
  }

  function gerar() {
    const input: CalculadoraInput = {
      rooms: rooms.length ? rooms : undefined,
      telhadoTipo: telhado,
      telhadoInclinationFactor: 1.2,
      pisoTipo,
      forroTipo,
    } as any;
    const result = calcularEstimativa(input, prices, coefs as any);
    setRows(result.rows);
    setResumo(result.resumo as any);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-blue-600">Calculadora Rápida de Obra</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-3 py-1 border rounded">Voltar</button>
          <button onClick={() => window.print()} title="Imprimir" className="px-3 py-1 border rounded">
            <i className="ri-printer-line text-lg"></i>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Ambientes (cômodos)</h3>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Preencha cada cômodo com: <strong>Nome</strong>, <strong>Largura (m)</strong>, <strong>Comprimento (m)</strong> e <strong>Altura (m)</strong> (padrão 2.70 m).</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col text-sm">
                    Nome do cômodo
                    <input placeholder="Ex: Sala" value={roomDraft.name as string} onChange={(e) => setRoomDraft((d) => ({ ...d, name: e.target.value }))} className="mt-1 border rounded p-2" />
                  </label>

                  <label className="flex flex-col text-sm">
                    Largura (m)
                    <input type="number" placeholder="Ex: 3.50" value={roomDraft.width as any} onChange={(e) => setRoomDraft((d) => ({ ...d, width: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
                  </label>

                  <label className="flex flex-col text-sm">
                    Comprimento (m)
                    <input type="number" placeholder="Ex: 4.00" value={roomDraft.length as any} onChange={(e) => setRoomDraft((d) => ({ ...d, length: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
                  </label>

                  <label className="flex flex-col text-sm">
                    Altura (m)
                    <input type="number" placeholder="Ex: 2.70" value={roomDraft.height as any} onChange={(e) => setRoomDraft((d) => ({ ...d, height: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={addRoom} className="px-3 py-2 bg-green-600 text-white rounded">Adicionar cômodo</button>
                  <button onClick={() => setRoomDraft({ name: '', width: 3, length: 3, height: 2.7 })} className="px-3 py-2 border rounded">Limpar</button>
                </div>
                <div className="mt-3">
                  {rooms.length === 0 ? <div className="text-sm text-gray-500">Nenhum cômodo adicionado.</div> : (
                    <ul className="space-y-2">
                      {rooms.map((r, i) => (
                        <li key={i} className="flex items-center justify-between border p-2 rounded">
                          <div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-gray-600">{r.width} × {r.length} m • h {r.height ?? 2.7} m</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => removeRoom(i)} className="px-2 py-1 border rounded text-sm">Remover</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Controles & Presets</h3>
              <div className="mb-3">
                <label className="text-sm">Telhado</label>
                <select value={telhado} onChange={(e) => setTelhado(e.target.value as any)} className="w-full mt-1 border rounded p-2">
                  <option>Cerâmico</option>
                  <option>Fibrocimento</option>
                  <option>Isotérmico</option>
                  <option>Madeira aparente</option>
                  <option>Nenhum</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="text-sm">Piso</label>
                <select value={pisoTipo} onChange={(e) => setPisoTipo(e.target.value as any)} className="w-full mt-1 border rounded p-2">
                  <option>Cerâmico</option>
                  <option>Porcelanato</option>
                  <option>Nenhum</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="text-sm">Forro</label>
                <select value={forroTipo} onChange={(e) => setForroTipo(e.target.value as any)} className="w-full mt-1 border rounded p-2">
                  <option>PVC</option>
                  <option>Gesso</option>
                  <option>Laje</option>
                  <option>Nenhum</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button onClick={gerar} className="px-4 py-2 bg-blue-600 text-white rounded">Calcular</button>
                <button onClick={() => { setRows([]); setResumo(null); }} className="px-4 py-2 border rounded">Limpar resultados</button>
              </div>

              <div className="mt-4">
                <label className="text-xs text-gray-600">Presets:</label>
                <div className="flex gap-2 mt-1">
                    <select className="border rounded p-1 text-sm w-full sm:w-auto" onChange={(e) => { const v = e.target.value; if (v === '') { setSelectedPresetIndex(null); return; } applyPreset(Number(v)); }} value={selectedPresetIndex ?? ''}>
                      <option value="">-- Carregar preset --</option>
                      {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
                    </select>
                    <button onClick={savePreset} className="px-2 py-1 bg-green-600 text-white rounded text-sm w-full sm:w-auto">Salvar preset</button>
                    <button onClick={() => { setPresets([]); savePresetsToStorage([]); }} className="px-2 py-1 bg-red-600 text-white rounded text-sm w-full sm:w-auto">Limpar presets</button>
                </div>
              </div>
                {selectedPresetIndex !== null && presets[selectedPresetIndex] && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <div className="font-medium mb-1">Preset: {presets[selectedPresetIndex].name}</div>
                    <div className="grid grid-cols-1 gap-1">
                      {Object.entries(presets[selectedPresetIndex].prices).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <div className="text-gray-700">{k.replace(/_/g, ' ')}</div>
                          <div className="font-mono">{Number(v).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="mt-6 bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Lista detalhada</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-gray-100">
                    <th className="p-2">Categoria</th>
                    <th className="p-2">Material</th>
                    <th className="p-2">Qtd</th>
                    <th className="p-2">Unidade</th>
                    <th className="p-2">Valor unit.</th>
                    <th className="p-2">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 align-top">{r.categoria}</td>
                      <td className="p-2 align-top">{r.material}</td>
                      <td className="p-2 align-top">{r.quantidade}</td>
                      <td className="p-2 align-top">{r.unidade}</td>
                      <td className="p-2 align-top">{r.valor_unitario ? `R$ ${r.valor_unitario.toFixed(2)}` : '—'}</td>
                      <td className="p-2 align-top">{r.valor_total ? `R$ ${r.valor_total.toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Resumo do Projeto</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <div>Piso total: {resumo ? `${resumo.piso_m2} m²` : '—'}</div>
            <div>Paredes total: {resumo ? `${resumo.paredes_m2} m²` : '—'}</div>
            <div>Perímetro total: {resumo ? `${resumo.perimetro_m} m` : '—'}</div>
            <div>Área telhado: {resumo ? `${resumo.area_telhado_m2} m²` : '—'}</div>
            <div className="font-bold">Custo estimado: {resumo ? `R$ ${resumo.custo_total.toFixed(2)}` : '—'}</div>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Coeficientes (editáveis)</h4>
            <div className="space-y-2 text-sm">
              <label className="flex flex-col">
                Tijolo (un / m² parede)
                <input type="number" value={coefs.tijolo_un_m2} onChange={(e) => setCoefs((c) => ({ ...c, tijolo_un_m2: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                Cimento assent. (sac / m² parede)
                <input type="number" step="0.01" value={coefs.cimento_assent_sac_m2} onChange={(e) => setCoefs((c) => ({ ...c, cimento_assent_sac_m2: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                Cimento reboco (sac / m² / lado)
                <input type="number" step="0.01" value={coefs.cimento_reboco_sac_m2} onChange={(e) => setCoefs((c) => ({ ...c, cimento_reboco_sac_m2: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                Lados de reboco
                <input type="number" step="1" min="1" value={coefs.reboco_lados} onChange={(e) => setCoefs((c) => ({ ...c, reboco_lados: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                Brita (m³ / m² piso)
                <input type="number" step="0.001" value={coefs.brita_m3_m2_piso} onChange={(e) => setCoefs((c) => ({ ...c, brita_m3_m2_piso: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                Mão de obra (R$ / m²)
                <input type="number" step="0.01" value={coefs.tarifa_mao_obra_m2 || 0} onChange={(e) => setCoefs((c) => ({ ...c, tarifa_mao_obra_m2: Number(e.target.value) }))} className="mt-1 border rounded p-2" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Lista detalhada</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-100">
                <th className="p-2">Categoria</th>
                <th className="p-2">Material</th>
                <th className="p-2">Qtd</th>
                <th className="p-2">Unidade</th>
                <th className="p-2">Valor unit.</th>
                <th className="p-2">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 align-top">{r.categoria}</td>
                  <td className="p-2 align-top">{r.material}</td>
                  <td className="p-2 align-top">{r.quantidade}</td>
                  <td className="p-2 align-top">{r.unidade}</td>
                  <td className="p-2 align-top">R$ {r.valor_unitario?.toFixed(2) ?? '0.00'}</td>
                  <td className="p-2 align-top">R$ {r.valor_total?.toFixed(2) ?? '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}