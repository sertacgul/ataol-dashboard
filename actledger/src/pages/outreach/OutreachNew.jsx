import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function OutreachNew() {
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

  async function handleAiGenerate() {
    if (!company) { setError('Önce bir firma seçin.'); return }
    setAiLoading(true)
    setError('')
    try {
      const selectedContact = contacts.find(c => c.id === contactId)
      const contactInfo = selectedContact
        ? `Alıcı: ${selectedContact.name}${selectedContact.title ? ` (${selectedContact.title})` : ''}`
        : ''

      const prompt = `${contactInfo ? contactInfo + '\n' : ''}Firma: ${company.name}${company.sector ? ` - ${company.sector}` : ''}${company.country ? ` - ${company.country}` : ''}

Bu firmaya profesyonel bir tanıtım emaili yaz. Türkçe olsun, kısa ve etkili olsun.

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
    if (!subject.trim()) { setError('Konu zorunludur.'); return }
    if (!body.trim()) { setError('İçerik zorunludur.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await api.post('/outreach', {
        company_id: companyId || null,
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
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/outreach" className="text-xs text-[#6B7280] hover:text-[#111827]">Outreach</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">Yeni Email</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
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
              {aiLoading ? 'OperIQ oluşturuyor...' : 'OperIQ ile Oluştur'}
            </button>
          </div>
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">İletişim Kişisi</label>
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827]"
              >
                <option value="">Seçiniz</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.title ? ` — ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-5">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Konu <span className="text-[#DC2626]">*</span>
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
              placeholder="Email konusu"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              İçerik <span className="text-[#DC2626]">*</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] resize-none"
              placeholder="Email içeriği..."
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
          {loading ? 'Kaydediliyor...' : 'Onaya Gönder'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit('draft')}
          className="text-xs font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-50 rounded-md px-4 py-1.5"
        >
          Taslak Kaydet
        </button>
        <Link
          to="/app/outreach"
          className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-1.5 hover:bg-[#F9FAFB]"
        >
          İptal
        </Link>
      </div>
    </div>
  )
}
