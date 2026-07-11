import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

const STEP_LABELS = [
  'Trend Araştırması',
  'Konu Seçimi',
  'TR İçerik',
  'EN Çeviri',
  'SEO Kontrol',
  'Yayın',
]

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  isActive
                    ? 'bg-[#2563EB] border-[#2563EB] text-white'
                    : isCompleted
                    ? 'bg-white border-[#2563EB] text-[#2563EB]'
                    : 'bg-white border-[#E5E7EB] text-[#9CA3AF]'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${isActive ? 'text-[#2563EB] font-medium' : 'text-[#9CA3AF]'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 w-8 mb-4 mx-1 ${step < currentStep ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function calcKeywordDensity(text, keywords) {
  if (!text || !keywords) return 0
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 0
  const kwList = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
  let count = 0
  for (const kw of kwList) {
    for (const w of words) {
      if (w.includes(kw)) count++
    }
  }
  return Math.round((count / words.length) * 100 * 10) / 10
}

export default function SeoNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [articleId, setArticleId] = useState(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [researchSector, setResearchSector] = useState('')
  const [researchLoading, setResearchLoading] = useState(false)
  const [trendResults, setTrendResults] = useState([])
  const [profileContext, setProfileContext] = useState('')

  // Step 2
  const [selectedTopic, setSelectedTopic] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [title, setTitle] = useState('')

  // Step 3
  const [bodyTr, setBodyTr] = useState('')
  const [keywords, setKeywords] = useState('')
  const [keywordDensity, setKeywordDensity] = useState(0)
  const [contentLoading, setContentLoading] = useState(false)

  // Step 4
  const [bodyEn, setBodyEn] = useState('')
  const [translateLoading, setTranslateLoading] = useState(false)

  // Step 5
  const [seoScore, setSeoScore] = useState(null)
  const [seoSuggestions, setSeoSuggestions] = useState([])
  const [checkLoading, setCheckLoading] = useState(false)

  // Load profile context once
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
      if (p.sector && !researchSector) setResearchSector(p.sector)
    }).catch(() => {})
  }, [])

  // On mount: create new article OR load existing
  useEffect(() => {
    if (editId) {
      setArticleId(editId)
      api.get(`/seo/${editId}`).then(data => {
        const a = data.article
        setTitle(a.title || '')
        setSelectedTopic(a.topic || '')
        setBodyTr(a.body_tr || '')
        setBodyEn(a.body_en || '')
        setKeywords(a.keywords || '')
        setKeywordDensity(a.keyword_density || 0)
        setSeoScore(a.seo_score ?? null)
        setStep(a.step || 1)
      }).catch(() => setError('Makale yüklenemedi.'))
    } else {
      api.post('/seo', {}).then(data => {
        setArticleId(data.id)
      }).catch(() => setError('Makale oluşturulamadı.'))
    }
  }, [editId])

  const saveArticle = useCallback(async (fields) => {
    if (!articleId) return
    setSaving(true)
    try {
      await api.put(`/seo/${articleId}`, fields)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [articleId])

  async function goNext() {
    setError('')
    const topic = selectedTopic || customTopic
    let fields = { step: step + 1 }

    if (step === 1) {
      fields = { ...fields, topic, title: title || topic }
    } else if (step === 2) {
      fields = { ...fields, title: title || topic, topic }
    } else if (step === 3) {
      fields = { ...fields, body_tr: bodyTr, keywords, keyword_density: keywordDensity }
    } else if (step === 4) {
      fields = { ...fields, body_en: bodyEn }
    } else if (step === 5) {
      fields = { ...fields, seo_score: seoScore }
    }

    await saveArticle(fields)
    setStep(s => Math.min(s + 1, 6))
  }

  async function goPrev() {
    setError('')
    await saveArticle({ step: step - 1 })
    setStep(s => Math.max(s - 1, 1))
  }

  // Step 1: research trends
  async function handleResearch() {
    setResearchLoading(true)
    setTrendResults([])
    setError('')
    try {
      const prompt = `${researchSector || 'dijital pazarlama'} sektöründe şu anda trend olan SEO blog konularını listele. 3-5 adet konu öner. Her konuyu numaralandırılmış liste olarak ver (1. Konu, 2. Konu gibi). Konular özgün, araştırılabilir ve uzun kuyruklu anahtar kelime fırsatı sunan konular olsun.`
      const data = await api.post('/ai/generate', { prompt, context: profileContext })
      const text = data.text || ''
      // Parse numbered list
      const lines = text.split('\n').filter(l => /^\d+[\.\)]/.test(l.trim()))
      const topics = lines.map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
      setTrendResults(topics.length ? topics : [text])
    } catch (err) {
      setError(err.message)
    } finally {
      setResearchLoading(false)
    }
  }

  // Step 3: generate TR content
  async function handleGenerateTr() {
    const topic = selectedTopic || customTopic
    if (!topic) { setError('Önce bir konu seçin.'); return }
    setContentLoading(true)
    setError('')
    try {
      const prompt = `Aşağıdaki konu hakkında 2000-5000 kelimelik profesyonel bir Türkçe blog yazısı oluştur. SEO uyumlu olsun, somut veriler içersin. Yasaklı ifadeler kullanma: 'yapay zeka çağında', 'devrim niteliğinde', 'paradigma değişimi'.\n\nONEMLI FORMAT KURALLARI:\n- Kesinlikle markdown kullanma (# * ** __ gibi isaret kullanma)\n- Basliklari buyuk harfle yaz, baska isaret ekleme\n- Madde isaretleri icin - kullan, * kullanma\n- Kalin veya italik metin yapma\n\nKonu: ${topic}\n\n${profileContext}`
      const data = await api.post('/ai/generate', { prompt })
      setBodyTr(data.text || '')
      if (keywords) {
        setKeywordDensity(calcKeywordDensity(data.text || '', keywords))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setContentLoading(false)
    }
  }

  // Step 4: translate
  async function handleTranslate() {
    if (!articleId) return
    setTranslateLoading(true)
    setError('')
    try {
      // Save body_tr first
      await api.put(`/seo/${articleId}`, { body_tr: bodyTr, keywords })
      const data = await api.post(`/seo/${articleId}/translate`, {})
      setBodyEn(data.body_en || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setTranslateLoading(false)
    }
  }

  // Step 5: SEO check
  async function handleSeoCheck() {
    if (!articleId) return
    setCheckLoading(true)
    setError('')
    try {
      await api.put(`/seo/${articleId}`, { body_tr: bodyTr, keywords })
      const data = await api.post(`/seo/${articleId}/check`, {})
      setSeoScore(data.score ?? 0)
      setSeoSuggestions(data.suggestions || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCheckLoading(false)
    }
  }

  // Step 6: mark completed
  async function handleComplete() {
    await saveArticle({ status: 'completed' })
    navigate('/app/seo')
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const inputClass = 'w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
  const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/seo" className="text-xs text-[#6B7280] hover:text-[#111827]">{t('SEO Makaleleri')}</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{editId ? t('Makale Düzenle') : t('Yeni Makale')}</span>
      </div>

      <StepIndicator currentStep={step} />

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-4">

        {/* Step 1: Trend Araştırması */}
        {step === 1 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('Trend Araştırması')}</h2>
            <div className="mb-3">
              <label className={labelClass}>{t('Sektör / Konu Alanı')}</label>
              <input
                value={researchSector}
                onChange={e => setResearchSector(e.target.value)}
                className={inputClass}
                placeholder="Örn: SaaS, e-ticaret, fintech..."
              />
            </div>
            <button
              onClick={handleResearch}
              disabled={researchLoading}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5 mb-4"
            >
              {researchLoading ? t('Araştırılıyor...') : t('OperIQ ile Araştır')}
            </button>

            {trendResults.length > 0 && (
              <div>
                <p className="text-xs text-[#6B7280] mb-2">{t('Trend konulardan birini seçin:')}</p>
                <div className="space-y-2">
                  {trendResults.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedTopic(topic)
                        setCustomTopic('')
                      }}
                      className={`w-full text-left text-xs px-3 py-2 rounded-md border transition-colors ${
                        selectedTopic === topic
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111827]'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                {selectedTopic && (
                  <p className="text-xs text-[#2563EB] mt-2">Seçildi: {selectedTopic}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Konu Seçimi */}
        {step === 2 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('Konu Seçimi')}</h2>
            {selectedTopic && (
              <div className="mb-3 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md">
                <p className="text-xs text-[#6B7280] mb-1">Seçilen trend konu:</p>
                <p className="text-sm text-[#1D4ED8] font-medium">{selectedTopic}</p>
              </div>
            )}
            <div className="mb-3">
              <label className={labelClass}>{t('Makale Başlığı')}</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className={inputClass}
                placeholder="Blog yazısı başlığı..."
              />
            </div>
            <div className="mb-3">
              <label className={labelClass}>Konu (farklı bir konu yazabilirsiniz)</label>
              <input
                value={customTopic}
                onChange={e => {
                  setCustomTopic(e.target.value)
                  if (e.target.value) setSelectedTopic('')
                }}
                className={inputClass}
                placeholder="Veya özel bir konu girin..."
              />
            </div>
          </div>
        )}

        {/* Step 3: TR İçerik */}
        {step === 3 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('Türkçe İçerik')}</h2>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleGenerateTr}
                disabled={contentLoading}
                className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
              >
                {contentLoading ? t('İçerik oluşturuluyor...') : t('OperIQ ile İçerik Oluştur')}
              </button>
              <span className="text-xs text-[#9CA3AF]">veya kendiniz yazın</span>
            </div>
            <div className="mb-3">
              <label className={labelClass}>{t('Türkçe İçerik')}</label>
              <textarea
                value={bodyTr}
                onChange={e => {
                  setBodyTr(e.target.value)
                  setKeywordDensity(calcKeywordDensity(e.target.value, keywords))
                }}
                rows={14}
                className={`${inputClass} resize-y font-mono text-xs`}
                placeholder="Makale içeriği (Markdown desteklenir)..."
              />
            </div>
            <div className="mb-3">
              <label className={labelClass}>{t('Anahtar Kelimeler (virgülle ayırın)')}</label>
              <input
                value={keywords}
                onChange={e => {
                  setKeywords(e.target.value)
                  setKeywordDensity(calcKeywordDensity(bodyTr, e.target.value))
                }}
                className={inputClass}
                placeholder="Örn: SEO optimizasyonu, içerik pazarlama, blog yazısı"
              />
            </div>
            {keywordDensity > 0 && (
              <p className="text-xs text-[#6B7280]">
                Anahtar kelime yoğunluğu: <span className="font-medium text-[#111827]">%{keywordDensity}</span>
              </p>
            )}
          </div>
        )}

        {/* Step 4: EN Çeviri */}
        {step === 4 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('İngilizce Çeviri')}</h2>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleTranslate}
                disabled={translateLoading}
                className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
              >
                {translateLoading ? t('Çevriliyor...') : t('OperIQ ile Çevir')}
              </button>
              <span className="text-xs text-[#9CA3AF]">veya kendiniz çevirin</span>
            </div>
            <div>
              <label className={labelClass}>{t('İngilizce İçerik')}</label>
              <textarea
                value={bodyEn}
                onChange={e => setBodyEn(e.target.value)}
                rows={14}
                className={`${inputClass} resize-y font-mono text-xs`}
                placeholder="English article content (Markdown supported)..."
              />
            </div>
          </div>
        )}

        {/* Step 5: SEO Kontrol */}
        {step === 5 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('SEO Analizi')}</h2>
            <button
              onClick={handleSeoCheck}
              disabled={checkLoading}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5 mb-4"
            >
              {checkLoading ? t('Analiz ediliyor...') : t('OperIQ Analiz Et')}
            </button>

            {seoScore !== null && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`text-2xl font-bold ${
                      seoScore >= 70 ? 'text-[#059669]' : seoScore >= 40 ? 'text-[#D97706]' : 'text-[#DC2626]'
                    }`}
                  >
                    {seoScore}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#111827]">SEO Skoru</p>
                    <p className="text-xs text-[#6B7280]">100 üzerinden</p>
                  </div>
                </div>

                {seoSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {seoSuggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 border border-[#E5E7EB] rounded-md">
                        <span className={`text-xs mt-0.5 flex-shrink-0 ${s.passed ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                          {s.passed ? '✓' : '✗'}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-[#111827]">{s.check}</p>
                          {s.note && <p className="text-xs text-[#6B7280] mt-0.5">{s.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Yayın */}
        {step === 6 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('Yayın')}</h2>

            {seoScore !== null && (
              <div className="flex items-center gap-2 mb-4">
                <div className={`text-lg font-bold ${seoScore >= 70 ? 'text-[#059669]' : seoScore >= 40 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                  SEO: {seoScore}/100
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>{t('Türkçe İçerik')}</label>
                  <button
                    onClick={() => copyToClipboard(bodyTr)}
                    className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded px-2 py-0.5"
                  >
                    {t('Kopyala')}
                  </button>
                </div>
                <textarea
                  value={bodyTr}
                  readOnly
                  rows={6}
                  className={`${inputClass} resize-y font-mono text-xs bg-[#F9FAFB]`}
                />
              </div>

              {bodyEn && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>{t('İngilizce İçerik')}</label>
                    <button
                      onClick={() => copyToClipboard(bodyEn)}
                      className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded px-2 py-0.5"
                    >
                      {t('Kopyala')}
                    </button>
                  </div>
                  <textarea
                    value={bodyEn}
                    readOnly
                    rows={6}
                    className={`${inputClass} resize-y font-mono text-xs bg-[#F9FAFB]`}
                  />
                </div>
              )}
            </div>

            <div className="mt-5">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-4 py-1.5"
              >
                {saving ? t('Kaydediliyor...') : t('Tamamlandı Olarak İşaretle')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        {step > 1 && (
          <button
            onClick={goPrev}
            disabled={saving}
            className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-1.5 hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            {t('Önceki')}
          </button>
        )}
        {step < 6 && (
          <button
            onClick={goNext}
            disabled={saving}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {saving ? t('Kaydediliyor...') : t('Sonraki')}
          </button>
        )}
        <Link
          to="/app/seo"
          className="text-xs text-[#6B7280] hover:text-[#111827] ml-2"
        >
          {t('Listeye Dön')}
        </Link>
      </div>
    </div>
  )
}
