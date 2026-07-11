import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

const EMPTY_DATA = {
  partners: [],
  activities: [],
  resources: [],
  value_propositions: [],
  relationships: [],
  channels: [],
  segments: [],
  cost_structure: [],
  revenue_streams: [],
}

const SECTIONS = [
  { key: 'partners', title: 'Temel Ortaklar', subtitle: 'Key Partners', color: '#2563EB' },
  { key: 'activities', title: 'Temel Faaliyetler', subtitle: 'Key Activities', color: '#059669' },
  { key: 'resources', title: 'Temel Kaynaklar', subtitle: 'Key Resources', color: '#7C3AED' },
  { key: 'value_propositions', title: 'Değer Önerileri', subtitle: 'Value Propositions', color: '#D97706' },
  { key: 'relationships', title: 'Müşteri İlişkileri', subtitle: 'Customer Relationships', color: '#DC2626' },
  { key: 'channels', title: 'Kanallar', subtitle: 'Channels', color: '#0077B5' },
  { key: 'segments', title: 'Müşteri Segmentleri', subtitle: 'Customer Segments', color: '#E4405F' },
  { key: 'cost_structure', title: 'Maliyet Yapısı', subtitle: 'Cost Structure', color: '#1877F2' },
  { key: 'revenue_streams', title: 'Gelir Akışları', subtitle: 'Revenue Streams', color: '#6366F1' },
]

function Section({ section, items, onAdd, onDelete, t }) {
  const [inputVal, setInputVal] = useState('')

  function handleAdd() {
    const v = inputVal.trim()
    if (!v) return
    onAdd(section.key, v)
    setInputVal('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div
      className="bg-white border border-[#E5E7EB] rounded-md flex flex-col"
      style={{ borderTop: `3px solid ${section.color}`, minHeight: '200px' }}
    >
      <div className="px-3 pt-3 pb-2 border-b border-[#F3F4F6]">
        <div className="text-xs font-semibold text-[#111827]">{t(section.title)}</div>
        <div className="text-xs text-[#9CA3AF]">{t(section.subtitle)}</div>
      </div>
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1 group">
            <span className="flex-1 text-xs text-[#374151] leading-relaxed">{item}</span>
            <button
              onClick={() => onDelete(section.key, i)}
              className="text-[#9CA3AF] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-[#D1D5DB] italic">{t('Henüz öğe yok')}</div>
        )}
      </div>
      <div className="px-3 pb-3 flex gap-1">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('Ekle...')}
          className="flex-1 text-xs border border-[#E5E7EB] rounded px-2 py-1 focus:outline-none focus:border-[#2563EB]"
        />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8]"
        >
          {t('Ekle')}
        </button>
      </div>
    </div>
  )
}

export default function Bmc() {
  const { t } = useT()
  const [data, setData] = useState(EMPTY_DATA)
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/bmc'),
      api.get('/profile'),
    ]).then(([bmcRes, profileRes]) => {
      if (bmcRes.bmc) {
        setExists(true)
        try {
          const parsed = typeof bmcRes.bmc.data === 'string'
            ? JSON.parse(bmcRes.bmc.data)
            : bmcRes.bmc.data
          setData({ ...EMPTY_DATA, ...parsed })
        } catch {
          // keep default
        }
      }
      if (profileRes.profile) setProfile(profileRes.profile)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save(newData) {
    try {
      if (exists) {
        await api.put('/bmc', { data: newData })
      } else {
        await api.post('/bmc', { data: newData })
        setExists(true)
      }
    } catch {
      // ignore save errors silently
    }
  }

  function onAdd(key, value) {
    const newData = { ...data, [key]: [...(data[key] || []), value] }
    setData(newData)
    save(newData)
  }

  function onDelete(key, index) {
    const newItems = data[key].filter((_, i) => i !== index)
    const newData = { ...data, [key]: newItems }
    setData(newData)
    save(newData)
  }

  async function handleAiFill() {
    setAiLoading(true)
    try {
      const profileContext = profile
        ? `Firma: ${profile.company_name || ''}\nSektör: ${profile.sector || ''}\nAçıklama: ${profile.description || ''}\nDeğer Önerisi: ${profile.value_proposition || ''}\nHedef Kitle: ${profile.target_audience || ''}\nÜrün/Hizmetler: ${profile.products_services || ''}`
        : ''

      const prompt = `${profileContext ? `Firma Bağlamı:\n${profileContext}\n\n` : ''}Bu firma için Business Model Canvas (BMC) oluştur. Aşağıdaki JSON formatında yanıt ver:

{
  "partners": ["ortak 1", "ortak 2"],
  "activities": ["faaliyet 1", "faaliyet 2"],
  "resources": ["kaynak 1", "kaynak 2"],
  "value_propositions": ["değer önerisi 1", "değer önerisi 2"],
  "relationships": ["ilişki 1", "ilişki 2"],
  "channels": ["kanal 1", "kanal 2"],
  "segments": ["segment 1", "segment 2"],
  "cost_structure": ["maliyet 1", "maliyet 2"],
  "revenue_streams": ["gelir akışı 1", "gelir akışı 2"]
}

Her alanda 3-5 madde olsun. Sadece JSON formatında yanıt ver.`

      const res = await api.post('/ai/generate', { prompt })
      const text = res.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        const newData = { ...EMPTY_DATA }
        for (const key of Object.keys(EMPTY_DATA)) {
          if (Array.isArray(parsed[key])) {
            newData[key] = [...(data[key] || []), ...parsed[key]]
          } else {
            newData[key] = data[key] || []
          }
        }
        setData(newData)
        save(newData)
      }
    } catch {
      // ignore
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  const top5Keys = ['partners', 'activities', 'resources', 'value_propositions', 'relationships', 'channels', 'segments']
  const bottomKeys = ['cost_structure', 'revenue_streams']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-[#111827]">Business Model Canvas</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">{t('İş modelinizi görselleştirin ve düzenleyin.')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAiFill}
            disabled={aiLoading}
            className="text-xs px-3 py-1.5 border border-[#2563EB] text-[#2563EB] rounded-md hover:bg-[#EFF6FF] disabled:opacity-50"
          >
            {aiLoading ? t('OperIQ düşünüyor...') : t('OperIQ ile Doldur')}
          </button>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 border border-[#E5E7EB] text-[#374151] rounded-md hover:bg-[#F9FAFB]"
          >
            {t('Yazdır')}
          </button>
        </div>
      </div>

      {/* Top row: 5+2 columns = partners | activities+resources | value_propositions | relationships+channels | segments */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr 1.2fr 1fr 1fr' }}>
        {/* Partners */}
        <Section
          section={SECTIONS[0]}
          items={data.partners}
          onAdd={onAdd}
          onDelete={onDelete}
          t={t}
        />

        {/* Activities + Resources stacked */}
        <div className="flex flex-col gap-2">
          <Section
            section={SECTIONS[1]}
            items={data.activities}
            onAdd={onAdd}
            onDelete={onDelete}
          />
          <Section
            section={SECTIONS[2]}
            items={data.resources}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        </div>

        {/* Value Propositions */}
        <Section
          section={SECTIONS[3]}
          items={data.value_propositions}
          onAdd={onAdd}
          onDelete={onDelete}
          t={t}
        />

        {/* Relationships + Channels stacked */}
        <div className="flex flex-col gap-2">
          <Section
            section={SECTIONS[4]}
            items={data.relationships}
            onAdd={onAdd}
            onDelete={onDelete}
          />
          <Section
            section={SECTIONS[5]}
            items={data.channels}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        </div>

        {/* Segments */}
        <Section
          section={SECTIONS[6]}
          items={data.segments}
          onAdd={onAdd}
          onDelete={onDelete}
          t={t}
        />
      </div>

      {/* Bottom row: cost_structure | revenue_streams */}
      <div className="grid grid-cols-2 gap-2">
        <Section
          section={SECTIONS[7]}
          items={data.cost_structure}
          onAdd={onAdd}
          onDelete={onDelete}
          t={t}
        />
        <Section
          section={SECTIONS[8]}
          items={data.revenue_streams}
          onAdd={onAdd}
          onDelete={onDelete}
          t={t}
        />
      </div>
    </div>
  )
}
