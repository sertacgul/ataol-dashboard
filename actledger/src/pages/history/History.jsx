import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

const LIMIT = 30

const MODULE_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'email-finder', label: 'Email Bulucu' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'ai', label: 'AI' },
  { value: 'seo', label: 'SEO' },
  { value: 'maps', label: 'Maps' },
  { value: 'competitors', label: 'Rakip Analizi' },
  { value: 'profile', label: 'Profil' },
]

function moduleLabel(mod) {
  const found = MODULE_OPTIONS.find(o => o.value === mod)
  return found ? found.label : mod
}

function DetailValue({ value }) {
  if (value === null || value === undefined) {
    return <div className="text-sm text-[#6B7280]">-</div>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <div className="text-sm text-[#6B7280]">-</div>
    return (
      <ul className="list-disc pl-5 text-sm text-[#111827] space-y-0.5">
        {value.map((item, i) => (
          <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <pre className="text-xs text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <div className="text-sm text-[#111827] whitespace-pre-line">{String(value)}</div>
}

export default function History() {
  const { t } = useT()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [moduleFilter, setModuleFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get(`/activity?page=${page}&limit=${LIMIT}` + (moduleFilter ? `&module=${moduleFilter}` : ''))
      .then(data => {
        if (cancelled) return
        setItems(data.items || [])
        setTotal(data.total || 0)
      })
      .catch(() => {
        if (cancelled) return
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, moduleFilter])

  async function openDetail(id) {
    try {
      const data = await api.get('/activity/' + id)
      setSelected(data)
    } catch {
      setSelected(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-[#111827]">{t('Geçmiş')}</h1>
        <select
          value={moduleFilter}
          onChange={e => { setModuleFilter(e.target.value); setPage(1) }}
          className="text-xs font-medium border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#374151] bg-white focus:outline-none focus:border-[#2563EB]"
        >
          {MODULE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{t(o.label)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md">
        {loading ? (
          <div className="text-xs text-[#9CA3AF] p-6">{t('Yükleniyor...')}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[#6B7280] p-6">{t('Henüz kayıt yok')}</div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {items.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => openDetail(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors"
                >
                  <span className="text-[11px] font-medium text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded px-2 py-0.5 whitespace-nowrap">
                    {t(moduleLabel(item.module))}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-[#111827] truncate">{item.title}</span>
                  <span className="text-xs text-[#9CA3AF] whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('tr-TR')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && total > LIMIT && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            {t('Önceki')}
          </button>
          <span className="text-xs text-[#6B7280]">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => (p < totalPages ? p + 1 : p))}
            disabled={page >= totalPages}
            className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            {t('Sonraki')}
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white border border-[#E5E7EB] rounded-md w-full max-w-lg my-8 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <div className="text-sm font-semibold text-[#111827]">{selected.title}</div>
              <button
                onClick={() => setSelected(null)}
                className="text-[#9CA3AF] hover:text-[#6B7280]"
                title={t('Kapat')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[#6B7280] mb-0.5">{t('Modül')}</div>
                  <div className="text-sm text-[#111827]">{t(moduleLabel(selected.module))}</div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280] mb-0.5">{t('İşlem')}</div>
                  <div className="text-sm text-[#111827]">{selected.action || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[#6B7280] mb-0.5">{t('Tarih')}</div>
                  <div className="text-sm text-[#111827]">
                    {new Date(selected.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>

              {selected.detail !== null && selected.detail !== undefined && selected.detail !== '' && (
                <div className="border-t border-[#E5E7EB] pt-3">
                  <div className="text-xs font-semibold text-[#374151] mb-2">{t('Detay')}</div>
                  {typeof selected.detail === 'object' && !Array.isArray(selected.detail) ? (
                    <div className="flex flex-col gap-3">
                      {Object.keys(selected.detail).map(key => (
                        <div key={key}>
                          <div className="text-xs text-[#6B7280] mb-0.5">{key}</div>
                          <DetailValue value={selected.detail[key]} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <DetailValue value={selected.detail} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
