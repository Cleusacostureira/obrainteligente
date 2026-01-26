import React, { useState, useMemo } from 'react'
import { Contrato } from '../../lib/contratos'

type Foto = { id: string; dataUrl: string }
type AmbienteState = { key: string; nome: string; condicao: string; fotos: Foto[] }

type Props = {
  contrato: Contrato
  onClose: () => void
  onSave: (c: Contrato) => void
}

export default function LaudoVistoria({ contrato, onClose, onSave }: Props) {
  const existing = (contrato as any).laudo || {}
  const [dataVistoria, setDataVistoria] = useState(existing.dataVistoria || new Date().toLocaleDateString())
  const [observacoes, setObservacoes] = useState(existing.observacoes || '')
  const [estadoResumo, setEstadoResumo] = useState(existing.estadoResumo || '')
  const [signed, setSigned] = useState<any>(existing.signed || {})
  const [locked, setLocked] = useState(!!existing.locked)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)

  const logoSmall = 'https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png'

  // build ambientes list from contrato.imovel
  const ambientesInit = useMemo(() => {
    const im = contrato.imovel || ({} as any)
    const items: AmbienteState[] = []
    if (Number((im as any).quartos) > 0) items.push({ key: 'quartos', nome: 'Quarto(s)', condicao: 'Ótimo', fotos: [] })
    if (Number((im as any).sala) > 0) items.push({ key: 'salas', nome: 'Sala(s)', condicao: 'Ótimo', fotos: [] })
    if ((im as any).cozinha) items.push({ key: 'cozinha', nome: 'Cozinha', condicao: 'Ótimo', fotos: [] })
    if (Number((im as any).banheiros) > 0) items.push({ key: 'banheiros', nome: 'Banheiro(s)', condicao: 'Ótimo', fotos: [] })
    if ((im as any).lavanderia) items.push({ key: 'lavanderia', nome: 'Lavanderia / Área de Serviço', condicao: 'Ótimo', fotos: [] })
    if ((im as any).areaExterna) items.push({ key: 'areaExterna', nome: 'Área Externa', condicao: 'Ótimo', fotos: [] })
    // fallback: if nothing, add um ambiente geral
    if (items.length === 0) items.push({ key: 'geral', nome: 'Ambiente', condicao: 'Ótimo', fotos: [] })
    // merge with existing saved ambientes
    const saved: AmbienteState[] = existing.ambientes || []
    return items.map((it) => {
      const s = saved.find((x: any) => x.key === it.key)
      return s ? { ...it, condicao: s.condicao || it.condicao, fotos: s.fotos || [] } : it
    })
  }, [contrato, existing.ambientes])

  const [ambientes, setAmbientes] = useState<AmbienteState[]>(ambientesInit)

  function handleFotoChange(key: string, fileList: FileList | null) {
    if (!fileList || locked) return
    const files = Array.from(fileList)
    files.forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result || '')
        setAmbientes((prev) => prev.map((a) => a.key === key ? { ...a, fotos: [...a.fotos, { id: crypto.randomUUID(), dataUrl }] } : a))
      }
      reader.readAsDataURL(f)
    })
  }

  function setCondicao(key: string, cond: string) {
    if (locked) return
    setAmbientes((prev) => prev.map((a) => a.key === key ? { ...a, condicao: cond } : a))
  }

  function removeFoto(key: string, id: string) {
    if (locked) return
    setAmbientes((prev) => prev.map((a) => a.key === key ? { ...a, fotos: a.fotos.filter(f => f.id !== id) } : a))
  }

  function handleSave() {
    const laudo = { id: existing.id || crypto.randomUUID(), dataVistoria, observacoes, estadoResumo, ambientes, signed, locked, createdAt: new Date().toISOString() }
    const next = { ...contrato, laudo }
    onSave(next)
    onClose()
  }

  function doSign() {
    if (locked) return
    setShowSignModal(true)
  }

  function handleConfirmLocador() {
    if (locked) return
    const name = contrato.contratante?.nome || ''
    const document = contrato.contratante?.documento || ''
    const sig = { name, document, date: new Date().toLocaleString(), seal: logoSmall }
    setSigned((s: any) => ({ ...s, locador: sig }))
  }

  function handleConfirmLocatario() {
    if (locked) return
    const name = contrato.contratado?.nome || ''
    const document = contrato.contratado?.documento || ''
    const sig = { name, document, date: new Date().toLocaleString(), seal: logoSmall }
    setSigned((s: any) => ({ ...s, locatario: sig }))
  }

  function handleFinalizeSign() {
    if (locked) return
    if (!signed.locador || !signed.locatario) return
    setLocked(true)
    const finalSigned = signed
    const laudo = { id: existing.id || crypto.randomUUID(), dataVistoria, observacoes, estadoResumo, ambientes, signed: finalSigned, locked: true, createdAt: new Date().toISOString() }
    const next = { ...contrato, laudo, status: 'Assinado digitalmente' }
    onSave(next)
    setShowSignModal(false)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 1200)
  }

  function printLaudo() {
    const logo = 'https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png'
    const ambientesHtml = ambientes.map((a) => `
      <h4 style="margin-bottom:6px">${a.nome} — Condição: <strong>${a.condicao}</strong></h4>
      <div style="display:flex;gap:8px;margin-bottom:12px">${a.fotos.map(f => `<img src="${f.dataUrl}" style="width:120px;height:90px;object-fit:cover;border:1px solid #ddd"/>`).join('')}</div>
    `).join('\n')

    const assinaturaHtml = signed && (signed.locador || signed.locatario) ? `
      <div style="display:flex;gap:24px;margin-top:20px;align-items:flex-end">
        <div style="flex:1;text-align:center">
          <img src="${signed.locador?.seal || ''}" style="width:40px;height:40px;object-fit:contain;margin-bottom:6px" />
          <div style="border-bottom:1px solid #000;height:2px;margin:0 24% 8px"></div>
          <div>${contrato.contratante?.nome || '---'}</div>
          <div>CPF: ${contrato.contratante?.documento || '---'}</div>
          <div style="font-size:12px;color:#555">${signed.locador ? `Assinado por: ${signed.locador.name} em ${signed.locador.date}` : ''}</div>
        </div>
        <div style="flex:1;text-align:center">
          <img src="${signed.locatario?.seal || ''}" style="width:40px;height:40px;object-fit:contain;margin-bottom:6px" />
          <div style="border-bottom:1px solid #000;height:2px;margin:0 24% 8px"></div>
          <div>${contrato.contratado?.nome || '---'}</div>
          <div>CPF: ${contrato.contratado?.documento || '---'}</div>
          <div style="font-size:12px;color:#555">${signed.locatario ? `Assinado por: ${signed.locatario.name} em ${signed.locatario.date}` : ''}</div>
        </div>
      </div>
    ` : ''

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Laudo de Vistoria</title>
          <style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:28px}.header{display:flex;align-items:center;gap:16px;background:#f3f4f6;padding:12px}.logo{width:64px;height:64px;object-fit:contain}h2{margin:0 0 8px 0}.section{margin-top:14px}.small{font-size:13px;color:#374151}@media print{.header{-webkit-print-color-adjust:exact}}</style>
        </head>
        <body>
          <div class="header"><img src="${logo}" class="logo" alt="logo"/><div><h2>LAUDO DE VISTORIA DO IMÓVEL</h2><div class="small">(Parte integrante do Contrato de Locação Residencial)</div></div></div>
          <div class="section"><strong>IDENTIFICAÇÃO DO IMÓVEL</strong><div class="small">Endereço: ${contrato.imovel?.endereco || '---'}</div><div class="small">Tipo: ${contrato.imovel?.tipo || '---'}</div><div class="small">Área: ${contrato.imovel?.area || '---'} m²</div><div class="small">Data da vistoria: ${dataVistoria}</div><div class="small">Contrato vinculado: ${contrato.id}</div></div>
          <div class="section"><strong>PARTES</strong><div class="small">LOCADOR: ${contrato.contratante?.nome || '---'}</div><div class="small">LOCATÁRIO: ${contrato.contratado?.nome || '---'}</div></div>
          <div class="section"><strong>OBSERVAÇÕES GERAIS</strong><div class="small">${observacoes || 'Nenhuma observação registrada.'}</div></div>
          <div class="section"><strong>AMBIENTES</strong>${ambientesHtml}</div>
          <div class="section"><strong>RESUMO DO ESTADO</strong><div class="small">${estadoResumo || '---'}</div></div>
          ${assinaturaHtml}
        </body>
      </html>
    `
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div>
      <div className="p-4">
        <h2 className="text-lg font-semibold">Laudo de Vistoria</h2>

        <div className="mt-3">
          <label className="block text-sm font-medium">Data da vistoria</label>
          <input className="mt-1 border p-2 w-full" value={dataVistoria} onChange={(e) => setDataVistoria(e.target.value)} disabled={locked} />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium">Observações gerais</label>
          <textarea className="mt-1 border p-2 w-full" rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={locked} />
        </div>

        <div className="mt-4">
          <h3 className="font-medium">Ambientes</h3>
          <div className="space-y-4 mt-2">
            {ambientes.map((a) => (
              <div key={a.key} className="border p-3 rounded">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{a.nome}</div>
                  <div className="text-sm text-gray-600">Condição:</div>
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  {['Ótimo','Bom','Regular','Ruim'].map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-2">
                      <input type="radio" name={`cond-${a.key}`} value={opt} checked={a.condicao===opt} onChange={() => setCondicao(a.key, opt)} disabled={locked} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium">Fotos</div>
                  <input type="file" accept="image/*" multiple onChange={(e) => handleFotoChange(a.key, e.target.files)} disabled={locked} />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {a.fotos.map((f) => (
                      <div key={f.id} className="relative">
                        <img src={f.dataUrl} className="w-28 h-20 object-cover rounded border" />
                        {!locked && <button className="absolute top-0 right-0 bg-white rounded-full p-0.5" onClick={() => removeFoto(a.key, f.id)}>-</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">Resumo do estado</label>
          <textarea className="mt-1 border p-2 w-full" rows={3} value={estadoResumo} onChange={(e) => setEstadoResumo(e.target.value)} disabled={locked} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border p-3 rounded">
            <div className="font-semibold">LOCADOR</div>
            <div className="text-sm">{contrato.contratante?.nome || '---'}</div>
            <div className="text-sm">CPF: {contrato.contratante?.documento || '---'}</div>
            {signed.locador && <div className="text-xs text-gray-600 mt-2">Assinado em {signed.locador.date}</div>}
          </div>
          <div className="border p-3 rounded">
            <div className="font-semibold">LOCATÁRIO</div>
            <div className="text-sm">{contrato.contratado?.nome || '---'}</div>
            <div className="text-sm">CPF: {contrato.contratado?.documento || '---'}</div>
            {signed.locatario && <div className="text-xs text-gray-600 mt-2">Assinado em {signed.locatario.date}</div>}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={handleSave} disabled={locked}>Salvar e Anexar ao Contrato</button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={doSign} disabled={locked}>Assinar digitalmente</button>
          <button className="px-3 py-2 bg-gray-700 text-white rounded" onClick={printLaudo}>Gerar PDF</button>
          <button className="px-3 py-2 border rounded" onClick={onClose}>Fechar</button>
        </div>
      
      {showSignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded shadow-lg p-6 w-[720px] max-w-full">
            <h3 className="text-lg font-semibold mb-3">Confirmar assinaturas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded">
                <div className="font-semibold">LOCADOR</div>
                <div className="text-sm">{contrato.contratante?.nome || '---'}</div>
                <div className="text-sm">CPF: {contrato.contratante?.documento || '---'}</div>
                {signed.locador ? (
                  <div className="text-xs text-gray-600 mt-2">Assinado em {signed.locador.date}</div>
                ) : (
                  <button className="mt-3 px-3 py-2 bg-green-600 text-white rounded" onClick={handleConfirmLocador}>Confirmar LOCADOR</button>
                )}
              </div>
              <div className="border p-4 rounded">
                <div className="font-semibold">LOCATÁRIO</div>
                <div className="text-sm">{contrato.contratado?.nome || '---'}</div>
                <div className="text-sm">CPF: {contrato.contratado?.documento || '---'}</div>
                {signed.locatario ? (
                  <div className="text-xs text-gray-600 mt-2">Assinado em {signed.locatario.date}</div>
                ) : (
                  <button className="mt-3 px-3 py-2 bg-green-600 text-white rounded" onClick={handleConfirmLocatario}>Confirmar LOCATÁRIO</button>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={() => setShowSignModal(false)}>Cancelar</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={handleFinalizeSign} disabled={!(signed.locador && signed.locatario)}>Finalizar e Assinar</button>
            </div>
          </div>
        </div>
      )}
      </div>
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white border shadow px-6 py-4 rounded text-center pointer-events-auto">
            <div className="text-green-600 font-semibold">Assinatura digital feita com sucesso ✓</div>
          </div>
        </div>
      )}
    </div>
  )
}
