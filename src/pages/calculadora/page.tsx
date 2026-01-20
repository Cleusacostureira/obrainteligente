import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockProjetos } from '../../mocks/projetos';
import { coeficientesMateriais, tabelaPrecos } from '../../mocks/materiais';

export default function Calculadora() {
  const { id } = useParams();
  const navigate = useNavigate();
  const projeto = mockProjetos.find(p => p.id === id);

  const [modoCalculo, setModoCalculo] = useState<'simples' | 'avancado'>('simples');
  const [areaTotal, setAreaTotal] = useState(projeto?.area.toString() || '');
  const [comodos, setComodos] = useState([
    { id: '1', nome: '', largura: '', comprimento: '', altura: '2.70' }
  ]);
  const [resultado, setResultado] = useState<any>(null);
  const [precos, setPrecos] = useState(tabelaPrecos);

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

  const adicionarComodo = () => {
    setComodos([...comodos, {
      id: Date.now().toString(),
      nome: '',
      largura: '',
      comprimento: '',
      altura: '2.70'
    }]);
  };

  const removerComodo = (id: string) => {
    if (comodos.length > 1) {
      setComodos(comodos.filter(c => c.id !== id));
    }
  };

  const atualizarComodo = (id: string, campo: string, valor: string) => {
    setComodos(comodos.map(c => c.id === id ? { ...c, [campo]: valor } : c));
  };

  const calcularAreaTotal = () => {
    if (modoCalculo === 'simples') {
      return parseFloat(areaTotal) || 0;
    } else {
      return comodos.reduce((total, comodo) => {
        const largura = parseFloat(comodo.largura) || 0;
        const comprimento = parseFloat(comodo.comprimento) || 0;
        return total + (largura * comprimento);
      }, 0);
    }
  };

  const calcularMateriais = () => {
    const area = calcularAreaTotal();
    if (area === 0) {
      alert('Por favor, informe a área da construção');
      return;
    }

    const coef = coeficientesMateriais[projeto.tipo]?.[projeto.padrao] || coeficientesMateriais.casa.medio;

    const materiais = [
      {
        nome: 'Areia Grossa',
        unidade: 'm³',
        quantidade: area * coef.areiaGrossa,
        valorUnitario: precos.areiaGrossa,
        valorTotal: area * coef.areiaGrossa * precos.areiaGrossa
      },
      {
        nome: 'Areia Fina',
        unidade: 'm³',
        quantidade: area * coef.areiaFina,
        valorUnitario: precos.areiaFina,
        valorTotal: area * coef.areiaFina * precos.areiaFina
      },
      {
        nome: 'Pedra Brita',
        unidade: 'm³',
        quantidade: area * coef.pedraBrita,
        valorUnitario: precos.pedraBrita,
        valorTotal: area * coef.pedraBrita * precos.pedraBrita
      },
      {
        nome: 'Cimento (Estrutura)',
        unidade: 'saco 50kg',
        quantidade: area * coef.cimentoEstrutura,
        valorUnitario: precos.cimento,
        valorTotal: area * coef.cimentoEstrutura * precos.cimento
      },
      {
        nome: 'Cimento (Assentamento/Reboco)',
        unidade: 'saco 50kg',
        quantidade: area * coef.cimentoAcabamento,
        valorUnitario: precos.cimento,
        valorTotal: area * coef.cimentoAcabamento * precos.cimento
      },
      {
        nome: 'Tijolos',
        unidade: 'unidade',
        quantidade: area * coef.tijolos,
        valorUnitario: precos.tijolo,
        valorTotal: area * coef.tijolos * precos.tijolo
      }
    ];

    const totalMateriais = materiais.reduce((sum, m) => sum + m.valorTotal, 0);
    const custoPorM2 = totalMateriais / area;

    setResultado({
      area,
      materiais,
      totalMateriais,
      custoPorM2
    });
  };

  const adicionarAoOrcamento = () => {
    alert('Materiais adicionados ao orçamento do projeto com sucesso!');
    navigate(`/projeto/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/projeto/${id}`)}
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
              <h1 className="text-xl font-bold text-gray-800">Calculadora de Materiais</h1>
              <p className="text-sm text-gray-600">{projeto.nome}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Entrada */}
          <div className="lg:col-span-2 space-y-6">
            {/* Modo de Cálculo */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Modo de Cálculo</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setModoCalculo('simples')}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    modoCalculo === 'simples'
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="ri-home-4-line text-lg mr-2"></i>
                  Simples
                </button>
                <button
                  onClick={() => setModoCalculo('avancado')}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    modoCalculo === 'avancado'
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <i className="ri-stack-line text-lg mr-2"></i>
                  Avançado
                </button>
              </div>
            </div>

            {/* Modo Simples */}
            {modoCalculo === 'simples' && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Área Total</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Área da Construção (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={areaTotal}
                      onChange={(e) => setAreaTotal(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      placeholder="Ex: 150.00"
                    />
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <i className="ri-information-line text-teal-600 text-xl mt-0.5"></i>
                      <div className="text-sm text-teal-800">
                        <p className="font-semibold mb-1">Informação</p>
                        <p>Tipo: <strong>{projeto.tipo.replace('-', ' ')}</strong></p>
                        <p>Padrão: <strong className="capitalize">{projeto.padrao}</strong></p>
                        <p className="text-xs mt-2 opacity-80">Os valores são estimativas médias de mercado baseadas no tipo e padrão da obra.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modo Avançado */}
            {modoCalculo === 'avancado' && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Cômodos</h3>
                  <button
                    onClick={adicionarComodo}
                    className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition-colors text-sm whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-add-line text-lg"></i>
                    Adicionar
                  </button>
                </div>

                <div className="space-y-4">
                  {comodos.map((comodo, index) => (
                    <div key={comodo.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Cômodo {index + 1}</span>
                        {comodos.length > 1 && (
                          <button
                            onClick={() => removerComodo(comodo.id)}
                            className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={comodo.nome}
                            onChange={(e) => atualizarComodo(comodo.id, 'nome', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Nome do cômodo"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            value={comodo.largura}
                            onChange={(e) => atualizarComodo(comodo.id, 'largura', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Largura (m)"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            value={comodo.comprimento}
                            onChange={(e) => atualizarComodo(comodo.id, 'comprimento', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Comprimento (m)"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            value={comodo.altura}
                            onChange={(e) => atualizarComodo(comodo.id, 'altura', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            placeholder="Altura (m)"
                          />
                        </div>
                        <div className="col-span-4 text-right text-sm text-gray-600">
                          Área: <strong className="text-gray-800">
                            {((parseFloat(comodo.largura) || 0) * (parseFloat(comodo.comprimento) || 0)).toFixed(2)} m²
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-teal-800">Área Total Calculada:</span>
                      <span className="text-lg font-bold text-teal-800">
                        {calcularAreaTotal().toFixed(2)} m²
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Preços */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Tabela de Preços (Editável)</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Areia Grossa (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={precos.areiaGrossa}
                      onChange={(e) => setPrecos({...precos, areiaGrossa: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Areia Fina (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={precos.areiaFina}
                      onChange={(e) => setPrecos({...precos, areiaFina: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pedra Brita (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={precos.pedraBrita}
                      onChange={(e) => setPrecos({...precos, pedraBrita: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cimento (saco 50kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={precos.cimento}
                      onChange={(e) => setPrecos({...precos, cimento: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tijolo (unidade)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={precos.tijolo}
                      onChange={(e) => setPrecos({...precos, tijolo: parseFloat(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={calcularMateriais}
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg whitespace-nowrap cursor-pointer"
            >
              <i className="ri-calculator-line text-2xl mr-2"></i>
              Calcular Materiais
            </button>
          </div>

          {/* Painel de Resultados */}
          <div className="lg:col-span-1">
            {resultado ? (
              <div className="space-y-6 sticky top-4">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Área Total</span>
                      <span className="text-sm font-bold text-gray-800">{resultado.area.toFixed(2)} m²</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">Custo por m²</span>
                      <span className="text-sm font-bold text-teal-600">
                        R$ {resultado.custoPorM2.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Total Estimado</span>
                      <span className="text-xl font-bold text-gray-800">
                        R$ {resultado.totalMateriais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Materiais</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {resultado.materiais.map((material: any, index: number) => (
                      <div key={index} className="border-b pb-3">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{material.nome}</span>
                          <span className="text-sm font-bold text-teal-600">
                            R$ {material.valorTotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{material.quantidade.toFixed(2)} {material.unidade}</span>
                          <span>R$ {material.valorUnitario.toFixed(2)}/{material.unidade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={adicionarAoOrcamento}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-circle-line text-xl mr-2"></i>
                  Adicionar ao Orçamento
                </button>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <i className="ri-alert-line text-orange-600 text-lg mt-0.5"></i>
                    <p className="text-xs text-orange-800">
                      <strong>Atenção:</strong> Os valores são estimativas médias de mercado. 
                      Podem variar conforme região, fornecedor e especificações técnicas.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center sticky top-4">
                <i className="ri-calculator-line text-6xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Aguardando Cálculo</h3>
                <p className="text-sm text-gray-600">
                  Preencha as informações e clique em "Calcular Materiais" para ver os resultados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}