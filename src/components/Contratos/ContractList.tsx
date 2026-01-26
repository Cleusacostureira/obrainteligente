import React from 'react'
import { Contrato } from '../../lib/contratos'

type Props = {
  contratos: Contrato[]
  onEdit: (c: Contrato) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onLaudo?: (c: Contrato) => void
}

export default function ContractList({ contratos, onEdit, onDelete, onDuplicate, onLaudo }: Props) {
  if (!contratos.length) {
    return <div className="p-4 text-gray-600">Nenhum contrato salvo.</div>
  }

  function downloadPDF(c: Contrato) {
    const w = window.open('', '_blank')
    if (!w) return
    const logo = 'https://static.readdy.ai/image/32e34e04a919b9271ef3ff4f79b7fd86/cbe84a417d47b8c1155c0e22c6b2cec6.png'
    let text = (c.textoContrato || '')
    // escape HTML
    text = text.replace(/</g, '&lt;')
    // Bold clause headings like 'CLÁUSULA ...'
    text = text.replace(/^CLÁUSULA.*$/gmi, (m) => `<strong>${m}</strong>`)
    // Bold main contract title if present
    text = text.replace(/^(CONTRATO DE LOCAÇÃO RESIDENCIAL)$/gmi, (m) => `<strong>${m}</strong>`)
    // Bold LOCADOR and LOCATÁRIO names (text after label until line end)
    text = text.replace(/^(LOCADOR:\s*)([^\n]+)/gmi, (m, p1, p2) => `${p1}<strong>${p2}</strong>`)
    text = text.replace(/^(LOCATÁRIO:\s*)([^\n]+)/gmi, (m, p1, p2) => `${p1}<strong>${p2}</strong>`)
    // Bold monetary values like R$ 1.000,00
    text = text.replace(/(R\$\s*[0-9\.,]+)/g, (m) => `<strong>${m}</strong>`)
    // convert newlines to <br/>
    text = text.replace(/\n/g, '<br/>')
    const html = `
      <html>
        <head>
          <title>Contrato</title>
          <meta charset="utf-8" />
            <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 0; }
            .page { padding: 28px 40px; }
            .page-break { page-break-before: always; break-before: page; }
            /* header: light gray background for better logo contrast, dark text */
            .header { display:flex; align-items:center; gap:16px; background: #f3f4f6; color: #111827; padding:18px; }
            .logo { width:64px; height:64px; object-fit:contain; }
            /* ensure contract title is black as requested */
            .title { font-size:18px; font-weight:700; color: #000; }
            .meta { font-size:12px; opacity:0.95 }
            .contract-body { margin-top:18px; white-space:pre-wrap; line-height:1.45; font-size:14px; }
            .signatures { display:flex; justify-content:space-between; gap:20px; margin-top:40px; }
            .sign { flex:1; text-align:center; }
            .sig-line { border-bottom:1px solid #000; width:90%; margin:0 auto 8px; height:2px; }
            .sig-name { margin-top:6px; font-weight:600; }
            .sig-cpf { margin-top:4px; font-size:12px; color:#111827; opacity:0.95 }
            @media print { .header { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <img src="${logo}" class="logo" alt="Logo" />
              <div>
                <div class="title">CONTRATO DE LOCAÇÃO RESIDENCIAL</div>
              </div>
            </div>

            <div class="contract-body">${text}</div>

            <div class="signatures">
              <div class="sign">
                  <div class="sig-line"></div>
                  <div class="sig-name">LOCADOR: ${(c.contratante?.nome) || '__________________________'}</div>
                  <div class="sig-cpf">CPF: ${(c.contratante?.documento) || '__________________________'}</div>
                </div>
                <div class="sign">
                  <div class="sig-line"></div>
                  <div class="sig-name">LOCATÁRIO: ${(c.contratado?.nome) || '__________________________'}</div>
                  <div class="sig-cpf">CPF: ${(c.contratado?.documento) || '__________________________'}</div>
                </div>
            </div>
          </div>
        </body>
      </html>`
    // if there's a signed laudo, append it as a new section with page-break
    let finalHtml = html
    const laudo = (c as any).laudo
    if (laudo && laudo.locked) {
      const ambientesHtml = (laudo.ambientes || []).map((a: any) => `
        <h4 style="margin-bottom:6px">${a.nome} — Condição: <strong>${a.condicao}</strong></h4>
        <div style="display:flex;gap:8px;margin-bottom:12px">${(a.fotos||[]).map((f: any) => `<img src="${f.dataUrl}" style="width:120px;height:90px;object-fit:cover;border:1px solid #ddd"/>`).join('')}</div>
      `).join('\n')

      const assinaturaHtml = `
        <div style="display:flex;gap:24px;margin-top:20px;align-items:flex-end">
          <div style="flex:1;text-align:center">
            <img src="${laudo.signed?.locador?.seal || ''}" style="width:40px;height:40px;object-fit:contain;margin-bottom:6px" />
            <div style="border-bottom:1px solid #000;height:2px;margin:0 24% 8px"></div>
            <div>${c.contratante?.nome || '---'}</div>
            <div>CPF: ${c.contratante?.documento || '---'}</div>
            <div style="font-size:12px;color:#555">${laudo.signed?.locador ? `Assinado por: ${laudo.signed.locador.name} em ${laudo.signed.locador.date}` : ''}</div>
          </div>
          <div style="flex:1;text-align:center">
            <img src="${laudo.signed?.locatario?.seal || ''}" style="width:40px;height:40px;object-fit:contain;margin-bottom:6px" />
            <div style="border-bottom:1px solid #000;height:2px;margin:0 24% 8px"></div>
            <div>${c.contratado?.nome || '---'}</div>
            <div>CPF: ${c.contratado?.documento || '---'}</div>
            <div style="font-size:12px;color:#555">${laudo.signed?.locatario ? `Assinado por: ${laudo.signed.locatario.name} em ${laudo.signed.locatario.date}` : ''}</div>
          </div>
        </div>
      `

      const laudoHtml = `
        <div class="page page-break">
          <div class="header">
            <img src="${logo}" class="logo" alt="Logo" />
            <div>
              <div class="title">LAUDO DE VISTORIA DO IMÓVEL</div>
              <div class="meta">Parte integrante do Contrato de Locação Residencial</div>
            </div>
          </div>
          <div style="margin-top:16px">
            <strong>IDENTIFICAÇÃO DO IMÓVEL</strong>
            <div style="font-size:13px;color:#374151">Endereço: ${c.imovel?.endereco || '---'}</div>
            <div style="font-size:13px;color:#374151">Data da vistoria: ${laudo.dataVistoria || '---'}</div>
          </div>
          <div style="margin-top:12px"><strong>OBSERVAÇÕES GERAIS</strong><div style="font-size:13px;color:#374151">${laudo.observacoes || 'Nenhuma observação registrada.'}</div></div>
          <div style="margin-top:12px"><strong>AMBIENTES</strong>${ambientesHtml}</div>
          <div style="margin-top:12px"><strong>RESUMO DO ESTADO</strong><div style="font-size:13px;color:#374151">${laudo.estadoResumo || '---'}</div></div>
          ${assinaturaHtml}
        </div>
      `

      // insert laudoHtml before closing body
      finalHtml = html.replace('</body>', `${laudoHtml}</body>`)
    }

    w.document.write(finalHtml)
    w.document.close()
    // small delay to allow images to load
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="bg-white rounded shadow overflow-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Tipo</th>
            <th className="text-left p-3">Partes</th>
            <th className="text-left p-3">Imóvel</th>
            <th className="text-left p-3">Valor</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.tipo}</td>
              <td className="p-3">{c.contratante?.nome} / {c.contratado?.nome}</td>
              <td className="p-3">{c.imovel?.endereco || '-'}</td>
              <td className="p-3">{c.valores?.valor || '-'}</td>
              <td className="p-3">{c.status || 'ativo'}</td>
              <td className="p-3 space-x-2">
                <button title="Visualizar / Editar" className="px-2 py-1 bg-green-500 text-white rounded" onClick={() => onEdit(c)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h6M7 11v6m0 0l10-10"/></svg>
                </button>
                <button title="Baixar PDF" className="px-2 py-1 bg-gray-700 text-white rounded" onClick={() => downloadPDF(c)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.586l3.293-3.293 1.414 1.414L12 17.414 7.293 12.707l1.414-1.414L12 13.586V3z"/></svg>
                </button>
                <button title="Laudo" className="px-2 py-1 bg-indigo-600 text-white rounded" onClick={() => onLaudo && onLaudo(c)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 16h6M3 8h18M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </button>
                <button title="Duplicar" className="px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => onDuplicate(c.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h9a2 2 0 012 2v2h2a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
                </button>
                <button title="Excluir" className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => onDelete(c.id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M10 11v6m4-6v6M9 7l1 12a2 2 0 002 2h0a2 2 0 002-2l1-12"/></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
