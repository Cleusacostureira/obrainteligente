import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function NovoCusto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const editingCustoId = query.get('custoId');
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
      const normalizeProjeto = (p: any) => ({
        ...p,
        area: p.area ?? p.area,
        orcamento: typeof p.orcamento === 'number' ? p.orcamento : (p.orcamento ?? 0),
        valorCompra: p.valor_compra ?? p.valorCompra ?? 0,
        gastoTotal: p.gasto_total ?? p.gastoTotal ?? 0,
        dataInicio: p.data_inicio ?? p.dataInicio ?? null,
        dataTermino: p.data_termino ?? p.dataTermino ?? null
      });
      setProjeto(data ? normalizeProjeto(data) : null);
      // if editing, load custo data
      if (editingCustoId) {
        const { data: custoData, error: custoErr } = await supabase.from('custos').select('*').eq('id', editingCustoId).single();
        if (custoErr) console.error(custoErr);
        if (custoData) {
          setFormData({
            data: custoData.data ?? new Date().toISOString().split('T')[0],
            categoria: custoData.categoria ?? 'materiais',
            descricao: custoData.descricao ?? '',
            quantidade: String(custoData.quantidade ?? ''),
            valorUnitario: String(custoData.valor_unitario ?? ''),
            valorTotal: String(custoData.valor_total ?? custoData.valorTotal ?? ''),
            formaPagamento: custoData.forma_pagamento ?? 'a-vista',
            observacoes: custoData.observacoes ?? ''
          });
        }
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    categoria: 'materiais',
    descricao: '',
    unidade: '',
    quantidade: '',
    valorUnitario: '',
    valorTotal: '',
    parcelas: '1',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cartao',
    formaPagamento: 'a-vista',
    observacoes: ''
  });

  // Pre-cadastrados por categoria (nome e unidade) — atualizado com lista do produto
  const MATERIALS: Record<string, Array<{ name: string; unit: string; tipo?: string; calculavel?: boolean }>> = {
    materiais: [
      { name: 'Cimento CP II / CP III', unit: 'saco 50kg', tipo: 'material', calculavel: true },
      { name: 'Cal hidratada', unit: 'saco', tipo: 'material', calculavel: true },
      { name: 'Areia fina', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Areia grossa', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Pedra brita 0', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Pedra brita 1', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Pedra brita 2', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Tijolo cerâmico 8 furos', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Tijolo maciço', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Bloco de concreto', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Argamassa comum', unit: 'saco', tipo: 'material', calculavel: true },
      { name: 'Rejunte', unit: 'kg', tipo: 'material', calculavel: true },
      { name: 'Impermeabilizante', unit: 'litro', tipo: 'material', calculavel: true },
      { name: 'Lona plástica', unit: 'metro', tipo: 'material', calculavel: false }
    ],
    'mao-de-obra': [
      { name: 'Pedreiro', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Servente', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Mestre de obras', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Eletricista', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Encanador', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Pintor', unit: 'diária', tipo: 'servico', calculavel: false },
      { name: 'Azulejista', unit: 'diária', tipo: 'servico', calculavel: false }
    ],
    estrutura: [
      { name: 'Vergalhão CA-50', unit: 'barra', tipo: 'material', calculavel: true },
      { name: 'Vergalhão CA-60', unit: 'barra', tipo: 'material', calculavel: true },
      { name: 'Estribo pronto', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Malha POP', unit: 'painel', tipo: 'material', calculavel: true },
      { name: 'Concreto usinado', unit: 'm³', tipo: 'material', calculavel: true },
      { name: 'Broca de concreto', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Sapata pré-moldada', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Viga baldrame', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Aditivo para concreto', unit: 'litro', tipo: 'material', calculavel: true },
      { name: 'Forma de madeira', unit: 'm²', tipo: 'material', calculavel: false }
    ],
    eletrica: [
      { name: 'Fio 1,5 mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Fio 2,5 mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Fio 4,0 mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Fio 6,0 mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Cabo PP', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Conduíte corrugado', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Conduíte rígido', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Caixa 4x2', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Caixa 4x4', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Interruptor simples', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Interruptor duplo', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Tomada 10A', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Tomada 20A', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Disjuntor mono', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Disjuntor bi', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Quadro de distribuição', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Lâmpada LED', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Luminária', unit: 'unidade', tipo: 'material', calculavel: false }
    ],
    hidraulica: [
      { name: 'Tubo PVC soldável 20mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Tubo PVC soldável 25mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Tubo PVC soldável 32mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Tubo PVC esgoto 40mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Tubo PVC esgoto 50mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Tubo PVC esgoto 100mm', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Joelho PVC', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Tê PVC', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Registro de gaveta', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Registro de pressão', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Caixa sifonada', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Ralo', unit: 'unidade', tipo: 'material', calculavel: true },
      { name: 'Caixa d’água', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Boia caixa d’água', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Cola PVC', unit: 'tubo', tipo: 'material', calculavel: false },
      { name: 'Fita veda rosca', unit: 'unidade', tipo: 'material', calculavel: false }
    ],
    acabamento: [
      { name: 'Piso cerâmico', unit: 'm²', tipo: 'material', calculavel: true },
      { name: 'Porcelanato', unit: 'm²', tipo: 'material', calculavel: true },
      { name: 'Azulejo parede', unit: 'm²', tipo: 'material', calculavel: true },
      { name: 'Rodapé cerâmico', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Rodapé MDF', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Porta madeira', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Porta alumínio', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Porta de correr', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Janela alumínio', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Janela vidro/blindex', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Soleira granito', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Peitoril granito', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Bancada granito', unit: 'metro', tipo: 'material', calculavel: true },
      { name: 'Guarnição', unit: 'metro', tipo: 'material', calculavel: false }
    ],
    'servicos-terceiros': [
      { name: 'Reboco', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Chapisco', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Assentamento piso', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Assentamento azulejo', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Pintura interna', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Pintura externa', unit: 'm²', tipo: 'servico', calculavel: true },
      { name: 'Instalação elétrica', unit: 'ponto', tipo: 'servico', calculavel: true },
      { name: 'Instalação hidráulica', unit: 'ponto', tipo: 'servico', calculavel: true },
      { name: 'Instalação portas/janelas', unit: 'unidade', tipo: 'servico', calculavel: false }
    ],
    outros: [
      { name: 'Parafuso', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Prego', unit: 'kg', tipo: 'material', calculavel: false },
      { name: 'Bucha', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Silicone', unit: 'tubo', tipo: 'material', calculavel: false },
      { name: 'Cola PU', unit: 'tubo', tipo: 'material', calculavel: false },
      { name: 'Espuma expansiva', unit: 'lata', tipo: 'material', calculavel: false },
      { name: 'Abraçadeira', unit: 'unidade', tipo: 'material', calculavel: false },
      { name: 'Arame recozido', unit: 'kg', tipo: 'material', calculavel: false }
    ]
  };

  const getOptionsForCategory = (cat: string) => MATERIALS[cat] || [];

  const lookupUnit = (cat: string, name: string) => {
    const found = getOptionsForCategory(cat).find(m => m.name === name);
    if (found) return found.unit;
    // check user-added materials
    const stored = localStorage.getItem('user_materials');
    if (stored) {
      try {
        const userM: Array<any> = JSON.parse(stored);
        const ufound = userM.find((m) => m.category === cat && m.name === name);
        if (ufound) return ufound.unit || '';
      } catch (e) {
        console.error('failed parsing user_materials', e);
      }
    }
    return '';
  };

  // user-added materials state and helpers
  const [userMaterials, setUserMaterials] = useState<Array<any>>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: formData.categoria, unit: '', tipo: 'material', calculavel: true });
  const [modalStep, setModalStep] = useState<'choose-category' | 'fill'>('choose-category');
  const [modalGasto, setModalGasto] = useState<number | null>(null);
  const [lastEdited, setLastEdited] = useState<'unitario' | 'total' | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const descRef = useRef<HTMLInputElement | null>(null);

  const [pendingItems, setPendingItems] = useState<Array<any>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user_materials');
    if (raw) {
      try {
        setUserMaterials(JSON.parse(raw));
      } catch (e) {
        console.error('error parsing user_materials', e);
      }
    }
  }, []);

  useEffect(() => {
    if (id) fetchProjectGasto();
  }, [id]);

  useEffect(() => {
    if (!showNewModal) return;
    fetchProjectGasto().then((v) => setModalGasto(v)).catch((e) => { console.error('modal fetch error', e); setModalGasto(0); });
  }, [showNewModal, id]);

  const saveUserMaterials = (arr: Array<any>) => {
    try {
      localStorage.setItem('user_materials', JSON.stringify(arr));
      setUserMaterials(arr);
    } catch (e) {
      console.error('failed saving user materials', e);
    }
  };

  const getMergedOptionsForCategory = (cat: string) => {
    const base = MATERIALS[cat] || [];
    const user = userMaterials.filter((m) => m.category === cat).map((m) => ({ name: m.name, unit: m.unit }));
    // dedupe by name
    const map = new Map<string, { name: string; unit: string }>();
    [...base, ...user].forEach((m) => map.set(m.name, m));
    return Array.from(map.values());
  };

  const parseNumber = (v: string | number | undefined | null) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).trim();
    // remove thousand separators (dots) and convert comma decimals to dot
    const cleaned = s.replace(/\./g, '').replace(/,/g, '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocalDate = (s: string | Date) => {
    if (!s) return new Date();
    if (s instanceof Date) return s;
    const parts = String(s).split('-');
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
    return new Date(s);
  };

  const addPendingItem = () => {
    if (!formData.descricao) return alert('Preencha a descrição do item');
    // compute unit/total according to lastEdited or inputs
    const quantidadeNum = parseNumber(formData.quantidade);
    let valorUnitarioNum = parseNumber(formData.valorUnitario);
    let valorTotalNum = parseNumber(formData.valorTotal) || (quantidadeNum * valorUnitarioNum);
    if (lastEdited === 'total' && quantidadeNum > 0) {
      valorUnitarioNum = valorTotalNum / quantidadeNum;
    } else {
      valorTotalNum = quantidadeNum * valorUnitarioNum;
    }

    const parcelasNum = Math.max(1, parseInt(String(formData.parcelas || '1')) || 1);
    const purchaseDateRaw = formData.purchaseDate || formData.data;
    const purchaseDate = formatLocalDate(parseLocalDate(purchaseDateRaw));
    const paymentMethod = formData.formaPagamento === 'a-vista' ? 'avista' : formData.paymentMethod;
    const todayStr = formatLocalDate(new Date());

    const itemsToAdd: Array<any> = [];
    if (parcelasNum <= 1) {
      const item = {
        data: purchaseDate,
        categoria: formData.categoria,
        descricao: formData.descricao,
        unidade: formData.unidade,
        quantidade: quantidadeNum,
        valorUnitario: valorUnitarioNum,
        valorTotal: valorTotalNum,
        formaPagamento: formData.formaPagamento,
        observacoes: formData.observacoes,
        paymentMeta: { method: paymentMethod, parcelas: parcelasNum, parcelaIndex: 1 },
        pago: paymentMethod === 'avista' || (paymentMethod === 'cartao' && purchaseDate <= todayStr)
      };
      itemsToAdd.push(item);
    } else {
      // split total equally among parcelas (last gets remainder)
      const base = Math.round((valorTotalNum / parcelasNum) * 100) / 100;
      let acc = 0;
      for (let i = 1; i <= parcelasNum; i++) {
        const isLast = i === parcelasNum;
        const parcelaTotal = isLast ? Math.round((valorTotalNum - acc) * 100) / 100 : base;
        acc += parcelaTotal;
        const installmentDate = (() => {
          const d = parseLocalDate(purchaseDateRaw);
          d.setDate(d.getDate() + 30 * (i - 1));
          return formatLocalDate(d);
        })();
        const item = {
          data: installmentDate,
          categoria: formData.categoria,
          descricao: `${formData.descricao} (Parcela ${i}/${parcelasNum})`,
          unidade: formData.unidade,
          quantidade: quantidadeNum,
          valorUnitario: parcelaTotal / (quantidadeNum || 1),
          valorTotal: parcelaTotal,
          formaPagamento: formData.formaPagamento,
          observacoes: formData.observacoes,
          paymentMeta: { method: paymentMethod, parcelas: parcelasNum, parcelaIndex: i },
          pago: paymentMethod === 'avista' || (paymentMethod === 'cartao' && installmentDate <= todayStr)
        };
        itemsToAdd.push(item);
      }
    }

    setPendingItems(prev => [...prev, ...itemsToAdd]);
    setFormData({...formData, descricao: '', unidade: '', quantidade: '', valorUnitario: '', valorTotal: '', parcelas: '1', observacoes: ''});
  };

  const removePendingItem = (idx: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (f?: FileList | null) => {
    const file = f && f.length ? f[0] : null;
    setSelectedFile(file);
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } catch (e) {
        console.error(e);
      }
    } else {
      setPreviewUrl(null);
    }
  };

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

  const [fetchedGasto, setFetchedGasto] = useState<number | null>(null);

  const fetchProjectGasto = async (): Promise<number> => {
    try {
      const { data: rows, error } = await supabase.from('custos').select('valor_total').eq('projeto_id', id);
      if (error) throw error;
      let sumVal = 0;
      if (rows && rows.length) {
        sumVal = rows.reduce((s: number, r: any) => s + (Number(r.valor_total) || 0), 0);
      }
      setFetchedGasto(isNaN(sumVal) ? 0 : sumVal);
      return isNaN(sumVal) ? 0 : sumVal;
    } catch (e) {
      console.error('error fetching project gasto', e);
      setFetchedGasto(0);
      return 0;
    }
  };

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
    const valorTotal = calcularValorTotal();
    const stored = localStorage.getItem('user');
    if (!stored) return navigate('/');
    const u = JSON.parse(stored);
    const buildCusto = (fd: any) => {
      const quantidadeN = parseNumber(fd.quantidade);
      const valorTotalN = parseNumber(fd.valorTotal) || (quantidadeN * parseNumber(fd.valorUnitario));
      const valorUnitarioN = parseNumber(fd.valorUnitario) || (quantidadeN > 0 ? (valorTotalN / quantidadeN) : 0);
      return {
        projeto_id: id,
        data: fd.data,
        categoria: fd.categoria,
        descricao: fd.descricao,
        quantidade: quantidadeN,
        valor_unitario: valorUnitarioN,
        valor_total: valorTotalN,
        forma_pagamento: fd.formaPagamento,
      };
    };

    if (editingCustoId) {
      const custo = buildCusto(formData);
      const { data, error } = await supabase.from('custos').update(custo).eq('id', editingCustoId).select();
      if (error) {
        console.error(error);
        alert('Erro ao atualizar lançamento');
        return;
      }
      alert(`Lançamento atualizado com sucesso!\nValor Total: R$ ${custo.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      navigate(`/projeto/${id}`);
    } else {
      // If there are pendingItems, insert all; otherwise insert the current form
      // Validate only when there are no pending items (allow submit if at least one pending item exists)
      if (pendingItems.length === 0) {
        if (!formData.descricao) {
          alert('Preencha a descrição do item');
          return;
        }
        const qn = parseNumber(formData.quantidade);
        const vu = parseNumber(formData.valorUnitario);
        const vt = parseNumber(formData.valorTotal);
        if (qn <= 0 && vt <= 0) {
          alert('Preencha a quantidade ou o valor total');
          return;
        }
        if (vu <= 0 && vt <= 0) {
          alert('Preencha o valor unitário ou o valor total');
          return;
        }
      }
        // attach payment metadata into observacoes for each insert
        // Observations column may not exist in the DB schema; omit it from payload to avoid PostgREST errors.
        const toInsert = pendingItems.length > 0 ? pendingItems.map((it) => ({
          ...buildCusto(it),
          data: it.data,
          descricao: it.descricao,
          observacoes: it.observacoes
        })) : [{
          ...buildCusto(formData),
          observacoes: formData.observacoes
        }];
      const { data, error } = await supabase.from('custos').insert(toInsert).select();
      if (error) {
        console.error(error);
        alert('Erro ao lançar custo');
        return;
      }
      // Recalculate project gasto_total and update projetos table so dashboard shows updated totals
      try {
        // Fetch all custo rows and sum client-side (avoid aggregate call that can fail on some PostgREST configs)
        try {
          const { data: allCosts, error: allErr } = await supabase.from('custos').select('valor_total').eq('projeto_id', id);
          if (allErr) {
            console.error('failed getting custos rows for sum', allErr);
          } else if (allCosts) {
            const sum = allCosts.reduce((s: number, r: any) => s + (Number(r.valor_total) || 0), 0);
            const { error: upErr } = await supabase.from('projetos').update({ gasto_total: sum }).eq('id', id);
            if (upErr) console.error('failed updating projeto gasto_total', upErr);
          }
        } catch (e) {
          console.error('error summing custos rows', e);
        }
      } catch (e) {
        console.error('failed recalculating gasto_total', e);
      }
        // refresh local fetchedGasto so UI shows updated value
        try { await fetchProjectGasto(); } catch (e) { /* ignore */ }
      const totalAll = toInsert.reduce((s, c) => s + (c.valor_total || 0), 0);
      alert(`Custo(s) lançado(s) com sucesso!\nValor Total: R$ ${totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      navigate(`/projeto/${id}`);
    }
  };

  const calcularValorTotal = () => {
    const q = parseNumber(formData.quantidade);
    if (formData.valorTotal && formData.valorTotal !== '') return parseNumber(formData.valorTotal);
    return q * parseNumber(formData.valorUnitario);
  };

  const sumPendingTotal = pendingItems.reduce((s, it) => s + ((it.quantidade || 0) * (it.valorUnitario || 0)), 0);
  const newLaunchTotal = sumPendingTotal + calcularValorTotal();

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
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png"
                alt="Logo"
                className="w-10 h-10 object-contain"
                onError={(e) => { const img = e.target as HTMLImageElement; img.style.display='none'; const fb = img.parentElement?.querySelector('.fallback') as HTMLElement|null; if (fb) fb.classList.remove('hidden'); }}
              />
              <div className="fallback hidden w-10 h-10 flex items-center justify-center" aria-hidden>
                <svg width="36" height="36" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                  <text x="50" y="58" fontSize="10" textAnchor="middle" fill="#0369a1">LOGO</text>
                </svg>
              </div>
            </div>
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
                      onClick={() => {
                        setFormData({...formData, categoria: cat.value});
                        // open suggestions and focus description
                        setShowSuggestions(true);
                        setTimeout(() => descRef.current?.focus(), 50);
                      }}
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
                <div className="flex gap-3 items-center">
                  <input
                    ref={(el) => { descRef.current = el; }}
                    list="material-options"
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, descricao: val, unidade: lookupUnit(formData.categoria, val)});
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="Ex: Cimento CP-II 50kg"
                  />
                  <div className="text-sm text-gray-600">{formData.unidade ? formData.unidade : 'unidade'}</div>
                </div>
                <datalist id="material-options">
                  {getMergedOptionsForCategory(formData.categoria).map((m) => (
                    <option key={m.name} value={m.name} />
                  ))}
                </datalist>
                {showSuggestions && (
                  <div className="mt-2 border rounded bg-white shadow-sm max-h-56 overflow-auto">
                    {getMergedOptionsForCategory(formData.categoria).map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); }}
                        onClick={() => {
                          setFormData(fd => ({...fd, descricao: opt.name, unidade: opt.unit}));
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <div className="font-medium">{opt.name}</div>
                        <div className="text-xs text-gray-500">{opt.unit}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Selecione um material da lista ou digite um novo para cadastrar.</div>
                {formData.descricao && !getMergedOptionsForCategory(formData.categoria).some(o => o.name === formData.descricao) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewItem({ name: formData.descricao, category: formData.categoria, unit: formData.unidade || '', tipo: 'material', calculavel: true });
                        setShowNewModal(true);
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                    >
                      Cadastrar novo item: "{formData.descricao}"
                    </button>
                  </div>
                )}
              </div>

              {/* Quantidade e Valor Unitário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantidade}
                     value={formData.quantidade}
                      onChange={(e) => {
                        const q = e.target.value;
                        setFormData({...formData, quantidade: q});
                        // recalc depending on lastEdited
                        const qn = parseNumber(q);
                        if (lastEdited === 'total') {
                          const vt = parseNumber(formData.valorTotal);
                          if (qn > 0) setFormData(fd => ({...fd, valorUnitario: String(vt / qn)}));
                        } else if (lastEdited === 'unitario') {
                          const vu = parseNumber(formData.valorUnitario);
                          setFormData(fd => ({...fd, valorTotal: String(qn * vu)}));
                        }
                      }}
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
                    step="0.01"
                    value={formData.valorUnitario}
                     value={formData.valorUnitario}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLastEdited('unitario');
                        const quantidadeNum = parseNumber(formData.quantidade);
                        setFormData(fd => ({...fd, valorUnitario: v, valorTotal: String(parseNumber(v) * quantidadeNum)}));
                      }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="32.50"
                  />
                </div>
              </div>

                <div className="mt-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorTotal}
                   value={formData.valorTotal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLastEdited('total');
                      const qn = parseNumber(formData.quantidade);
                      setFormData(fd => ({...fd, valorTotal: v, valorUnitario: qn > 0 ? String(parseNumber(v) / qn) : fd.valorUnitario}));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="1390.00"
                  />
                </div>

                

              {/* Valor Total */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700">Valor Total:</span>
                  <span className="text-2xl font-bold text-green-700">
                    R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

                <div className="flex gap-3 mt-3">
                <button type="button" onClick={addPendingItem} className="px-4 py-2 bg-blue-600 text-white rounded">Adicionar item ao lançamento</button>
                <button type="button" onClick={() => { setFormData({...formData, descricao: '', unidade: '', quantidade: '', valorUnitario: '', observacoes: ''}); }} className="px-4 py-2 border rounded">Limpar campos</button>
                <button type="button" onClick={() => {
                  setNewItem({ name: formData.descricao || '', category: '', unit: formData.unidade || '', tipo: 'material', calculavel: true });
                  setModalStep('choose-category');
                  setShowNewModal(true);
                }} className="px-3 py-2 bg-blue-500 text-white rounded">Cadastrar novo item</button>
              </div>

              {pendingItems.length > 0 && (
                <div className="mt-4 overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-semibold mb-2">Itens adicionados ({pendingItems.length})</div>
                  <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-600">
                          <th className="py-2">Material</th>
                          <th className="py-2">Categoria</th>
                          <th className="py-2">Quantidade</th>
                          <th className="py-2">Valor Unitário</th>
                          <th className="py-2">Total</th>
                          <th className="py-2">Data</th>
                          <th className="py-2">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map((it, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2">{it.descricao}</td>
                          <td className="py-2">{it.categoria}</td>
                          <td className="py-2">{it.quantidade} {it.unidade}</td>
                          <td className="py-2">R$ {Number(it.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2">R$ {Number(it.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2">{it.data}</td>
                          <td className="py-2"><div className="flex gap-2"><button type="button" onClick={() => removePendingItem(idx)} className="px-2 py-1 border rounded text-red-600">Remover</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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

              {formData.formaPagamento === 'parcelado' && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Parcelas</label>
                    <input type="number" min={1} value={formData.parcelas} onChange={(e) => setFormData({...formData, parcelas: e.target.value})} className="w-full px-4 py-3 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Compra</label>
                    <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} className="w-full px-4 py-3 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pagamento</label>
                    <select value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} className="w-full px-3 py-2 border rounded">
                      <option value="cartao">Cartão (fatura mensal)</option>
                      <option value="crediario">Crediário</option>
                      <option value="boleto">Boleto</option>
                    </select>
                    <div className="text-xs text-gray-500 mt-2">Parcelado: gera parcelas com datas a cada 30 dias. Cartão é marcado automaticamente como faturado conforme datas.</div>
                  </div>
                </div>
              )}

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

              {/* Inline: Cadastrar novo item (agora dentro do cartão) */}
              {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewModal(false)}></div>
                  <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">Cadastrar novo item</h4>
                      <button onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-gray-700">Fechar</button>
                    </div>
                    {modalStep === 'choose-category' ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Escolha a categoria onde este item será cadastrado:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {categorias.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setNewItem((n) => ({ ...n, category: cat.value }));
                                setModalStep('fill');
                                setTimeout(() => {
                                  const el = document.getElementById('new-item-name');
                                  if (el) (el as HTMLInputElement).focus();
                                }, 50);
                              }}
                              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-gray-300"
                            >
                              <i className={`${cat.icon} text-2xl`}></i>
                              <span className="text-xs font-medium text-center">{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Categoria: <span className="font-semibold">{categorias.find(c => c.value === newItem.category)?.label}</span></p>
                        <div className="text-sm text-gray-700 mb-3">Já gasto: <span className="font-semibold">{modalGasto !== null ? `R$ ${modalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input id="new-item-name" className="px-3 py-2 border rounded" placeholder="Nome (descrição)" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                          <input className="px-3 py-2 border rounded" placeholder="Unidade" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} />
                          <select className="px-3 py-2 border rounded" value={newItem.tipo} onChange={(e) => setNewItem({...newItem, tipo: e.target.value})}>
                            <option value="material">Material</option>
                            <option value="servico">Serviço</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={newItem.calculavel} onChange={(e) => setNewItem({...newItem, calculavel: e.target.checked})} />
                              Calculável
                            </label>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button type="button" onClick={() => setModalStep('choose-category')} className="px-3 py-2 border rounded">Voltar</button>
                          <button type="button" onClick={() => {
                            if (!newItem.name || !newItem.category) return alert('Preencha a categoria e a descrição do item');
                            const toAdd = { name: newItem.name, unit: newItem.unit || 'unidade', category: newItem.category, tipo: newItem.tipo, calculavel: newItem.calculavel };
                            const merged = [...userMaterials.filter(m => !(m.name === toAdd.name && m.category === toAdd.category)), toAdd];
                            saveUserMaterials(merged);
                            setFormData({...formData, descricao: toAdd.name, unidade: toAdd.unit});
                            setShowNewModal(false);
                            alert('Item cadastrado com sucesso!');
                          }} className="px-3 py-2 bg-teal-500 text-white rounded">Salvar item</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Foto da Nota Fiscal */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto da Nota Fiscal (Opcional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files)} capture={"environment"} />
                  <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                    <i className="ri-image-add-line text-3xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-600 mb-1">Clique para adicionar foto ou tirar foto (mobile)</p>
                    <p className="text-xs text-gray-500">PNG, JPG ou PDF até 5MB</p>
                  </div>
                  {previewUrl && (
                    <div className="mt-3">
                      <img src={previewUrl} alt="preview" className="mx-auto max-h-40" />
                      <div className="mt-2">
                        <button type="button" onClick={() => { handleFileChange(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="px-3 py-1 border rounded text-sm">Remover</button>
                      </div>
                    </div>
                  )}
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
                  R$ {(fetchedGasto ?? projeto.gastoTotal).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Novo Lançamento</span>
                <span className="text-sm font-semibold text-teal-600">
                  + R$ {newLaunchTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-bold text-gray-800">Saldo Restante</span>
                <span className={`text-lg font-bold ${
                  (projeto.orcamento - projeto.gastoTotal - newLaunchTotal) < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  R$ {(projeto.orcamento - projeto.gastoTotal - newLaunchTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {(projeto.orcamento - projeto.gastoTotal - newLaunchTotal) < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <i className="ri-error-warning-line text-red-600 text-xl mt-0.5"></i>
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">⚠️ Alerta de Orçamento</p>
                    <p>Este lançamento fará com que o orçamento seja ultrapassado em R$ {Math.abs(projeto.orcamento - projeto.gastoTotal - newLaunchTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</p>
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