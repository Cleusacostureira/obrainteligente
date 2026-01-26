import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ContractList from '../../components/Contratos/ContractList'
import ContractEditor from '../../components/Contratos/ContractEditor'
import LaudoVistoria from '../../components/Contratos/LaudoVistoria'
import { Contrato, loadContratos, saveContratos } from '../../lib/contratos'

export default function ContratosPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<Contrato[]>([])
  const [editing, setEditing] = useState<Contrato | null>(null)
  const [laudoEditing, setLaudoEditing] = useState<Contrato | null>(null)
  const [redoTarget, setRedoTarget] = useState<Contrato | null>(null)
  const [showRedoModal, setShowRedoModal] = useState(false)

  useEffect(() => {
    setList(loadContratos())
  }, [])

  function handleSave(c: Contrato) {
    const exists = list.find((i) => i.id === c.id)
    let next: Contrato[]
    if (exists) {
      next = list.map((i) => (i.id === c.id ? c : i))
    } else {
      next = [c, ...list]
    }
    setList(next)
    saveContratos(next)
    setEditing(null)
  }

  function handleDelete(id: string) {
    const next = list.filter((i) => i.id !== id)
    setList(next)
    saveContratos(next)
  }

  function handleDuplicate(id: string) {
    const item = list.find((i) => i.id === id)
    if (!item) return
    const copy = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'ativo' }
    const next = [copy, ...list]
    setList(next)
    saveContratos(next)
  }

  function handleLaudoClick(c: Contrato) {
    const laudo = (c as any).laudo
    if (laudo && laudo.locked) {
      // show modal card asking to redo
      setRedoTarget(c)
      setShowRedoModal(true)
      return
    }
    setLaudoEditing(c)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1 rounded border text-sm"
            onClick={() => navigate(-1)}
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-semibold">Contratos</h1>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => setEditing({
            id: crypto.randomUUID(),
            tipo: 'servico',
            contratante: { nome: '' },
            contratado: { nome: '' },
            createdAt: new Date().toISOString(),
          } as Contrato)}
        >
          + Novo Contrato
        </button>
      </div>

      <ContractList
        contratos={list}
        onEdit={(c) => setEditing(c)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onLaudo={handleLaudoClick}
      />

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded shadow p-4 max-h-[80vh] overflow-auto">
            <ContractEditor
              initial={editing}
              onCancel={() => setEditing(null)}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {laudoEditing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded shadow p-4 max-h-[80vh] overflow-auto">
            <LaudoVistoria
              contrato={laudoEditing}
              onClose={() => setLaudoEditing(null)}
              onSave={(c) => {
                const next = list.map((i) => (i.id === c.id ? c : i))
                setList(next)
                saveContratos(next)
              }}
            />
          </div>
        </div>
      )}

      {showRedoModal && redoTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-[520px] max-w-full">
            <h3 className="text-lg font-semibold mb-2">Laudo já feito e assinado</h3>
            <p className="text-sm text-gray-700">Deseja refazer o laudo anexado a este contrato? Ao refazer as assinaturas atuais serão removidas.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={() => { setShowRedoModal(false); setRedoTarget(null); }}>Não</button>
              <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => {
                const c = redoTarget
                if (!c) return
                const laudo = (c as any).laudo || {}
                const unlocked = { ...c, laudo: { ...laudo, locked: false, signed: null } }
                setLaudoEditing(unlocked)
                setShowRedoModal(false)
                setRedoTarget(null)
              }}>Sim, refazer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
