import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'
import HarveyBall from '../../components/HarveyBall'

const SCORE_DIMENSIONS = [
  ['product_quality', 'Ürün/Hizmet Kalitesi'],
  ['price_competitiveness', 'Fiyat Rekabetçiliği'],
  ['market_reach', 'Pazar Erişimi'],
  ['brand_awareness', 'Marka Bilinirliği'],
  ['innovation', 'İnovasyon'],
  ['customer_experience', 'Müşteri Deneyimi'],
]

function Badge({ text, color }) {
  const styles = {
    green: 'bg-[#ECFDF5] text-[#059669]',
    red: 'bg-[#FEF2F2] text-[#DC2626]',
    blue: 'bg-[#EFF6FF] text-[#2563EB]',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded mr-1 mb-1 ${styles[color]}`}>
      {text}
    </span>
  )
}

function CompetitorCard({ competitor, onAnalyze, onDelete, analyzing, t }) {
  let analysis = null
  if (competitor.analysis) {
    try {
      analysis = typeof competitor.analysis === 'string'
        ? JSON.parse(competitor.analysis)
        : competitor.analysis
    } catch {
      // not JSON
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-semibold text-[#111827]">{competitor.name}</div>
          {competitor.website && (
            <a
              href={competitor.website.startsWith('http') ? competitor.website : `https://${competitor.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#2563EB] hover:underline"
            >
              {competitor.website}
            </a>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!analysis && (
            <button
              onClick={() => onAnalyze(competitor.id)}
              disabled={analyzing}
              className="text-xs px-3 py-1.5 border border-[#2563EB] text-[#2563EB] rounded-md hover:bg-[#EFF6FF] disabled:opacity-50"
            >
              {analyzing ? t('Analiz ediliyor...') : t('OperIQ ile Analiz Et')}
            </button>
          )}
          <button
            onClick={() => onDelete(competitor.id, competitor.name)}
            className="text-xs px-2 py-1.5 border border-[#E5E7EB] text-[#9CA3AF] rounded-md hover:border-[#DC2626] hover:text-[#DC2626]"
          >
            {t('Sil')}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-2">
          {analysis.sector && (
            <div className="text-xs text-[#6B7280]">
              <span className="font-medium text-[#374151]">{t('Sektör')}:</span> {analysis.sector}
            </div>
          )}
          {analysis.description && (
            <div className="text-xs text-[#6B7280]">{analysis.description}</div>
          )}
          {analysis.scores && (
            <div className="space-y-2 pt-1">
              {(analysis.competitor_position || analysis.own_position) && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.competitor_position && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#FFF7ED] text-[#C2410C]">
                      {t('Rakip')}: {analysis.competitor_position}
                    </span>
                  )}
                  {analysis.own_position && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB]">
                      {t('Sen')}: {analysis.own_position}
                    </span>
                  )}
                </div>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6B7280]">
                    <th className="text-left font-medium py-1">{t('Boyut')}</th>
                    <th className="text-center font-medium py-1">{t('Rakip')}</th>
                    <th className="text-center font-medium py-1">{t('Sen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE_DIMENSIONS.map(([key, label]) => (
                    <tr key={key} className="border-t border-[#F3F4F6]">
                      <td className="py-1 text-[#374151]">{t(label)}</td>
                      <td className="py-1 text-center"><HarveyBall value={analysis.scores.competitor?.[key]} /></td>
                      <td className="py-1 text-center"><HarveyBall value={analysis.scores.own?.[key]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {analysis.position_summary && (
                <div>
                  <div className="text-xs font-semibold text-[#374151] mb-1 uppercase tracking-wide">{t('Pazardaki Konumun')}</div>
                  <div className="text-xs text-[#6B7280]">{analysis.position_summary}</div>
                </div>
              )}
              {analysis.improvement_areas?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#374151] mb-1 uppercase tracking-wide">{t('Geliştirmen Gereken Alanlar')}</div>
                  <ul className="list-disc list-inside text-xs text-[#6B7280] space-y-0.5">
                    {analysis.improvement_areas.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          {analysis.strengths?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#374151] mb-1 uppercase tracking-wide">{t('Güçlü Yönler')}</div>
              <div>
                {analysis.strengths.map((s, i) => <Badge key={i} text={s} color="green" />)}
              </div>
            </div>
          )}
          {analysis.weaknesses?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#374151] mb-1 uppercase tracking-wide">{t('Zayıf Yönler')}</div>
              <div>
                {analysis.weaknesses.map((w, i) => <Badge key={i} text={w} color="red" />)}
              </div>
            </div>
          )}
          {analysis.opportunities?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#374151] mb-1 uppercase tracking-wide">{t('Fırsatlar')}</div>
              <div>
                {analysis.opportunities.map((o, i) => <Badge key={i} text={o} color="blue" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Competitors() {
  const { t } = useT()
  const [competitors, setCompetitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [adding, setAdding] = useState(false)
  const [analyzingId, setAnalyzingId] = useState(null)

  useEffect(() => {
    api.get('/competitors')
      .then(res => setCompetitors(res.competitors || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    if (!name.trim()) return
    setAdding(true)
    try {
      const res = await api.post('/competitors', { name: name.trim(), website: website.trim() })
      setCompetitors(prev => [
        { id: res.id, name: name.trim(), website: website.trim(), analysis: null, created_at: new Date().toISOString() },
        ...prev,
      ])
      setName('')
      setWebsite('')
    } catch {
      // ignore
    } finally {
      setAdding(false)
    }
  }

  async function handleAnalyze(id) {
    setAnalyzingId(id)
    try {
      const res = await api.post(`/competitors/${id}/analyze`, {})
      setCompetitors(prev =>
        prev.map(c => c.id === id ? { ...c, analysis: JSON.stringify(res.analysis) } : c)
      )
    } catch {
      // ignore
    } finally {
      setAnalyzingId(null)
    }
  }

  function handleDelete(id, compName) {
    if (!window.confirm(`"${compName}" ${t('rakibini silmek istediğinizden emin misiniz?')}`)) return
    api.del(`/competitors/${id}`)
      .then(() => setCompetitors(prev => prev.filter(c => c.id !== id)))
      .catch(() => {})
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-[#111827]">{t('Rakip Analizi')}</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">{t('Rakip firmalarınızı ekleyin ve OperIQ ile analiz ettirin.')}</p>
      </div>

      {/* Add form */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
        <div className="text-xs font-semibold text-[#374151] mb-3">{t('Rakip Ekle')}</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('Firma adı')}
            className="flex-1 text-xs border border-[#E5E7EB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]"
          />
          <input
            type="text"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="Website URL"
            className="flex-1 text-xs border border-[#E5E7EB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim()}
            className="text-xs px-4 py-2 bg-[#2563EB] text-white rounded-md hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {adding ? t('Ekleniyor...') : t('Ekle')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
      ) : competitors.length === 0 ? (
        <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Henüz rakip eklenmedi.')}</div>
      ) : (
        <div className="space-y-3">
          {competitors.map(c => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onAnalyze={handleAnalyze}
              onDelete={handleDelete}
              analyzing={analyzingId === c.id}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}
