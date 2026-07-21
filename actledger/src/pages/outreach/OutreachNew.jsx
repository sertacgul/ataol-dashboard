import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

export default function OutreachNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('company')

  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [contactId, setContactId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  // Saved email templates the user can apply to the body
  const [templates, setTemplates] = useState([])

  // Inline company search state (when no ?company= param)
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState([])
  const [companySearching, setCompanySearching] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    api.get('/templates?category=email')
      .then(data => setTemplates(data.templates || []))
      .catch(() => {})
  }, [])

  function handleApplyTemplate(e) {
    const tpl = templates.find(tp => tp.id === e.target.value)
    if (tpl) setBody(tpl.content || '')
  }

  useEffect(() => {
    if (!companyId) return
    api.get(`/leads/${companyId}`)
      .then(data => {
        setCompany(data.company)
        setContacts(data.contacts || [])
        if (data.contacts?.length > 0) setContactId(data.contacts[0].id)
      })
      .catch(() => {})
  }, [companyId])

  function handleCompanyQueryChange(e) {
    const q = e.target.value
    setCompanyQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!q.trim()) { setCompanyResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setCompanySearching(true)
      try {
        const data = await api.get(`/leads?q=${encodeURIComponent(q)}`)
        setCompanyResults(data.companies || [])
      } catch { setCompanyResults([]) } finally { setCompanySearching(false) }
    }, 300)
  }

  async function handleSelectCompany(c) {
    setSelectedCompanyId(c.id)
    setCompanyQuery(c.name)
    setCompanyResults([])
    try {
      const data = await api.get(`/leads/${c.id}`)
      setCompany(data.company)
      setContacts(data.contacts || [])
      if (data.contacts?.length > 0) setContactId(data.contacts[0].id)
    } catch { /* ignore */ }
  }

  async function handleAiGenerate() {
    if (!company) { setError(t('Önce bir firma seçin.')); return }
    setAiLoading(true)
    setError('')
    try {
      const selectedContact = contacts.find(c => c.id === contactId)
      const contactInfo = selectedContact
        ? `Alıcı: ${selectedContact.name}${selectedContact.title ? ` (${selectedContact.title})` : ''}`
        : ''

      // Fetch user's firm profile for personalized emails
      let profileContext = ''
      try {
        const profileData = await api.get('/profile')
        const p = profileData.profile
        if (p) {
          const parts = []
          if (p.company_name) parts.push(`Gönderen Firma: ${p.company_name}`)
          if (p.sector) parts.push(`Sektör: ${p.sector}`)
          if (p.value_proposition) parts.push(`Değer Önerisi: ${p.value_proposition}`)
          if (p.products_services) {
            const ps = Array.isArray(p.products_services) ? p.products_services.join(', ') : p.products_services
            if (ps) parts.push(`Ürün/Hizmetler: ${ps}`)
          }
          if (p.usps) {
            const usps = Array.isArray(p.usps) ? p.usps.join(', ') : p.usps
            if (usps) parts.push(`Farklılaşma: ${usps}`)
          }
          if (p.tone) parts.push(`Ton: ${p.tone}`)
          if (parts.length) profileContext = '\n\n--- Gönderen Firma Bilgisi ---\n' + parts.join('\n')
        }
      } catch { /* profile optional */ }

      const prompt = `${contactInfo ? contactInfo + '\n' : ''}Alıcı Firma: ${company.name}${company.sector ? ` - ${company.sector}` : ''}${company.country ? ` - ${company.country}` : ''}${profileContext}

Yukarıdaki alıcı firmaya soğuk bir tanıtım emaili yaz. Türkçe yaz.

Kurallar:
- Gövde 60-120 kelime arası. Daha uzun yazma; email mobilde okunacak.
- Konu satırı 4-7 kelime; merak uyandırsın ama spam gibi durmasın.
- Tek bir net call-to-action olsun (örnegin kısa bir görüşme öner). Birden fazla istek yapma.
- Kişiselleştirme alıcı firmaya özgü gerçek bir detaydan gelsin: ürünleri, sektöründeki güncel bir durum ya da yakın zamandaki bir gelişme. Elinde gerçek bir detay yoksa detay uydurma; sektörel bağlamdan yararlan.
- Her email'de tekrar eden kalıp ifadeler kullanma (klişe övgüler, jenerik referans cümleleri, "firmanızı takdir ediyoruz" gibi). Bunlar alıcıya şablon olduğunu belli eder.
- Doğal ve insan gibi yaz. Uzun tire, yıldız veya diyez işareti kullanma.

Aşağıdaki formatta yanıt ver:
KONU: [email konusu]
İÇERİK:
[email içeriği]`

      const data = await api.post('/ai/generate', { prompt })
      const text = data.text || ''

      const subjectMatch = text.match(/KONU:\s*(.+)/i)
      const bodyMatch = text.match(/İÇERİK:\s*([\s\S]+)/i)

      if (subjectMatch) setSubject(subjectMatch[1].trim())
      if (bodyMatch) setBody(bodyMatch[1].trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(status) {
    if (!subject.trim()) { setError(t('Konu zorunludur.')); return }
    if (!body.trim()) { setError(t('İçerik zorunludur.')); return }
    setLoading(true)
    setError('')
    try {
      const data = await api.post('/outreach', {
        company_id: companyId || selectedCompanyId || null,
        contact_id: contactId || null,
        subject,
        body,
        status,
      })
      navigate(`/app/outreach/${data.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/outreach" className="text-xs text-[#6B7280] hover:text-[#111827]">Outreach</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{t('Yeni Email')}</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {!companyId && (
        <div className="mb-4 relative">
          <label className="block text-xs font-medium text-[#374151] mb-1">{t('Firma Seç')}</label>
          <input
            type="text"
            value={companyQuery}
            onChange={handleCompanyQueryChange}
            placeholder={t('Firma adı ara...')}
            className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
          />
          {companySearching && (
            <div className="text-xs text-[#9CA3AF] mt-1">{t('Aranıyor...')}</div>
          )}
          {companyResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-md shadow-md">
              {companyResults.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCompany(c)}
                  className="w-full text-left px-3 py-2 text-sm text-[#111827] hover:bg-[#F3F4F6] border-b border-[#F3F4F6] last:border-0"
                >
                  <span className="font-medium">{c.name}</span>
                  {c.sector && <span className="text-xs text-[#6B7280] ml-2">{c.sector}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {company && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-[#111827]">{company.name}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">
                {[company.sector, company.country].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-50 rounded-md px-3 py-1.5"
            >
              {aiLoading ? t('OperIQ oluşturuyor...') : t('OperIQ ile Oluştur')}
            </button>
          </div>
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">{t('İletişim Kişisi')}</label>
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
              >
                <option value="">{t('Seçiniz')}</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.title ? ` - ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-5">
        <div className="space-y-3">
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">{t('Şablon Kullan')}</label>
              <select
                defaultValue=""
                onChange={handleApplyTemplate}
                className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
              >
                <option value="">{t('Şablon seçin...')}</option>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              {t('Konu')} <span className="text-[#DC2626]">*</span>
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
              placeholder={t('Email konusu')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              {t('İçerik')} <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
              placeholder={t('Email içeriği...')}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit('pending')}
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
        >
          {loading ? t('Kaydediliyor...') : t('Onaya Gönder')}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit('draft')}
          className="text-xs font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-50 rounded-md px-4 py-1.5"
        >
          {t('Taslak Kaydet')}
        </button>
        <Link
          to="/app/outreach"
          className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-1.5 hover:bg-[#F9FAFB]"
        >
          {t('İptal')}
        </Link>
      </div>
    </div>
  )
}
