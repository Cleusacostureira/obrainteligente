import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ProjetoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [custos, setCustos] = useState<any[]>([]);
  const [projeto, setProjeto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  if (!id) {
    navigate('/projetos');
    return null;
  }

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/');
      return;
    }
    const u = JSON.parse(stored);

    const load = async () => {
      setLoading(true);
      const { data: projData, error: projErr } = await supabase
        .from('projetos')
        .select('*')
        .eq('id', id)
        .eq('owner', u.id)
        .single();
      if (projErr) console.error(projErr);
      setProjeto(projData || null);

      const { data: custosData, error: custosErr } = await supabase
        .from('custos')
        .select('*')
        .eq('projeto_id', id)
        .order('data', { ascending: false });
      if (custosErr) console.error(custosErr);
      setCustos(custosData || []);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  if (!projeto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-gray-400 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Projeto não encontrado</h2>
          <button
            onClick={() => navigate('/projetos')}
            className="mt-4 px-6 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap cursor-pointer"
          >
            Voltar para Projetos
          </button>
        </div>
      </div>
    );
  }

  // Correção do reduce: adiciona o objeto inicial `{}` antes do cast
  const custosPorCategoria = custos.reduce((acc, custo) => {
    acc[custo.categoria] = (acc[custo.categoria] || 0) + custo.valorTotal;
    return acc;
  }, {} as Record<string, number>);

  const progresso = (projeto.gastoTotal / projeto.orcamento) * 100;
  const saldo = projeto.orcamento - projeto.gastoTotal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projetos')}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <img
              src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png"
              alt="Logo"
              className="w-10 h-10 object-contain"
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{projeto.nome}</h1>
              <p className="text-sm text-gray-600 capitalize">
                {projeto.tipo.replace('-', ' ')} • {projeto.padrao}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                projeto.status === 'em-andamento'
                  ? 'bg-orange-100 text-orange-700'
                  : projeto.status === 'concluido'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {projeto.status === 'em-andamento'
                ? 'Em Andamento'
                : projeto.status === 'concluido'
                ? 'Concluído'
                : 'Planejamento'}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
              { id: 'custos', label: 'Custos', icon: 'ri-money-dollar-circle-line' },
              { id: 'calculadora', label: 'Calculadora', icon: 'ri-calculator-line' },
              { id: 'relatorios', label: 'Relatórios', icon: 'ri-file-chart-line' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className={`${tab.icon} text-lg`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-teal-100 rounded-xl">
                    <i className="ri-wallet-line text-2xl text-teal-600"></i>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Orçamento Total</h3>
                <p className="text-2xl font-bold text-gray-800">
                  R$ {projeto.orcamento.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded-xl">
                    <i className="ri-shopping-cart-line text-2xl text-orange-600"></i>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Gasto</h3>
                <p className="text-2xl font-bold text-gray-800">
                  R$ {projeto.gastoTotal.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-xl ${
                      saldo < 0 ? 'bg-red-100' : 'bg-green-100'
                    }`}
                  >
                    <i
                      className={`ri-money-dollar-box-line text-2xl ${
                        saldo < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    ></i>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Saldo Disponível</h3>
                <p className={`text-2xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  R$ {saldo.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-xl ${
                      progresso > 100
                        ? 'bg-red-100'
                        : progresso > 80
                        ? 'bg-orange-100'
                        : 'bg-teal-100'
                    }`}
                  >
                    <i
                      className={`ri-percent-line text-2xl ${
                        progresso > 100
                          ? 'text-red-600'
                          : progresso > 80
                          ? 'text-orange-600'
                          : 'text-teal-600'
                      }`}
                    ></i>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Progresso</h3>
                <p className={`text-2xl font-bold ${progresso > 100 ? 'text-red-600' : 'text-gray-800'}`}>
                  {progresso.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Barra de Progresso Grande */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Utilização do Orçamento</h3>
              <div className="w-full bg-gray-200 rounded-full h-6 mb-3">
                <div
                  className={`h-6 rounded-full transition-all flex items-center justify-end pr-3 ${
                    progresso > 100
                      ? 'bg-red-500'
                      : progresso > 80
                      ? 'bg-orange-500'
                      : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(progresso, 100)}%` }}
                >
                  <span className="text-xs font-bold text-white">{progresso.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  R$ {projeto.gastoTotal.toLocaleString('pt-BR')} de R${' '}
                  {projeto.orcamento.toLocaleString('pt-BR')}
                </span>
                {progresso > 100 && (
                  <span className="text-red-600 font-semibold">
                    ⚠️ Orçamento ultrapassado em R$ {Math.abs(saldo).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            {/* Gastos por Categoria */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Gastos por Categoria</h3>
              <div className="space-y-4">
                {Object.entries(custosPorCategoria).map(([categoria, valor]) => {
                  const percentual = (valor / projeto.gastoTotal) * 100;
                  return (
                    <div key={categoria}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {categoria.replace('-', ' ')}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">
                            R$ {valor.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({percentual.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-600"
                          style={{ width: `${percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informações da Obra */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Informações da Obra</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Área Total</span>
                    <span className="text-sm font-semibold text-gray-800">{projeto.area} m²</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Custo por m²</span>
                    <span className="text-sm font-semibold text-gray-800">
                      R$ {(projeto.gastoTotal / projeto.area).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Orçamento por m²</span>
                    <span className="text-sm font-semibold text-gray-800">
                      R$ {(projeto.orcamento / projeto.area).toFixed(2)}
                    </span>
                  </div>
                  {projeto.endereco && (
                    <div className="flex items-start justify-between py-2">
                      <span className="text-sm text-gray-600">Endereço</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">
                        {projeto.endereco}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Cronograma</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Data de Início</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {new Date(projeto.dataInicio).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {projeto.dataTermino && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Previsão de Término</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(projeto.dataTermino).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {projeto.observacoes && (
                    <div className="pt-2">
                      <span className="text-sm text-gray-600 block mb-1">Observações</span>
                      <p className="text-sm text-gray-800">{projeto.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custos Tab */}
        {activeTab === 'custos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Lançamentos de Custos</h2>
              <button
                onClick={() => navigate(`/projeto/${id}/novo-custo`)}
                className="flex items-center gap-2 bg-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line text-xl"></i>
                Novo Lançamento
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Data
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Categoria
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Descrição
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                        Quantidade
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                        Valor Unit.
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                        Valor Total
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {custos.map(custo => (
                      <tr key={custo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {new Date(custo.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 capitalize whitespace-nowrap">
                            {custo.categoria.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{custo.descricao}</td>
                        <td className="px-6 py-4 text-sm text-gray-800 text-right">{custo.quantidade}</td>
                        <td className="px-6 py-4 text-sm text-gray-800 text-right">
                          R$ {custo.valorUnitario.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800 text-right">
                          R$ {custo.valorTotal.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 transition-colors cursor-pointer">
                              <i className="ri-edit-line text-lg"></i>
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors cursor-pointer">
                              <i className="ri-delete-bin-line text-lg"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Calculadora Tab */}
        {activeTab === 'calculadora' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Calculadora de Materiais</h2>
              <button
                onClick={() => navigate(`/projeto/${id}/calculadora`)}
                className="flex items-center gap-3 w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-calculator-line text-2xl"></i>
                <div className="text-left flex-1">
                  <div className="text-lg">Calcular Materiais por m²</div>
                  <div className="text-sm opacity-90">
                    Estime quantidade e custo de materiais automaticamente
                  </div>
                </div>
                <i className="ri-arrow-right-line text-2xl"></i>
              </button>
            </div>
          </div>
        )}

        {/* Relatórios Tab */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Relatórios</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-teal-100 rounded-xl">
                    <i className="ri-file-text-line text-2xl text-teal-600"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Resumo Geral</h3>
                    <p className="text-sm text-gray-600">Visão completa da obra</p>
                  </div>
                  <i className="ri-download-line text-xl text-gray-400"></i>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded-xl">
                    <i className="ri-bar-chart-box-line text-2xl text-orange-600"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Orçamento x Realizado</h3>
                    <p className="text-sm text-gray-600">Comparativo financeiro</p>
                  </div>
                  <i className="ri-download-line text-xl text-gray-400"></i>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-green-100 rounded-xl">
                    <i className="ri-shopping-bag-line text-2xl text-green-600"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Lista de Materiais</h3>
                    <p className="text-sm text-gray-600">Materiais utilizados</p>
                  </div>
                  <i className="ri-download-line text-xl text-gray-400"></i>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded-xl">
                    <i className="ri-history-line text-2xl text-red-600"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Histórico Financeiro</h3>
                    <p className="text-sm text-gray-600">Todos os lançamentos</p>
                  </div>
                  <i className="ri-download-line text-xl text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
