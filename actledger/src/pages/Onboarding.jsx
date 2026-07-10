import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Samimi' },
  { value: 'technical', label: 'Teknik' },
  { value: 'casual', label: 'Günlük' },
]

const INITIAL_FORM = {
  company_name: '',
  website: '',
  sector: '',
  description: '',
  value_proposition: '',
  target_audience: '',
  products_services: '',
  competitors: '',
  usps: '',
  tone: 'formal',
  sample_content: '',
}

function parseLines(str) {
  return str.split('\n').map(s => s.trim()).filter(Boolean)
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { profile, setProfile, hasProfile } = useAuth()

  const [websiteUrl, setWebsiteUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (hasProfile) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [hasProfile, navigate])

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleAnalyze() {
    if (!websiteUrl.trim()) return
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const data = await api.post('/profile/analyze', { website: websiteUrl.trim() })
      const draft = data.draft
      if (!draft) {
        setAnalyzeError('OperIQ şu anda yanıt veremiyor')
        return
      }
      setForm(prev => ({
        ...prev,
        company_name: draft.company_name || prev.company_name,
        website: websiteUrl.trim(),
        sector: draft.sector || prev.sector,
        description: draft.description || prev.description,
        value_proposition: draft.value_proposition || prev.value_proposition,
        target_audience: draft.target_audience || prev.target_audience,
        products_services: Array.isArray(draft.products_services)
          ? draft.products_services.join('\n')
          : (draft.products_services || prev.products_services),
        competitors: Array.isArray(draft.competitors)
          ? draft.competitors.join('\n')
          : (draft.competitors || prev.competitors),
        usps: Array.isArray(draft.usps)
          ? draft.usps.join('\n')
          : (draft.usps || prev.usps),
        tone: draft.tone || prev.tone,
      }))
    } catch {
      setAnalyzeError('OperIQ şu anda yanıt veremiyor')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        ...form,
        products_services: parseLines(form.products_services),
        competitors: parseLines(form.competitors),
        usps: parseLines(form.usps),
      }
      const data = await api.post('/profile', payload)
      setProfile(data.profile)
      navigate('/app/dashboard')
    } catch (err) {
      setSaveError(err.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
          <span className="text-sm font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>

        <h1 className="text-xl font-semibold text-[#111827] mb-1">Firma Profilinizi Oluşturun</h1>
        <p className="text-sm text-[#6B7280] mb-8">OperIQ AI, içeriklerinizi kişiselleştirmek için firmanızı tanımalı.</p>

        {/* Section 1: Akıllı Başlangıç */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#111827] mb-1">Akıllı Başlangıç</h2>
          <p className="text-xs text-[#6B7280] mb-3">Web sitenizi girin, OperIQ formu otomatik dolduracak.</p>
          {analyzeError && (
            <div className="mb-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
              {analyzeError}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://firmaniz.com"
              className="flex-1 text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
              disabled={analyzing}
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !websiteUrl.trim()}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2 whitespace-nowrap"
            >
              {analyzing ? 'OperIQ firmanızı analiz ediyor...' : 'OperIQ ile Analiz Et'}
            </button>
          </div>
        </div>

        {/* Section 2: Firma Profili Formu */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#111827]">Firma Profili</h2>

            {saveError && (
              <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Firma Adı <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  value={form.company_name}
                  onChange={e => setField('company_name', e.target.value)}
                  required
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
                  placeholder="ActLedger"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Web Sitesi</label>
                <input
                  value={form.website}
                  onChange={e => setField('website', e.target.value)}
                  className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
                  placeholder="https://firmaniz.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Sektör</label>
              <input
                value={form.sector}
                onChange={e => setField('sector', e.target.value)}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
                placeholder="SaaS, E-ticaret, Fintech..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="Firmanız hakkında kısa bir açıklama"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Değer Önerisi</label>
              <textarea
                value={form.value_proposition}
                onChange={e => setField('value_proposition', e.target.value)}
                rows={2}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="Müşterilerinize sunduğunuz temel değer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Hedef Kitle</label>
              <textarea
                value={form.target_audience}
                onChange={e => setField('target_audience', e.target.value)}
                rows={2}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="Hedef müşteri kitlenizi tanımlayın"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Ürünler / Hizmetler
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir ürün/hizmet</span>
              </label>
              <textarea
                value={form.products_services}
                onChange={e => setField('products_services', e.target.value)}
                rows={3}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="CRM yazılımı&#10;Mobil uygulama&#10;Danışmanlık hizmeti"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Rakipler
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir rakip</span>
              </label>
              <textarea
                value={form.competitors}
                onChange={e => setField('competitors', e.target.value)}
                rows={2}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="Rakip A&#10;Rakip B"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Ayırt Edici Özellikler (USP)
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir USP</span>
              </label>
              <textarea
                value={form.usps}
                onChange={e => setField('usps', e.target.value)}
                rows={2}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="7/24 destek&#10;Kurulum gerektirmez"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">İçerik Tonu</label>
              <select
                value={form.tone}
                onChange={e => setField('tone', e.target.value)}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
              >
                {TONE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Örnek İçerik
                <span className="text-[#9CA3AF] font-normal ml-1">— isteğe bağlı</span>
              </label>
              <textarea
                value={form.sample_content}
                onChange={e => setField('sample_content', e.target.value)}
                rows={3}
                className="w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
                placeholder="Markanızı en iyi yansıtan bir içerik örneği"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2.5"
          >
            {saving ? 'Kaydediliyor...' : 'Profili Kaydet ve Devam Et'}
          </button>
        </form>
      </div>
    </div>
  )
}
