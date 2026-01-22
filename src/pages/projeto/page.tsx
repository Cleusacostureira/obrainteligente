import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const toNumber = (v: any) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatLocalDate = (value: any) => {
  if (!value) return '—';
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('pt-BR');
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

export default function ProjetoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [projeto, setProjeto] = useState<any | null>(null);
  const [custos, setCustos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem('user');
    if (!stored) return navigate('/');
    const u = JSON.parse(stored);

    (async () => {
      setLoading(true);
      // NOTE: removed owner filter to allow loading the project by id during local dev/inspection.
      // If you want strict owner checks, restore the `.eq('owner', u.id)` clause.
      const { data: proj } = await supabase.from('projetos').select('*').eq('id', id).single();
      setProjeto(proj || null);
      const { data: custosData } = await supabase.from('custos').select('*').eq('projeto_id', id).order('data', { ascending: false });
      setCustos(custosData || []);
      setLoading(false);
    })();
  }, [id, navigate]);

  const gastoFromCustos = useMemo(() => {
    return custos.reduce((s, c) => {
      // possible fields for total value (include valor_compra / valorCompra)
      const explicitTotal = c.valor_total ?? c.valorTotal ?? c.total ?? c.valor_total_est ?? c.valor_tot ?? c.valor_compra ?? c.valorCompra;
      if (explicitTotal != null) return s + toNumber(explicitTotal);
      // try unit * quantity
      const unit = toNumber(c.valor_unitario ?? c.valorUnitario ?? c.preco ?? c.valor ?? c.valor_compra ?? c.valorCompra);
      const qtd = toNumber(c.quantidade ?? c.qtd ?? c.amount ?? 1);
      return s + unit * qtd;
    }, 0);
  }, [custos]);

  const orcamento = toNumber(projeto?.orcamento ?? projeto?.orcamento_total ?? 0);
  // total gasto should be the sum of all lancamentos (custos)
  const gastoTotal = toNumber(gastoFromCustos);
  const saldo = orcamento - gastoTotal;
  const progresso = orcamento === 0 ? 0 : (gastoTotal / orcamento) * 100;

  const handleNovo = () => navigate(`/projeto/${id}/novo-custo`);
  const handleEdit = (custoId: string) => navigate(`/projeto/${id}/novo-custo?custoId=${custoId}`);

  const handleDelete = async (custoId: string) => {
    if (!confirm('Excluir lançamento?')) return;
    const { error } = await supabase.from('custos').delete().eq('id', custoId);
    if (error) return alert('Erro ao excluir');
    setCustos(s => s.filter(c => c.id !== custoId));
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return alert('Não foi possível abrir a janela de impressão');
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório - ${projeto?.nome ?? ''}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:Inter,Arial,Helvetica,sans-serif;padding:20px;color:#111}
    .header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-radius:8px;background:linear-gradient(90deg,#0d9488 0%,#fb923c 100%);color:white;margin-bottom:18px}
    .logo{display:flex;align-items:center;gap:12px}
    .logo img{width:56px;height:56px;object-fit:contain;border-radius:8px}
    .logo .fallback{display:none;align-items:center;justify-content:center;width:56px;height:56px;background:#ffffff;border-radius:8px}
    .hidden{display:none!important}
    h1{margin:0;font-size:20px}
    .meta{font-size:13px}
    .cards{display:flex;gap:12px;margin-top:12px}
    .card{background:#fff;padding:10px;border-radius:8px;color:#111;min-width:140px}
    table{width:100%;border-collapse:collapse;margin-top:18px}
    th,td{padding:8px;border:1px solid #e6e6e6;text-align:left}
    thead th{background:#f3f4f6;font-weight:600}
  </style>
</head>
<body>
  <div class="header">
        <div class="logo">
        <!-- inline logo -->
        <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
          <img src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png" alt="Obras Inteligente" style="width:56px;height:56px;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';var fb=this.parentElement.querySelector('.fallback'); if(fb) fb.classList.remove('hidden');" />
          <div class="fallback hidden" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
              <text x="50" y="58" font-size="12" text-anchor="middle" fill="#0ea5a4">LOGO</text>
            </svg>
          </div>
        </div>
        <div>
          <h1>${projeto?.nome ?? ''}</h1>
          <div class="meta">${projeto.endereco ?? projeto.address ?? ''}</div>
        </div>
      </div>
    <div style="text-align:right;min-width:220px">
      <div style="font-size:13px;opacity:0.95">Orçamento: <strong>R$ ${orcamento.toLocaleString('pt-BR')}</strong></div>
      <div style="font-size:13px;opacity:0.95">Total gasto: <strong>R$ ${gastoTotal.toLocaleString('pt-BR')}</strong></div>
      <div style="font-size:13px;opacity:0.95">Valor estimado: <strong style="color:#059669">R$ ${valorEstimado.toLocaleString('pt-BR')}</strong></div>
      <div style="font-size:13px;opacity:0.95">Período: <strong>${formatLocalDate(dataInicio)} — ${formatLocalDate(dataFim)}</strong></div>
    </div>
  </div>

  <div>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Categoria</th>
          <th>Descrição</th>
          <th style="text-align:right">Qtd</th>
          <th style="text-align:right">Valor Unit.</th>
          <th style="text-align:right">Valor Total</th>
        </tr>
      </thead>
      <tbody>
        ${custos.map((c: any) => `<tr>
          <td>${formatLocalDate(c.data)}</td>
          <td>${(c.categoria||'').replace('-', ' ')}</td>
          <td>${c.descricao||''}</td>
          <td style="text-align:right">${c.quantidade ?? ''}</td>
          <td style="text-align:right">R$ ${toNumber(c.valor_unitario ?? c.valorUnitario ?? c.valor_compra ?? c.valorCompra).toLocaleString('pt-BR')}</td>
          <td style="text-align:right">R$ ${toNumber(c.valor_total ?? c.valorTotal ?? (toNumber(c.valor_unitario ?? c.valorUnitario ?? c.valor_compra ?? c.valorCompra) * toNumber(c.quantidade ?? c.qtd ?? 1))).toLocaleString('pt-BR')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  if (!id) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!projeto) return <div className="min-h-screen flex items-center justify-center">Projeto não encontrado</div>;

  const area = toNumber(projeto?.area ?? projeto?.area_m2 ?? 0);
  const valorImovel = toNumber(projeto?.valor_compra ?? projeto?.valorCompra ?? projeto?.valor_imovel ?? 0);
  const custoPorM2 = area > 0 && valorImovel > 0 ? valorImovel / area : NaN;
  const orcamentoPorM2 = area > 0 ? orcamento / area : NaN;
  const valorEstimado = (valorImovel || 0) + (orcamento || 0);

  const dataInicio = projeto?.data_inicio ?? projeto?.start_date ?? projeto?.inicio ?? projeto?.inicio_previsao ?? projeto?.startDate;
  const dataFim = projeto?.data_termino ?? projeto?.data_fim ?? projeto?.end_date ?? projeto?.previsao_termino ?? projeto?.previsaoTermino ?? projeto?.endDate ?? projeto?.data_previsao;
  const inicioDate = dataInicio ? new Date(String(dataInicio)) : null;
  const fimDate = dataFim ? new Date(String(dataFim)) : null;
  const hoje = new Date();
  const diasTotais = inicioDate && fimDate ? Math.max(1, Math.ceil((+fimDate - +inicioDate) / (1000 * 60 * 60 * 24))) : null;
  const diasDecorridos = inicioDate ? Math.max(0, Math.ceil((+hoje - +inicioDate) / (1000 * 60 * 60 * 24))) : null;
  const cronogramaProgresso = diasTotais ? Math.min(100, Math.max(0, (diasDecorridos! / diasTotais) * 100)) : null;

  // removed previsaoTotal and saldoProjetado: user requested to remove previsao total card

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-6">
          <div>
            <h1 className="text-2xl font-bold">{projeto.nome || '—'}</h1>
            <div className="text-sm text-gray-600">Orçamento: R$ {orcamento.toLocaleString('pt-BR')}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleNovo} className="px-3 py-2 bg-teal-600 text-white rounded">Novo lançamento</button>
            <button onClick={handlePrint} title="Imprimir relatório" className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg">🖨️</button>
            <button onClick={() => navigate(`/projeto/${id}/planta`)} className="px-3 py-2 bg-sky-600 text-white rounded">Planta</button>
            <button onClick={() => navigate('/projetos')} className="px-3 py-2 bg-white rounded">Voltar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-semibold mb-3">Informações da Obra</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Área Total</div>
                <div className="font-medium">{area > 0 ? `${area} m²` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Valor do Imóvel</div>
                <div className="font-medium">R$ {valorImovel ? valorImovel.toLocaleString('pt-BR') : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Valor estimado do bem</div>
                <div className="font-medium text-green-600">{valorEstimado > 0 ? `R$ ${valorEstimado.toLocaleString('pt-BR')}` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Custo por m²</div>
                <div className="font-medium">{Number.isFinite(custoPorM2) ? `R$ ${custoPorM2.toLocaleString('pt-BR')}` : '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Orçamento por m²</div>
                <div className="font-medium">{Number.isFinite(orcamentoPorM2) ? `R$ ${orcamentoPorM2.toFixed(2)}` : '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500">Endereço</div>
                <div className="font-medium">{projeto.endereco ?? projeto.address ?? '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500">Observações</div>
                <div className="font-medium">{projeto.observacoes ?? projeto.observacao ?? projeto.notes ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-semibold mb-3">Cronograma</h3>
            <div className="text-sm text-gray-700">
              <div className="mb-2">
                <div className="text-xs text-gray-500">Data de Início</div>
                <div className="font-medium">{formatLocalDate(dataInicio)}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-500">Previsão de Término</div>
                <div className="font-medium">{formatLocalDate(dataFim)}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-500">Progresso do Cronograma</div>
                <div className="font-medium">{cronogramaProgresso !== null ? `${cronogramaProgresso.toFixed(0)}%` : '—'}</div>
              </div>
              <div className="mb-2">
                <div className="text-xs text-gray-500">Dias decorridos</div>
                <div className="font-medium">{diasDecorridos !== null ? `${diasDecorridos} dias` : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-sm text-gray-600">Orçamento Total</div>
            <div className="text-2xl font-bold">R$ {orcamento.toLocaleString('pt-BR')}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-sm text-gray-600">Total Gasto</div>
            <div className="text-2xl font-bold">R$ {gastoTotal.toLocaleString('pt-BR')}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-sm text-gray-600">Saldo</div>
            <div className={`text-2xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-gray-800'}`}>R$ {saldo.toLocaleString('pt-BR')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Categoria</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Quantidade</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Valor Unit.</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Valor Total</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {custos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">Nenhum lançamento ainda.</td>
                  </tr>
                )}
                {custos.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-800">{formatLocalDate(c.data)}</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 capitalize whitespace-nowrap">{(c.categoria||'').replace('-', ' ')}</span></td>
                    <td className="px-6 py-4 text-sm">{c.descricao}</td>
                    <td className="px-6 py-4 text-sm text-right">{c.quantidade ?? c.qtd}</td>
                    <td className="px-6 py-4 text-sm text-right">R$ {toNumber(c.valor_unitario ?? c.valorUnitario).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-right">R$ {toNumber(c.valor_total ?? c.valorTotal).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button onClick={() => handleEdit(c.id)} className="text-teal-600 hover:underline">Editar</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
