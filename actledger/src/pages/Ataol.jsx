import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'

export const PLATFORMS = [
  { key: 'strategythrust', name: 'StrategyThrust', url: 'strategythrust.com' },
  { key: 'actledger', name: 'ActLedger', url: 'actledger.com' },
  { key: 'ataol_lab', name: 'ATAOL AI Lab', url: 'ataolai.tech' },
  { key: 'ataol_institute', name: 'ATAOL AI Institute', url: 'ataolai.tech' },
]

function isAtaol(user) {
  return !!user?.email && user.email.toLowerCase().endsWith('@strategythrust.com')
}

export default function Ataol() {
  const { t } = useT()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const platform = PLATFORMS.find(p => p.key === params.get('platform')) ? params.get('platform') : 'strategythrust'
  const activePlatform = PLATFORMS.find(p => p.key === platform)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [target, setTarget] = useState(null)
  const [loadingTarget, setLoadingTarget] = useState(false)
  const [sentiment, setSentiment] = useState('')
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [email, setEmail] = useState(null)
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function setPlatform(key) {
    setParams({ platform: key })
    setEmail(null)
  }

  useEffect(() => { setEmail(null) }, [platform])

  if (!isAtaol(user)) {
    return <div className="text-sm text-[#6B7280] py-12 text-center">{t('Bu sayfaya erişim yetkiniz yok.')}</div>
  }

  async function handleSearch(e) {
    e?.preventDefault()
    if (!query.trim()) return
    setSearching(true); setError(''); setResults([]); setTarget(null); setSentiment(''); setEmail(null)
    try {
      const data = await api.post('/maps/search', { query: query.trim() })
      setResults(data.places || [])
    } catch (err) { setError(err.message) } finally { setSearching(false) }
  }

  async function selectTarget(place) {
    setLoadingTarget(true); setError(''); setResults([]); setSentiment(''); setEmail(null)
    try {
      const data = await api.post('/maps/details', { place_id: place.place_id })
      setTarget(data)
    } catch (err) { setError(err.message) } finally { setLoadingTarget(false) }
  }

  async function runSentiment() {
    if (!target?.reviews?.length) return
    setSentimentLoading(true); setError('')
    try {
      const data = await api.post('/maps/sentiment', { reviews: target.reviews, company_name: target.name })
      setSentiment(data.result || '')
    } catch (err) { setError(err.message) } finally { setSentimentLoading(false) }
  }

  async function compose() {
    if (!target) return
    setComposing(true); setError(''); setEmail(null)
    try {
      const data = await api.post('/ataol/compose', {
        platform,
        target_company: target.name,
        target_location: target.address || '',
        sentiment: sentiment || '',
      })
      setEmail({ subject: data.subject, body: data.body })
    } catch (err) { setError(err.message) } finally { setComposing(false) }
  }

  function copyEmail() {
    navigator.clipboard.writeText(`${t('Konu')}: ${email.subject}\n\n${email.body}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  function openInGmail() {
    const su = encodeURIComponent(email.subject || '')
    const body = encodeURIComponent(email.body || '')
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${body}`, '_blank', 'noopener')
  }

  async function saveToOutreach() {
    try {
      await api.post('/outreach', { subject: email.subject, body: email.body, status: 'draft' })
      setError('')
      alert(t('Outreach bölümüne taslak olarak kaydedildi.'))
    } catch (err) { setError(err.message) }
  }

  const labelCls = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-base font-semibold text-[#111827]">ATAOL AI Techs</h1>
        <span className="text-[10px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded px-1.5 py-0.5">{t('Yetkili')}</span>
      </div>
      <p className="text-xs text-[#6B7280] mb-5">{t('Platform seçin, hedef firmayı bulun, Google yorum analiziyle birlikte platforma özel mail üretin.')}</p>

      {/* Platform selector */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
        <label className={labelCls}>{t('Platform / Hizmet')}</label>
        <select
          value={platform}
          onChange={e => setPlatform(e.target.value)}
          className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-2 bg-white text-[#111827] focus:outline-none focus:border-[#2563EB]"
        >
          {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
        <p className="text-[11px] text-[#9CA3AF] mt-1.5">{t('Mail metni bu platform adına ve değer önerisine göre yazılır.')} · {activePlatform.url}</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{error}</div>
      )}

      {/* Target search */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
        <label className={labelCls}>{t('Hedef Firma (Google Maps)')}</label>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Firma adı ve şehir...')}
            className="flex-1 text-sm border border-[#E5E7EB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB]"
          />
          <button type="submit" disabled={searching}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4">
            {searching ? t('Aranıyor...') : t('Ara')}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-3 border border-[#E5E7EB] rounded-md divide-y divide-[#F3F4F6]">
            {results.map(r => (
              <button key={r.place_id} onClick={() => selectTarget(r)}
                className="w-full text-left px-3 py-2 hover:bg-[#F9FAFB]">
                <div className="text-sm font-medium text-[#111827]">{r.name}</div>
                <div className="text-xs text-[#9CA3AF]">{r.address}{r.rating ? ` · ${r.rating}★ (${r.user_ratings_total || 0})` : ''}</div>
              </button>
            ))}
          </div>
        )}
        {loadingTarget && <div className="text-xs text-[#9CA3AF] mt-2">{t('Firma bilgileri alınıyor...')}</div>}
      </div>

      {/* Selected target + sentiment */}
      {target && (
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-[#111827]">{target.name}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{target.address}</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5">
                {target.rating ? `${target.rating}★ · ${target.user_ratings_total || 0} yorum` : t('Puan yok')}
                {target.website ? ` · ${target.website}` : ''}
              </div>
            </div>
            {target.reviews?.length > 0 && (
              <button onClick={runSentiment} disabled={sentimentLoading}
                className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-50 rounded-md px-3 py-1.5">
                {sentimentLoading ? t('Analiz ediliyor...') : t('Sentiment Analizi')}
              </button>
            )}
          </div>

          {sentiment && (
            <div className="mt-3 text-sm text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2 whitespace-pre-wrap">
              {sentiment}
            </div>
          )}

          <div className="mt-4">
            <button onClick={compose} disabled={composing}
              className="text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-4 py-2">
              {composing ? t('OperIQ oluşturuyor...') : `${activePlatform.name} ${t('adına mail oluştur')}`}
            </button>
            {sentiment && <span className="text-[11px] text-[#9CA3AF] ml-2">{t('Sentiment maile dahil edilecek')}</span>}
          </div>
        </div>
      )}

      {/* Generated email */}
      {email && (
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-[#374151]">{activePlatform.name} → {target?.name}</div>
            <div className="flex items-center gap-2">
              <button onClick={copyEmail} className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5">
                {copied ? t('Kopyalandı') : t('Kopyala')}
              </button>
              <button onClick={openInGmail} className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5">
                {t('Gmail\'de Aç')}
              </button>
              <button onClick={saveToOutreach} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5">
                {t('Outreach\'e Kaydet')}
              </button>
            </div>
          </div>
          <div className="text-xs font-medium text-[#374151] mb-1">{t('Konu')}</div>
          <div className="text-sm text-[#111827] mb-3">{email.subject}</div>
          <div className="text-xs font-medium text-[#374151] mb-1">{t('İçerik')}</div>
          <div className="text-sm text-[#111827] whitespace-pre-wrap bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2">{email.body}</div>
        </div>
      )}
    </div>
  )
}
