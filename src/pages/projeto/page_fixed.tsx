import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ProjetoDetalhesFixed() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [projeto, setProjeto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem('user');
    if (!stored) return navigate('/');
    const u = JSON.parse(stored);

    (async () => {
      setLoading(true);
      const { data: proj } = await supabase
        .from('projetos')
        .select('id, nome, orcamento')
        .eq('id', id)
        .eq('owner', u.id)
        .single();
      setProjeto(proj || null);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (!id) return null;
  if (!projeto && loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!projeto) return <div className="min-h-screen flex items-center justify-center">Projeto não encontrado</div>;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold">{projeto.nome ?? '—'}</h1>
        <p className="text-sm text-gray-600">Orçamento: R$ {Number(projeto?.orcamento ?? 0).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
