import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function NovoCusto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/');
      return;
    }
    const u = JSON.parse(stored);
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('projetos').select('*').eq('id', id).eq('owner', u.id).single();
      if (error) console.error(error);
      setProjeto(data || null);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    categoria: 'materiais',
    descricao: '',
    quantidade: '',
    valorUnitario: '',
    formaPagamento: 'a-vista',
    observacoes: ''
  });

  const categorias = [
    { value: 'materiais', label: 'Materiais', icon: 'ri-box-3-line' },
    { value: 'mao-de-obra', label: 'Mão de Obra', icon: 'ri-team-line' },
    { value: 'estrutura', label: 'Estrutura', icon: 'ri-building-2-line' },
    { value: 'eletrica', label: 'Elétrica', icon: 'ri-flashlight-line' },
    { value: 'hidraulica', label: 'Hidráulica', icon: 'ri-drop-line' },
    { value: 'acabamento', label: 'Acabamento', icon: 'ri-paint-brush-line' },
    { value: 'servicos-terceiros', label: 'Serviços Terceiros', icon: 'ri-service-line' },
    { value: 'outros', label: 'Outros', icon: 'ri-more-line' }
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto) return alert('Projeto não encontrado');
    const valorTotal = parseFloat(formData.quantidade) * parseFloat(formData.valorUnitario);
    const stored = localStorage.getItem('user');
    if (!stored) return navigate('/');
    const u = JSON.parse(stored);
    const custo = {
      projeto_id: id,
      data: formData.data,
      categoria: formData.categoria,
      descricao: formData.descricao,
      quantidade: parseFloat(formData.quantidade),
      valor_unitario: parseFloat(formData.valorUnitario),
      valor_total: valorTotal,
      forma_pagamento: formData.formaPagamento,
    };
    const { data, error } = await supabase.from('custos').insert([custo]).select();
    if (error) {
      console.error(error);
      alert('Erro ao lançar custo');
      return;
    }
    alert(`Custo lançado com sucesso!\nValor Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    navigate(`/projeto/${id}`);
  };

  const calcularValorTotal = () => {
    const quantidade = parseFloat(formData.quantidade) || 0;
    const valorUnitario = parseFloat(formData.valorUnitario) || 0;
    return quantidade * valorUnitario;
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
              <h1 className="text-xl font-bold text-gray-800">Novo Lançamento de Custo</h1>
              <p className="text-sm text-gray-600">{projeto.nome}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Principal */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Informações do Custo</h2>

            <div className="space-y-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Categoria *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categorias.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({...formData, categoria: cat.value})}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        formData.categoria === cat.value
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <i className={`${cat.icon} text-2xl`}></i>
                      <span className="text-xs font-medium text-center whitespace-nowrap">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição do Item *
                </label>
                <input
                  type="text"
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Ex: Cimento CP-II 50kg"
                />
              </div>

              {/* Quantidade e Valor Unitário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.valorUnitario}
                    onChange={(e) => setFormData({...formData, valorUnitario: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="32.50"
                  />
                </div>
              </div>

              {/* Valor Total */}
              <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-teal-800">Valor Total:</span>
                  <span className="text-2xl font-bold text-teal-800">
                    R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Forma de Pagamento *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, formaPagamento: 'a-vista'})}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-semibold transition-all cursor-pointer ${
                      formData.formaPagamento === 'a-vista'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <i className="ri-money-dollar-circle-line text-xl"></i>
                    À Vista
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, formaPagamento: 'parcelado'})}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-semibold transition-all cursor-pointer ${
                      formData.formaPagamento === 'parcelado'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <i className="ri-calendar-check-line text-xl"></i>
                    Parcelado
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                  placeholder="Informações adicionais sobre este custo..."
                ></textarea>
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.observacoes.length}/500 caracteres
                </div>
              </div>

              {/* Foto da Nota Fiscal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Foto da Nota Fiscal (Opcional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  <i className="ri-image-add-line text-4xl text-gray-400 mb-2"></i>
                  <p className="text-sm text-gray-600 mb-1">Clique para adicionar foto</p>
                  <p className="text-xs text-gray-500">PNG, JPG ou PDF até 5MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo do Orçamento */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Impacto no Orçamento</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Orçamento Total</span>
                <span className="text-sm font-semibold text-gray-800">
                  R$ {projeto.orcamento.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Já Gasto</span>
                <span className="text-sm font-semibold text-gray-800">
                  R$ {projeto.gastoTotal.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Novo Lançamento</span>
                <span className="text-sm font-semibold text-teal-600">
                  + R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-gray-800">Saldo Restante</span>
                <span className={`text-lg font-bold ${
                  (projeto.orcamento - projeto.gastoTotal - calcularValorTotal()) < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  R$ {(projeto.orcamento - projeto.gastoTotal - calcularValorTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {(projeto.orcamento - projeto.gastoTotal - calcularValorTotal()) < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <i className="ri-error-warning-line text-red-600 text-xl mt-0.5"></i>
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">⚠️ Alerta de Orçamento</p>
                    <p>Este lançamento fará com que o orçamento seja ultrapassado em R$ {Math.abs(projeto.orcamento - projeto.gastoTotal - calcularValorTotal()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/projeto/${id}`)}
              className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-lg whitespace-nowrap cursor-pointer"
            >
              Lançar Custo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}