import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockProjetos } from '../../mocks/projetos';

export default function Projetos() {
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState(mockProjetos);
  const [showModal, setShowModal] = useState(false);
  const [novoProjeto, setNovoProjeto] = useState({
    nome: '',
    tipo: 'casa',
    endereco: '',
    area: '',
    padrao: 'medio',
    orcamento: '',
    dataInicio: '',
    dataTermino: '',
    observacoes: ''
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projeto = {
      id: Date.now().toString(),
      ...novoProjeto,
      area: parseFloat(novoProjeto.area),
      orcamento: parseFloat(novoProjeto.orcamento),
      gastoTotal: 0,
      status: 'em-andamento'
    };
    setProjetos([...projetos, projeto]);
    setShowModal(false);
    setNovoProjeto({
      nome: '',
      tipo: 'casa',
      endereco: '',
      area: '',
      padrao: 'medio',
      orcamento: '',
      dataInicio: '',
      dataTermino: '',
      observacoes: ''
    });
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
            <img 
              src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png" 
              alt="Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-blue-700">Obra Inteligente</h1>
              <p className="text-sm text-gray-600">Gestão de Projetos</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-logout-box-line text-lg"></i>
            Sair
          </button>
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
            onClick={() => setShowModal(true)}
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
                      <span className="capitalize">{projeto.tipo.replace('-', ' ')}</span>
                    </div>
                  </div>
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
    </div>
  );
}