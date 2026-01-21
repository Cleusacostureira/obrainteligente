import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Bem-vindo ao Obra Inteligente</h1>
      <p className="text-gray-600 mb-8">Use a Calculadora para simular custos por m² antes de lançar no projeto.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-2">Calculadora de Materiais (Simulador)</h2>
          <p className="text-sm text-gray-600 mb-4">Simule materiais e custos sem estar dentro de um projeto.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/calculadora')} className="px-4 py-2 bg-teal-500 text-white rounded-lg">Abrir Calculadora</button>
            <button onClick={() => navigate('/projetos')} className="px-4 py-2 border rounded-lg">Ver Projetos</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-2">Ações Rápidas</h2>
          <p className="text-sm text-gray-600 mb-4">Crie novo projeto ou importe precos iniciais.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/projetos')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Minhas Obras</button>
            <button onClick={() => navigate('/projetos')} className="px-4 py-2 border rounded-lg">Criar Obra</button>
          </div>
        </div>
      </div>
    </div>
  );
}