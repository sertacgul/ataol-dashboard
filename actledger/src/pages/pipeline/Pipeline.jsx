import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import HelpButton from '../../components/HelpButton'
import { useT } from '../../contexts/LanguageContext'

export default function Pipeline() {
  const { t } = useT()
  const [stages, setStages] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState(null)

  useEffect(() => {
    api.get('/pipeline')
      .then(data => {
        setStages(data.stages || [])
        setItems(data.items || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDragStart(e, id) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, stageId) {
    e.preventDefault()
    if (!draggingId || draggingId === null) return

    const item = items.find(i => i.id === draggingId)
    if (!item || item.stage_id === stageId) {
      setDraggingId(null)
      return
    }

    // Optimistic update
    setItems(prev => prev.map(i => i.id === draggingId ? { ...i, stage_id: stageId } : i))
    setDraggingId(null)

    api.put(`/pipeline/items/${draggingId}`, { stage_id: stageId, notes: item.notes })
      .catch(() => {
        // Revert on error
        setItems(prev => prev.map(i => i.id === draggingId ? { ...i, stage_id: item.stage_id } : i))
      })
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    api.del(`/pipeline/items/${id}`)
      .catch(() => {
        api.get('/pipeline').then(data => setItems(data.items || []))
      })
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageItems = items.filter(i => i.stage_id === stage.id)
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-60"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#374151]">{stage.name}</span>
                <span className="text-xs text-[#6B7280] bg-[#F3F4F6] rounded-full px-2 py-0.5">
                  {stageItems.length}
                </span>
              </div>
              <div className="min-h-40 border-2 border-dashed border-[#E5E7EB] rounded-md p-2 flex flex-col gap-2">
                {stageItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={e => handleDragStart(e, item.id)}
                    className="bg-white border border-[#E5E7EB] rounded-md p-3 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-medium text-[#111827] leading-snug">{item.company_name}</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-[#9CA3AF] hover:text-[#EF4444] text-xs leading-none flex-shrink-0"
                        title="Sil"
                      >
                        ×
                      </button>
                    </div>
                    {item.sector && (
                      <div className="text-xs text-[#6B7280] mt-1">{item.sector}</div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">{item.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <HelpButton section="crm-pipeline" />
    </div>
  )
}
