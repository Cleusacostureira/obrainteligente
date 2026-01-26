import React, { useMemo, useState } from 'react'
import { Contrato, generateContratoText } from '../../lib/contratos'

type Props = {
  initial: Partial<Contrato>
  onCancel: () => void
  onSave: (c: Contrato) => void
}

export default function ContractEditor({ initial, onCancel, onSave }: Props) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<Partial<Contrato>>(initial)
  const textoGenerated = useMemo(() => {
    try {
      return generateContratoText(draft as Contrato)
    } catch (e) {
      return ''
    }
  }, [draft])

  function update<K extends keyof Contrato>(k: K, v: any) {
    setDraft((d) => ({ ...(d as any), [k]: v }))
  }

  function handleSaveFinal() {
    const final = {
      id: (draft as any).id || crypto.randomUUID(),
      tipo: (draft as any).tipo || 'aluguel',
      contratante: draft.contratante || { nome: '' },
      contratado: draft.contratado || { nome: '' },
      imovel: draft.imovel,
      valores: draft.valores,
      foro: draft.foro || '',
      textoContrato: draft.textoContrato || textoGenerated,
      status: draft.status || 'ativo',
      createdAt: draft.createdAt || new Date().toISOString(),
    } as Contrato
    onSave(final)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{
          step === 1 ? 'Tipo de contrato' :
          step === 2 ? 'Dados das Partes' :
          step === 3 ? 'Dados do Imóvel' :
          step === 4 ? 'Prazo' :
          step === 5 ? 'Valores e Garantias' :
          step === 6 ? 'Rescisão / Obrigações / Despesas' :
          step === 7 ? 'Foro e Texto' : 'Revisão'
        }</h2>
        <div className="space-x-2">
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={onCancel}>Cancelar</button>
          {step < 7 && <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setStep((s) => s + 1)}>Próximo</button>}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <label className="block">Tipo</label>
          <select className="w-full p-2 border" value={(draft as any).tipo} onChange={(e) => update('tipo', e.target.value)}>
            <option value="servico">Contrato de Prestação de Serviços</option>
            <option value="aluguel">Contrato de Aluguel</option>
            <option value="venda">Contrato de Compra e Venda</option>
          </select>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium">LOCADOR</h3>
            <input className="w-full p-2 border mt-2" placeholder="Nome completo" value={draft.contratante?.nome || ''} onChange={(e) => update('contratante', { ...(draft.contratante || {}), nome: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="CPF / RG" value={draft.contratante?.documento || ''} onChange={(e) => update('contratante', { ...(draft.contratante || {}), documento: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="Endereço completo" value={draft.contratante?.endereco || ''} onChange={(e) => update('contratante', { ...(draft.contratante || {}), endereco: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="Profissão (opcional)" value={draft.contratante?.profissao || ''} onChange={(e) => update('contratante', { ...(draft.contratante || {}), profissao: e.target.value })} />
          </div>
          <div>
            <h3 className="font-medium">LOCATÁRIO</h3>
            <input className="w-full p-2 border mt-2" placeholder="Nome completo" value={draft.contratado?.nome || ''} onChange={(e) => update('contratado', { ...(draft.contratado || {}), nome: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="CPF / RG" value={draft.contratado?.documento || ''} onChange={(e) => update('contratado', { ...(draft.contratado || {}), documento: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="Endereço completo" value={draft.contratado?.endereco || ''} onChange={(e) => update('contratado', { ...(draft.contratado || {}), endereco: e.target.value })} />
            <input className="w-full p-2 border mt-2" placeholder="Profissão (opcional)" value={draft.contratado?.profissao || ''} onChange={(e) => update('contratado', { ...(draft.contratado || {}), profissao: e.target.value })} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="font-medium">Dados do Imóvel</h3>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <select className="p-2 border" value={draft.imovel?.tipo || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), tipo: e.target.value })}>
              <option value="">Tipo de imóvel</option>
              <option value="Casa">Casa</option>
              <option value="Kitnet">Kitnet</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Sala comercial">Sala comercial</option>
            </select>
            <input className="p-2 border" placeholder="Área total (m²)" value={draft.imovel?.area || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), area: e.target.value })} />
            <input className="p-2 border col-span-2" placeholder="Endereço completo" value={draft.imovel?.endereco || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), endereco: e.target.value })} />
            <input className="p-2 border" placeholder="Quartos" value={(draft.imovel as any)?.quartos || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), quartos: e.target.value })} />
            <input className="p-2 border" placeholder="Sala" value={(draft.imovel as any)?.sala || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), sala: e.target.value })} />
            <input className="p-2 border" placeholder="Cozinha" value={(draft.imovel as any)?.cozinha || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), cozinha: e.target.value })} />
            <input className="p-2 border" placeholder="Banheiro(s)" value={(draft.imovel as any)?.banheiros || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), banheiros: e.target.value })} />
            <input className="p-2 border" placeholder="Lavanderia" value={(draft.imovel as any)?.lavanderia || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), lavanderia: e.target.value })} />
            <input className="p-2 border col-span-2" placeholder="Área externa / observações" value={(draft.imovel as any)?.areaExterna || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), areaExterna: e.target.value })} />
            <div className="col-span-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center"><input type="checkbox" className="mr-2" checked={(draft.imovel as any)?.pinturaNova || false} onChange={(e) => update('imovel', { ...(draft.imovel || {}), pinturaNova: e.target.checked })} />Pintura nova</label>
                <label className="flex items-center"><input type="checkbox" className="mr-2" checked={(draft.imovel as any)?.instalacoesOk || false} onChange={(e) => update('imovel', { ...(draft.imovel || {}), instalacoesOk: e.target.checked })} />Instalações elétricas e hidráulicas em perfeito funcionamento</label>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center"><input type="checkbox" className="mr-2" checked={(draft.imovel as any)?.portasJanelasOk || false} onChange={(e) => update('imovel', { ...(draft.imovel || {}), portasJanelasOk: e.target.checked })} />Portas, janelas e fechaduras em perfeito estado</label>
              </div>
              <textarea className="p-2 border w-full mt-2" placeholder="Observações adicionais do imóvel" value={(draft.imovel as any)?.descricao || ''} onChange={(e) => update('imovel', { ...(draft.imovel || {}), descricao: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 className="font-medium">Prazo do Contrato</h3>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <input className="p-2 border" placeholder="Prazo (ex: 12 meses)" value={(draft as any).prazo || ''} onChange={(e) => setDraft(d => ({ ...(d as any), prazo: e.target.value }))} />
            <input className="p-2 border" placeholder="Data de início (YYYY-MM-DD)" value={(draft as any).dataInicio || ''} onChange={(e) => setDraft(d => ({ ...(d as any), dataInicio: e.target.value }))} />
            <input className="p-2 border" placeholder="Data de término (YYYY-MM-DD)" value={(draft as any).dataTermino || ''} onChange={(e) => setDraft(d => ({ ...(d as any), dataTermino: e.target.value }))} />
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3 className="font-medium">Valores, Pagamento e Garantias</h3>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <input className="p-2 border" placeholder="Valor do aluguel (mensal)" value={draft.valores?.valor || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), valor: e.target.value })} />
            <input className="p-2 border" placeholder="Forma de pagamento (Pix / Transferência)" value={draft.valores?.formaPagamento || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), formaPagamento: e.target.value })} />
            <input className="p-2 border" placeholder="Data limite de pagamento (ex: 10)" value={draft.valores?.vencimento || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), vencimento: e.target.value })} />
            <input className="p-2 border" placeholder="Multa por atraso (%)" value={draft.valores?.multa || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), multa: e.target.value })} />
            <input className="p-2 border" placeholder="Juros por atraso (% ao mês)" value={draft.valores?.juros || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), juros: e.target.value })} />
            <input className="p-2 border" placeholder="Índice de reajuste (ex: IPCA)" value={draft.valores?.reajuste || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), reajuste: e.target.value })} />

            <input className="p-2 border col-span-2" placeholder="Banco (dados do LOCADOR)" value={(draft.valores as any)?.banco || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), banco: e.target.value })} />
            <input className="p-2 border" placeholder="Agência" value={(draft.valores as any)?.agencia || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), agencia: e.target.value })} />
            <input className="p-2 border" placeholder="Conta" value={(draft.valores as any)?.conta || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), conta: e.target.value })} />
            <input className="p-2 border" placeholder="Tipo de conta" value={(draft.valores as any)?.tipoConta || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), tipoConta: e.target.value })} />
            <input className="p-2 border" placeholder="Chave Pix" value={(draft.valores as any)?.pix || ''} onChange={(e) => update('valores', { ...(draft.valores || {}), pix: e.target.value })} />

            <select className="p-2 border col-span-2" value={(draft as any).garantia || ''} onChange={(e) => setDraft(d => ({ ...(d as any), garantia: e.target.value }))}>
              <option value="">Garantia (opcional)</option>
              <option value="Caução">Caução</option>
              <option value="Fiador">Fiador</option>
              <option value="Seguro fiança">Seguro fiança</option>
            </select>
            <input className="p-2 border" placeholder="Valor da garantia (se houver)" value={(draft as any).valorGarantia || ''} onChange={(e) => setDraft(d => ({ ...(d as any), valorGarantia: e.target.value }))} />
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <h3 className="font-medium">Rescisão, Obrigações e Despesas</h3>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <input className="p-2 border" placeholder="Multa por rescisão (ex: 3 meses)" value={(draft as any).multaRescisao || ''} onChange={(e) => setDraft(d => ({ ...(d as any), multaRescisao: e.target.value }))} />
            <input className="p-2 border" placeholder="Prazo de aviso prévio (dias)" value={(draft as any).prazoAviso || ''} onChange={(e) => setDraft(d => ({ ...(d as any), prazoAviso: e.target.value }))} />
            <textarea className="p-2 border col-span-2" placeholder="Obrigações do LOCATÁRIO (resumo)" value={(draft as any).obrigacoesLocatario || ''} onChange={(e) => setDraft(d => ({ ...(d as any), obrigacoesLocatario: e.target.value }))} />
            <div className="col-span-2">
              <div className="mb-2">Obrigações do LOCADOR (selecione):</div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={(draft as any).locadorIPTU || false} onChange={(e) => setDraft(d => ({ ...(d as any), locadorIPTU: e.target.checked }))} />IPTU</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={(draft as any).locadorLimpezaFossa || false} onChange={(e) => setDraft(d => ({ ...(d as any), locadorLimpezaFossa: e.target.checked }))} />Limpeza de fossa</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={(draft as any).locadorPinturaSaida || false} onChange={(e) => setDraft(d => ({ ...(d as any), locadorPinturaSaida: e.target.checked }))} />Pintura após saída do imóvel</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={(draft as any).locadorManutencaoEstrutural || false} onChange={(e) => setDraft(d => ({ ...(d as any), locadorManutencaoEstrutural: e.target.checked }))} />Manutenção estrutural</label>
            </div>
            <select className="p-2 border col-span-2" value={(draft as any).despesas || ''} onChange={(e) => setDraft(d => ({ ...(d as any), despesas: e.target.value }))}>
              <option value="">Responsabilidade por despesas (opcional)</option>
              <option value="Locatario: água, energia, lixo">Locatário: água, energia, lixo</option>
              <option value="Locador: IPTU">Locador: IPTU</option>
              <option value="Conforme acordado">Conforme acordado</option>
            </select>
          </div>
        </div>
      )}

      {step === 7 && (
        <div>
          <h3 className="font-medium">Foro e Texto Final</h3>
          <input className="w-full p-2 border mt-2" placeholder="Foro (Comarca)" value={draft.foro || ''} onChange={(e) => update('foro', e.target.value)} />
          <textarea className="w-full h-64 p-2 border mt-2" value={(draft.textoContrato as string) || textoGenerated} onChange={(e) => update('textoContrato', e.target.value)} />
          <div className="flex justify-end space-x-2 mt-3">
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setStep(1)}>Reiniciar</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleSaveFinal}>Salvar</button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">Etapa {step} de 7</div>
        <div>
          {step > 1 && <button className="px-3 py-1 mr-2 bg-gray-100 rounded" onClick={() => setStep((s) => s - 1)}>Anterior</button>}
          {step < 7 && <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => setStep((s) => s + 1)}>Próximo</button>}
        </div>
      </div>
    </div>
  )
}
