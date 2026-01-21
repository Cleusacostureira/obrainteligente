import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calculatePlantaMetrics, calcularMateriaisFromPlanta, Planta, PlantaRoom } from '../../../lib/planta';

export default function PlantaPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [ambientes, setAmbientes] = useState<PlantaRoom[]>([]);
  const [form, setForm] = useState<Partial<PlantaRoom>>({ name: '', width: 3, length: 3, height: 2.7, isClosed: true, countsAsAlvenaria: true, hasForro: true });
  const [precos] = useState<Record<string, number>>({});
  const [coefs, setCoefs] = useState<any>({ fator_parede: 3.0, fator_inclinacao: 1.2 });
  const [materialRows, setMaterialRows] = useState<any[]>([]);

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
  }

  function removeAmbiente(id: string) {
    setAmbientes((s) => s.filter((x) => x.id !== id));
  }

  const planta: Planta = { ambientes };
  const metrics = calculatePlantaMetrics(planta, coefs);

  function handleCalcular() {
    const res = calcularMateriaisFromPlanta(planta, precos, coefs as any);
    setMaterialRows(res.rows || []);
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-sky-600">Planta Baixa — Projeto</h1>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
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
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.hasForro} onChange={(e) => setForm({ ...form, hasForro: e.target.checked })} /> Tem forro</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isClosed} onChange={(e) => setForm({ ...form, isClosed: e.target.checked })} /> Interno fechado</label>
            </div>

            <div className="mt-2 flex gap-2">
              <button onClick={addAmbiente} className="bg-green-600 text-white px-3 py-1 rounded">Adicionar</button>
              <button onClick={() => setForm({ name: '', width: 3, length: 3, height: 2.7, isClosed: true, countsAsAlvenaria: true, hasForro: true })} className="bg-red-500 text-white px-3 py-1 rounded">Limpar</button>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-semibold">Ambientes</h2>
            <ul className="space-y-2 mt-2">
              {ambientes.map((a) => (
                <li key={a.id} className="flex justify-between items-center border p-2 rounded">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-600">{a.width}m × {a.length}m — area {(a.width*a.length).toFixed(2)} m²</div>
                    <div className="text-xs text-gray-600">flags: {a.countsAsAlvenaria ? 'alvenaria' : 'no-alvenaria'}, {a.hasForro ? 'forro' : 'no-forro'}, {a.isClosed ? 'fechado' : 'externo'}</div>
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
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold">Métricas da planta</h2>
            <div className="mt-2">Área piso total: <strong>{metrics.area_piso_total} m²</strong></div>
            <div>Área piso (alvenaria): <strong>{metrics.area_piso_alvenaria} m²</strong></div>
            <div>Área paredes: <strong>{metrics.area_parede_total} m²</strong></div>
            <div>Área forro: <strong>{metrics.area_forro} m²</strong></div>
            <div>Área telhado: <strong>{metrics.area_telhado} m²</strong></div>
            <div>Perímetro externo (aprox): <strong>{metrics.perimetro_externo} m</strong></div>
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
  );
}
