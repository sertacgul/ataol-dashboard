import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const TYPE_COLORS = {
  seo: '#2563EB',
  social: '#059669',
  newsletter: '#7C3AED',
  outreach: '#D97706',
}

const TYPE_LABELS = {
  seo: 'SEO',
  social: 'Sosyal Medya',
  newsletter: 'Newsletter',
  outreach: 'Outreach',
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planlandı' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
]

const EMPTY_NEW = { title: '', type: 'seo', notes: '' }
const EMPTY_EDIT = { title: '', status: 'planned', notes: '' }

function toYMD(date) {
  return date.toISOString().slice(0, 10)
}

function buildGrid(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  // JS: 0=Sun, 1=Mon ... 6=Sat. We want Mon=0
  let startDow = firstDay.getDay() // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1 // convert to Mon=0

  const start = new Date(firstDay)
  start.setDate(start.getDate() - startDow)

  const cells = []
  const cursor = new Date(start)
  // 6 weeks x 7 days
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return cells
}

export default function Calendar() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  )
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  // New item modal
  const [showNew, setShowNew] = useState(false)
  const [newDay, setNewDay] = useState(null)
  const [newForm, setNewForm] = useState(EMPTY_NEW)
  const [newSaving, setNewSaving] = useState(false)
  const [newError, setNewError] = useState('')

  // Edit modal
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editDeleting, setEditDeleting] = useState(false)

  // Drag state
  const dragId = useRef(null)

  const [year, month0] = currentMonth.split('-').map(Number)
  const month = month0 - 1 // 0-indexed

  function prevMonth() {
    const d = new Date(year, month - 1, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  async function fetchItems() {
    setLoading(true)
    try {
      const data = await api.get(`/calendar?month=${currentMonth}`)
      setItems(data.items || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [currentMonth])

  const cells = buildGrid(year, month)

  function itemsForDay(dateObj) {
    const ymd = toYMD(dateObj)
    return items.filter(it => it.scheduled_date === ymd)
  }

  // Upcoming 7 days
  const upcoming = (() => {
    const todayYMD = toYMD(today)
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 7)
    const limitYMD = toYMD(limit)
    return items
      .filter(it => it.scheduled_date >= todayYMD && it.scheduled_date <= limitYMD)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
  })()

  // New item handlers
  function openNew(dateObj) {
    setNewDay(toYMD(dateObj))
    setNewForm(EMPTY_NEW)
    setNewError('')
    setShowNew(true)
  }

  async function handleSaveNew(e) {
    e.preventDefault()
    if (!newForm.title.trim()) { setNewError('Başlık gerekli'); return }
    setNewSaving(true)
    setNewError('')
    try {
      await api.post('/calendar', {
        title: newForm.title.trim(),
        type: newForm.type,
        notes: newForm.notes,
        scheduled_date: newDay,
        status: 'planned',
      })
      setShowNew(false)
      fetchItems()
    } catch (err) {
      setNewError(err.message || 'Kayıt başarısız')
    } finally {
      setNewSaving(false)
    }
  }

  // Edit item handlers
  function openEdit(item, e) {
    e.stopPropagation()
    setEditItem(item)
    setEditForm({ title: item.title || '', status: item.status || 'planned', notes: item.notes || '' })
    setEditError('')
    setEditDeleting(false)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editForm.title.trim()) { setEditError('Başlık gerekli'); return }
    setEditSaving(true)
    setEditError('')
    try {
      await api.put(`/calendar/${editItem.id}`, {
        title: editForm.title.trim(),
        status: editForm.status,
        notes: editForm.notes,
      })
      setEditItem(null)
      fetchItems()
    } catch (err) {
      setEditError(err.message || 'Güncelleme başarısız')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    setEditDeleting(true)
    try {
      await api.del(`/calendar/${editItem.id}`)
      setEditItem(null)
      fetchItems()
    } catch (err) {
      setEditError(err.message || 'Silme başarısız')
      setEditDeleting(false)
    }
  }

  // Drag & drop
  function handleDragStart(itemId) {
    dragId.current = itemId
  }

  async function handleDrop(dateObj) {
    if (!dragId.current) return
    const newDate = toYMD(dateObj)
    try {
      await api.put(`/calendar/${dragId.current}`, { scheduled_date: newDate })
      fetchItems()
    } catch {
      // ignore
    }
    dragId.current = null
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  return (
    <div className="flex gap-4">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-[#111827]">İçerik Takvimi</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] text-sm"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-[#111827] min-w-[120px] text-center">
              {TR_MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] text-sm"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Type legend */}
        <div className="flex gap-3 mb-3">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              <span className="text-xs text-[#6B7280]">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid header */}
        <div className="grid grid-cols-7 border-l border-t border-[#E5E7EB]">
          {DAY_LABELS.map(d => (
            <div key={d} className="border-r border-b border-[#E5E7EB] px-2 py-1.5 text-xs font-medium text-[#6B7280] bg-[#F9FAFB]">
              {d}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        {loading ? (
          <div className="text-xs text-[#6B7280] py-8 text-center">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-7 border-l border-[#E5E7EB]">
            {cells.map((cellDate, i) => {
              const isCurrentMonth = cellDate.getMonth() === month
              const isToday = toYMD(cellDate) === toYMD(today)
              const dayItems = itemsForDay(cellDate)

              return (
                <div
                  key={i}
                  className="border-r border-b border-[#E5E7EB] min-h-[90px] p-1.5 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                  onClick={() => openNew(cellDate)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(cellDate)}
                >
                  <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#2563EB] text-white' : isCurrentMonth ? 'text-[#111827]' : 'text-[#D1D5DB]'}`}>
                    {cellDate.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayItems.map(it => (
                      <div
                        key={it.id}
                        draggable
                        onDragStart={() => handleDragStart(it.id)}
                        onClick={e => openEdit(it, e)}
                        className="text-white text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: TYPE_COLORS[it.type] || '#6B7280' }}
                        title={it.title}
                      >
                        {it.title}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right sidebar: Upcoming 7 days */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-xs font-semibold text-[#374151] mb-3">Yaklaşan 7 Gün</div>
          {upcoming.length === 0 ? (
            <div className="text-xs text-[#9CA3AF]">Yaklaşan içerik yok.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map(it => (
                <div key={it.id} className="flex items-start gap-2">
                  <span
                    className="inline-block mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[it.type] || '#6B7280' }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-[#111827] truncate">{it.title}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{it.scheduled_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New item modal */}
      {showNew && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowNew(false)}
        >
          <div
            className="bg-white rounded-md border border-[#E5E7EB] p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[#111827] mb-4">
              Yeni Plan — {newDay}
            </div>
            <form onSubmit={handleSaveNew} className="flex flex-col gap-3">
              {newError && (
                <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
                  {newError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Başlık</label>
                <input
                  value={newForm.title}
                  onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
                  placeholder="İçerik başlığı"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Tür</label>
                <select
                  value={newForm.type}
                  onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Notlar</label>
                <textarea
                  value={newForm.notes}
                  onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] resize-none"
                  placeholder="İsteğe bağlı notlar"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={newSaving}
                  className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2"
                >
                  {newSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setEditItem(null)}
        >
          <div
            className="bg-white rounded-md border border-[#E5E7EB] p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[#111827] mb-4">Düzenle</div>
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              {editError && (
                <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Başlık</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Durum</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Notlar</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] resize-none"
                />
              </div>
              <div className="flex gap-2 justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={editDeleting}
                  className="text-xs font-medium text-[#DC2626] border border-[#FECACA] rounded-md px-4 py-2 hover:bg-[#FEF2F2] disabled:opacity-50"
                >
                  {editDeleting ? 'Siliniyor...' : 'Sil'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditItem(null)}
                    className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2"
                  >
                    {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
