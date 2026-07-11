import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', limit: 1300, limitLabel: '1300 karakter' },
  { value: 'twitter', label: 'Twitter/X', limit: 280, limitLabel: '280 karakter' },
  { value: 'instagram', label: 'Instagram', limit: 2200, limitLabel: '2200 karakter' },
  { value: 'facebook', label: 'Facebook', limit: 5000, limitLabel: '5000 karakter' },
]

const PLATFORM_PROMPTS = {
  linkedin: 'profesyonel, uzun, değer odaklı LinkedIn postu',
  twitter: 'kısa, etkili, punch Twitter/X postu (max 280 karakter)',
  instagram: 'görsel anlatım, hashtag ağırlıklı Instagram caption',
  facebook: 'samimi, paylaşılabilir Facebook postu',
}

const inputClass = 'w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

export default function SocialNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [platform, setPlatform] = useState('linkedin')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [hashtagLoading, setHashtagLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileContext, setProfileContext] = useState('')

  const selected = PLATFORMS.find(p => p.value === platform)
  const charCount = content.length
  const overLimit = charCount > selected.limit

  useEffect(() => {
    api.get('/profile').then(data => {
      const p = data.profile
      if (!p) return
      const ctx = [
        p.company_name && `Firma: ${p.company_name}`,
        p.sector && `Sektör: ${p.sector}`,
        p.description && `Açıklama: ${p.description}`,
        p.value_proposition && `Değer Önerisi: ${p.value_proposition}`,
        p.target_audience && `Hedef Kitle: ${p.target_audience}`,
        p.tone && `Ton: ${p.tone}`,
      ].filter(Boolean).join('\n')
      setProfileContext(ctx)
    }).catch(() => {})
  }, [])

  async function handleGenerate() {
    setAiLoading(true)
    setError('')
    try {
      const prompt = `${profileContext ? profileContext + '\n\n' : ''}Yukarıdaki firma için ${PLATFORM_PROMPTS[platform]} yaz. Sadece post içeriğini ver, açıklama ekleme.`
      const data = await api.post('/ai/generate', { prompt })
      setContent(data.text || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleHashtagSuggest() {
    if (!content) { setError('Önce içerik girin.'); return }
    setHashtagLoading(true)
    setError('')
    try {
      const prompt = `Aşağıdaki ${platform} postu için en uygun 5-10 hashtag öner. Sadece virgülle ayrılmış hashtag listesi ver, başka bir şey yazma.\n\n${content}`
      const data = await api.post('/ai/generate', { prompt })
      setHashtags(data.text?.replace(/#/g, '').replace(/\s+/g, ' ').trim() || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setHashtagLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.post('/social', {
        platform,
        content,
        hashtags,
        status: 'draft',
      })
      navigate('/app/social')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/social" className="text-xs text-[#6B7280] hover:text-[#111827]">{t('Sosyal Medya')}</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{t('Yeni Post')}</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-4">
        {/* Platform selector */}
        <div className="mb-4">
          <label className={labelClass}>{t('Platform')}</label>
          <div className="flex gap-2 flex-wrap">
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`text-xs rounded-md px-3 py-1.5 border transition-colors ${
                  platform === p.value
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
                }`}
              >
                {p.label}
                <span className="ml-1 opacity-70">({p.limitLabel})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div className="mb-4">
          <button
            onClick={handleGenerate}
            disabled={aiLoading}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {aiLoading ? t('Oluşturuluyor...') : t('OperIQ ile Oluştur')}
          </button>
        </div>

        {/* Content textarea */}
        <div className="mb-1">
          <label className={labelClass}>{t('İçerik')}</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            className={`${inputClass} resize-y`}
            placeholder="Post içeriği..."
          />
        </div>
        <div className="flex justify-end mb-4">
          <span className={`text-xs ${overLimit ? 'text-[#DC2626] font-medium' : 'text-[#9CA3AF]'}`}>
            {charCount} / {selected.limit}
            {overLimit && ' - karakter sınırı aşıldı'}
          </span>
        </div>

        {/* Hashtags */}
        <div className="mb-4">
          <label className={labelClass}>Hashtagler (virgülle ayırın)</label>
          <div className="flex gap-2">
            <input
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              className={inputClass}
              placeholder="pazarlama, sosyalmedya, içerik"
            />
            <button
              onClick={handleHashtagSuggest}
              disabled={hashtagLoading}
              className="text-xs font-medium text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-50 rounded-md px-3 py-1.5 whitespace-nowrap"
            >
              {hashtagLoading ? '...' : t('OperIQ Hashtag Öner')}
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {saving ? t('Kaydediliyor...') : t('Kaydet')}
          </button>
          <Link
            to="/app/social"
            className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md px-4 py-1.5"
          >
            {t('İptal')}
          </Link>
        </div>
      </div>
    </div>
  )
}
