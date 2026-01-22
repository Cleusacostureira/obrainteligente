import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function Projetos() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>(
    { open: false, id: null }
  );
  const [novoProjeto, setNovoProjeto] = useState({
    nome: '',
    tipo: 'casa',
    endereco: '',
    area: '',
    padrao: 'medio',
    orcamento: '',
    valorCompra: '',
    dataInicio: '',
    dataTermino: '',
    observacoes: ''
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/');
      return;
    }
    const u = JSON.parse(stored);
    setUserId(u.id);

    const normalizeProjeto = (p: any) => ({
      ...p,
      area: p.area ?? p.area,
      orcamento: typeof p.orcamento === 'number' ? p.orcamento : (p.orcamento ?? 0),
      valorCompra: p.valor_compra ?? p.valorCompra ?? 0,
      gastoTotal: p.gasto_total ?? p.gastoTotal ?? 0,
      dataInicio: p.data_inicio ?? p.dataInicio ?? null,
      dataTermino: p.data_termino ?? p.dataTermino ?? null
    });

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .eq('owner', u.id)
        .order('created_at', { ascending: false });
      if (error) console.error(error);
      setProjetos((data || []).map(normalizeProjeto));
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert('Usuário não autenticado');
    const projeto: any = {
      nome: novoProjeto.nome,
      tipo: novoProjeto.tipo,
      endereco: novoProjeto.endereco,
      area: parseFloat(novoProjeto.area),
      padrao: novoProjeto.padrao,
      orcamento: parseFloat(novoProjeto.orcamento),
      data_inicio: novoProjeto.dataInicio || null,
      data_termino: novoProjeto.dataTermino || null,
      observacoes: novoProjeto.observacoes,
      owner: userId,
      gasto_total: 0,
      status: 'em-andamento'
    };

    // Only include `valor_compra` when user provided a value — avoids PostgREST errors
    // if the column is not present in the remote DB schema yet.
    if (novoProjeto.valorCompra && novoProjeto.valorCompra !== '') {
      projeto.valor_compra = parseFloat(novoProjeto.valorCompra);
    }
    try {
      // ensure user exists in `users` table to satisfy FK constraint
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        await supabase.from('users').upsert({ id: u.id, email: u.email, name: u.name || null });
      }
    } catch (e) {
      console.warn('Could not ensure user record before creating projeto', e);
    }

    if (editingProjectId) {
      const { data: updated, error: updErr } = await supabase
        .from('projetos')
        .update(projeto)
        .eq('id', editingProjectId)
        .select();
      if (updErr) {
        console.error(updErr);
        alert('Erro ao atualizar projeto');
        return;
      }
      const normalizeProjeto = (p: any) => ({
        ...p,
        area: p.area ?? p.area,
        orcamento: typeof p.orcamento === 'number' ? p.orcamento : (p.orcamento ?? 0),
        valorCompra: p.valor_compra ?? p.valorCompra ?? 0,
        gastoTotal: p.gasto_total ?? p.gastoTotal ?? 0,
        dataInicio: p.data_inicio ?? p.dataInicio ?? null,
        dataTermino: p.data_termino ?? p.dataTermino ?? null
      });
      setProjetos(prev => prev.map(p => p.id === editingProjectId ? normalizeProjeto((updated || [])[0] || projeto) : p));
      setShowModal(false);
      setEditingProjectId(null);
      setNovoProjeto({
        nome: '',
        tipo: 'casa',
        endereco: '',
        area: '',
        padrao: 'medio',
        orcamento: '',
        valorCompra: '',
        dataInicio: '',
        dataTermino: '',
        observacoes: ''
      });
    } else {
      const { data, error } = await supabase.from('projetos').insert([projeto]).select();
      if (error) {
        console.error(error);
        alert('Erro ao criar projeto');
        return;
      }
      const normalizeProjeto = (p: any) => ({
        ...p,
        area: p.area ?? p.area,
        orcamento: typeof p.orcamento === 'number' ? p.orcamento : (p.orcamento ?? 0),
        valorCompra: p.valor_compra ?? p.valorCompra ?? 0,
        gastoTotal: p.gasto_total ?? p.gastoTotal ?? 0,
        dataInicio: p.data_inicio ?? p.dataInicio ?? null,
        dataTermino: p.data_termino ?? p.dataTermino ?? null
      });
      setProjetos(prev => [ ...((data || []).map(normalizeProjeto)), ...prev ]);
      setShowModal(false);
      setNovoProjeto({
        nome: '',
        tipo: 'casa',
        endereco: '',
        area: '',
        padrao: 'medio',
        orcamento: '',
        valorCompra: '',
        dataInicio: '',
        dataTermino: '',
        observacoes: ''
      });
    }
  };

  const calcularProgresso = (orcamento: number, gasto: number) => {
    return (gasto / orcamento) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div style={{ width: 80, height: 80 }} className="flex items-center justify-center">
              <img
                src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png"
                alt="Logo"
                className="w-20 h-20 object-contain shadow-lg"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const fb = img.parentElement?.querySelector('.fallback') as HTMLElement | null;
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div className="fallback hidden w-20 h-20 flex items-center justify-center bg-white rounded shadow" aria-hidden>
                <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                  <text x="50" y="58" fontSize="12" textAnchor="middle" fill="#0ea5a4">LOGO</text>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-700">Obra Inteligente</h1>
              <p className="text-sm text-gray-600">Gestão de Projetos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* New image buttons: Contrato (placeholder), Planta, Calculadora */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => alert('Funcionalidade Contrato: em breve')}
                className="flex items-center justify-center w-12 h-12 bg-white rounded p-1 shadow hover:brightness-95"
                title="Contrato"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/assets/icon-contrato.svg" alt="Contrato" className="w-full h-full object-contain" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display='none'; const fb = img.parentElement?.querySelector('.fallback') as HTMLElement|null; if (fb) fb.classList.remove('hidden'); }} />
                  <div className="fallback hidden w-full h-full flex items-center justify-center" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                      <text x="50" y="58" fontSize="10" textAnchor="middle" fill="#0369a1">C</text>
                    </svg>
                  </div>
                </div>
              </button>
              <div className="text-xs text-blue-600 mt-1">Contrato</div>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  if (projetos && projetos.length > 0) {
                    navigate(`/projeto/${projetos[0].id}/planta`);
                  } else {
                    setShowModal(true);
                  }
                }}
                className="flex items-center justify-center w-12 h-12 bg-white rounded p-1 shadow hover:brightness-95"
                title="Planta"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/assets/icon-planta.svg" alt="Planta" className="w-full h-full object-contain" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display='none'; const fb = img.parentElement?.querySelector('.fallback') as HTMLElement|null; if (fb) fb.classList.remove('hidden'); }} />
                  <div className="fallback hidden w-full h-full flex items-center justify-center" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                      <text x="50" y="58" fontSize="10" textAnchor="middle" fill="#0369a1">P</text>
                    </svg>
                  </div>
                </div>
              </button>
              <div className="text-xs text-blue-600 mt-1">Planta</div>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={() => navigate('/calculadora')}
                className="flex items-center justify-center w-12 h-12 bg-white rounded p-1 shadow hover:brightness-95"
                title="Calculadora"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <img src="/assets/icon-calculadora.svg" alt="Calculadora" className="w-full h-full object-contain" onError={(e) => { const img = e.target as HTMLImageElement; img.style.display='none'; const fb = img.parentElement?.querySelector('.fallback') as HTMLElement|null; if (fb) fb.classList.remove('hidden'); }} />
                  <div className="fallback hidden w-full h-full flex items-center justify-center" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                      <text x="50" y="58" fontSize="10" textAnchor="middle" fill="#0369a1">=</text>
                    </svg>
                  </div>
                </div>
              </button>
              <div className="text-xs text-blue-600 mt-1">Calculadora</div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-logout-box-line text-lg"></i>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Título e Botão */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Minhas Obras</h2>
            <p className="text-gray-600 mt-1">Gerencie todos os seus projetos em um só lugar</p>
          </div>
          <button
            onClick={() => { setEditingProjectId(null); setNovoProjeto({ nome: '', tipo: 'casa', endereco: '', area: '', padrao: 'medio', orcamento: '', valorCompra: '', dataInicio: '', dataTermino: '', observacoes: '' }); setShowModal(true); }}
            className="flex items-center gap-2 bg-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors shadow-lg whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line text-xl"></i>
            Nova Obra
          </button>
        </div>
        {/* Grid de Projetos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projetos.map((projeto) => {
            const progresso = calcularProgresso(projeto.orcamento, projeto.gastoTotal);
            return (
              <div 
                key={projeto.id}
                onClick={() => navigate(`/projeto/${projeto.id}`)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{projeto.nome}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <i className="ri-building-line"></i>
                      <span className="capitalize">{projeto.tipo ? projeto.tipo.replace('-', ' ') : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProjectId(projeto.id); setNovoProjeto({
                        nome: projeto.nome ?? '',
                        tipo: projeto.tipo ?? 'casa',
                        endereco: projeto.endereco ?? '',
                        area: projeto.area ? String(projeto.area) : '',
                        padrao: projeto.padrao ?? 'medio',
                        orcamento: projeto.orcamento ? String(projeto.orcamento) : '',
                        valorCompra: projeto.valorCompra ? String(projeto.valorCompra) : '',
                        dataInicio: projeto.dataInicio ? projeto.dataInicio : '',
                        dataTermino: projeto.dataTermino ? projeto.dataTermino : '',
                        observacoes: projeto.observacoes ?? ''
                      }); setShowModal(true); }}
                      className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      title="Editar projeto"
                    >
                      <i className="ri-edit-line text-lg"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, id: projeto.id }); }}
                      className="w-8 h-8 flex items-center justify-center text-yellow-500 hover:text-yellow-600 transition-colors cursor-pointer"
                      title="Excluir projeto"
                    >
                      <i className="ri-delete-bin-line text-lg"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/projeto/${projeto.id}/planta`); }}
                      className="w-8 h-8 flex items-center justify-center text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
                      title="Planta"
                    >
                      <i className="ri-map-pin-2-line text-lg"></i>
                    </button>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      projeto.status === 'em-andamento' 
                        ? 'bg-orange-100 text-orange-700'
                        : projeto.status === 'concluido'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {projeto.status === 'em-andamento' ? 'Em Andamento' : 
                       projeto.status === 'concluido' ? 'Concluído' : 'Planejamento'}
                    </div>
                  </div>
                </div>

                {projeto.endereco && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <i className="ri-map-pin-line"></i>
                    <span>{projeto.endereco}</span>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Área</span>
                    <span className="font-semibold text-gray-800">{projeto.area} m²</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Padrão</span>
                    <span className="font-semibold text-gray-800 capitalize">{projeto.padrao}</span>
                  </div>
                </div>

                {/* Orçamento */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Orçamento</span>
                    <span className="text-sm font-semibold text-gray-800">
                      R$ {projeto.orcamento.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {projeto.valorCompra > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Valor do Bem</span>
                      <span className="text-sm font-semibold text-gray-800">
                        R$ {Number(projeto.valorCompra).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Gasto</span>
                    <span className="text-sm font-semibold text-teal-600">
                      R$ {projeto.gastoTotal.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        progresso > 100 ? 'bg-red-500' : 
                        progresso > 80 ? 'bg-orange-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {progresso.toFixed(1)}% utilizado
                    </span>
                    <span className={`text-xs font-semibold ${
                      progresso > 100 ? 'text-red-600' : 'text-gray-700'
                    }`}>
                      R$ {(projeto.orcamento - projeto.gastoTotal).toLocaleString('pt-BR')} restante
                    </span>
                  </div>

                  {/* Estimativa de patrimônio */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estimativa de Patrimônio</span>
                      <span className="text-sm font-semibold text-green-700">
                        R$ {(Number(projeto.valorCompra ?? 0) + Number(projeto.orcamento ?? 0)).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {projetos.length === 0 && (
          <div className="text-center py-16">
            <i className="ri-building-line text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma obra cadastrada</h3>
            <p className="text-gray-500 mb-6">Comece criando seu primeiro projeto</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              Criar Primeira Obra
            </button>
          </div>
        )}
      </div>

      {/* Modal Nova Obra */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Nova Obra</h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome da Obra *
                </label>
                <input
                  type="text"
                  required
                  value={novoProjeto.nome}
                  onChange={(e) => setNovoProjeto({...novoProjeto, nome: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Ex: Casa Residencial João Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Obra *
                  </label>
                  <select
                    value={novoProjeto.tipo}
                    onChange={(e) => setNovoProjeto({...novoProjeto, tipo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="casa">Casa</option>
                    <option value="sobrado">Sobrado</option>
                    <option value="kitnet">Kitnet</option>
                    <option value="sala-comercial">Sala Comercial</option>
                    <option value="reforma">Reforma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Padrão de Acabamento *
                  </label>
                  <select
                    value={novoProjeto.padrao}
                    onChange={(e) => setNovoProjeto({...novoProjeto, padrao: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="economico">Econômico</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={novoProjeto.endereco}
                  onChange={(e) => setNovoProjeto({...novoProjeto, endereco: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Área Total (m²) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={novoProjeto.area}
                    onChange={(e) => setNovoProjeto({...novoProjeto, area: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="150.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Orçamento Previsto (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={novoProjeto.orcamento}
                    onChange={(e) => setNovoProjeto({...novoProjeto, orcamento: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="250000.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valor do Imóvel / Terreno (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={novoProjeto.valorCompra}
                  onChange={(e) => setNovoProjeto({...novoProjeto, valorCompra: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Ex: 150000.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={novoProjeto.dataInicio}
                    onChange={(e) => setNovoProjeto({...novoProjeto, dataInicio: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Previsão de Término
                  </label>
                  <input
                    type="date"
                    value={novoProjeto.dataTermino}
                    onChange={(e) => setNovoProjeto({...novoProjeto, dataTermino: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={novoProjeto.observacoes}
                  onChange={(e) => setNovoProjeto({...novoProjeto, observacoes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                  placeholder="Informações adicionais sobre o projeto"
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Criar Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="bg-white rounded-lg shadow-xl p-6 z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Deseja Realmente exlcuir este projeto</h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, id: null })}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!deleteModal.id) return setDeleteModal({ open: false, id: null });
                  const { error } = await supabase.from('projetos').delete().eq('id', deleteModal.id);
                  if (error) {
                    console.error(error);
                    alert('Erro ao excluir projeto');
                    setDeleteModal({ open: false, id: null });
                    return;
                  }
                  setProjetos(prev => prev.filter(p => p.id !== deleteModal.id));
                  setDeleteModal({ open: false, id: null });
                }}
                className="px-4 py-2 rounded-lg bg-yellow-400 text-white hover:bg-yellow-500"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}