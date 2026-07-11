import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import HelpButton from '../../components/HelpButton'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-0.5 rounded border border-[#E5E7EB] text-[#6B7280] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
    >
      {copied ? 'Kopyalandı' : 'Kopyala'}
    </button>
  )
}

function StatusBadge({ status }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Dogrulanmis
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#92400E] font-medium">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Tahmini
    </span>
  )
}

export default function EmailFinder() {
  const [companyQuery, setCompanyQuery] = useState('')
  const [companySuggestions, setCompanySuggestions] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [domain, setDomain] = useState('')
  const [personName, setPersonName] = useState('')
  const [personTitle, setPersonTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [savingEmail, setSavingEmail] = useState(null)
  const [savedEmails, setSavedEmails] = useState(new Set())
  const [savingResultId, setSavingResultId] = useState(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const data = await api.get('/email-finder')
      setHistory(data.results || [])
    } catch {
      // ignore
    }
  }

  function handleCompanyInput(val) {
    setCompanyQuery(val)
    clearTimeout(searchTimeout.current)
    if (val.length < 2) { setCompanySuggestions([]); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await api.get(`/leads?q=${encodeURIComponent(val)}`)
        setCompanySuggestions(data.companies?.slice(0, 6) || [])
      } catch {
        setCompanySuggestions([])
      }
    }, 300)
  }

  function selectCompany(company) {
    setSelectedCompany(company)
    setCompanyQuery(company.name)
    setCompanySuggestions([])
    if (company.website) {
      try {
        const url = company.website.startsWith('http') ? company.website : `https://${company.website}`
        const d = new URL(url).hostname.replace(/^www\./, '')
        setDomain(d)
      } catch {
        setDomain(company.website)
      }
    }
  }

  async function handleSearch() {
    if (!domain && !selectedCompany) {
      setError('Firma secin veya domain girin.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const data = await api.post('/email-finder/search', {
        company_id: selectedCompany?.id || null,
        domain: domain || null,
        person_name: personName || null,
        person_title: personTitle || null,
      })
      setResult(data)
      setSavingResultId(data.id)
      loadHistory()
    } catch (e) {
      setError(e.message || 'Arama basarisiz oldu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveContact(email, name, title) {
    if (!savingResultId) return
    setSavingEmail(email)
    try {
      await api.post(`/email-finder/${savingResultId}/save-contact`, {
        email,
        name: name || personName || '',
        title: title || personTitle || '',
      })
      setSavedEmails(prev => new Set([...prev, email]))
    } catch (e) {
      alert(e.message || 'Kaydetme basarisiz.')
    } finally {
      setSavingEmail(null)
    }
  }

  async function handleExport() {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const res = await fetch(`${API_BASE}/email-finder/export`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) { alert('Export hatasi'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-finder.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const verifiedEmails = result?.emails?.filter(e => e.status === 'verified') || []
  const estimatedEmails = result?.emails?.filter(e => e.status === 'estimated') || []
  const ci = result?.company_info

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-[#111827]">Email Bulucu</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Firma web sitesini tarayarak gercek email adresleri ve firma bilgileri bulun.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Firma Sec */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Firma Sec</div>
          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs text-[#6B7280] block mb-1">Firma Ara</label>
              <input
                type="text"
                value={companyQuery}
                onChange={e => handleCompanyInput(e.target.value)}
                placeholder="Firma adi ile ara..."
                className="w-full text-xs border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
              {companySuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-md shadow-sm">
                  {companySuggestions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCompany(c)}
                      className="w-full text-left px-3 py-2 text-xs text-[#111827] hover:bg-[#F3F4F6] border-b border-[#F3F4F6] last:border-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.website && <span className="ml-2 text-[#9CA3AF]">{c.website}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Domain (otomatik dolar veya manuel gir)</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="ornek.com"
                className="w-full text-xs border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>
        </div>

        {/* Kisi Bilgileri */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <div className="text-sm font-semibold text-[#111827] mb-3">Kisi Bilgileri</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Kisi Adi (opsiyonel)</label>
              <input
                type="text"
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                placeholder="Ahmet Yilmaz"
                className="w-full text-xs border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Unvan/Pozisyon (opsiyonel)</label>
              <input
                type="text"
                value={personTitle}
                onChange={e => setPersonTitle(e.target.value)}
                placeholder="CEO, Satis Muduru..."
                className="w-full text-xs border border-[#E5E7EB] rounded-md px-2.5 py-1.5 text-[#111827] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            {error && <p className="text-xs text-[#DC2626]">{error}</p>}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-2 bg-[#2563EB] text-white text-xs font-medium rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Web sitesi taranıyor...' : 'OperIQ ile Ara'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 mb-6">
          {/* Domain + MX Info */}
          <div className={`rounded-md p-3 text-xs flex items-center gap-2 ${result.has_mx ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {result.has_mx ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span>
              <strong>{result.domain}</strong>
              {result.has_mx
                ? ` - MX kaydi dogrulandi${result.mx_provider ? ` (${result.mx_provider})` : ''}`
                : ' - MX kaydi bulunamadi, bu domain email almayabilir'}
              {result.pages_scraped?.length > 0 && (
                <span className="ml-2 text-[#6B7280]">({result.pages_scraped.length} sayfa tarandi)</span>
              )}
            </span>
          </div>

          {/* Company Info Card */}
          {ci && (ci.name || ci.description) && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-3">Firma Bilgileri</div>
              <div className="space-y-2">
                {ci.name && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#6B7280] w-24 shrink-0">Firma Adi</span>
                    <span className="text-xs text-[#111827] font-medium">{ci.name}</span>
                  </div>
                )}
                {ci.description && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#6B7280] w-24 shrink-0">Tanim</span>
                    <span className="text-xs text-[#374151]">{ci.description}</span>
                  </div>
                )}
                {ci.sector && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#6B7280] w-24 shrink-0">Sektor</span>
                    <span className="text-xs text-[#374151]">{ci.sector}</span>
                  </div>
                )}
                {ci.location && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#6B7280] w-24 shrink-0">Lokasyon</span>
                    <span className="text-xs text-[#374151]">{ci.location}</span>
                  </div>
                )}
                {ci.employee_count && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#6B7280] w-24 shrink-0">Calisan Sayisi</span>
                    <span className="text-xs text-[#374151]">{ci.employee_count}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-3 italic">Bu bilgiler firmanin web sitesinden alinmistir.</p>
            </div>
          )}

          {/* Verified Emails */}
          {verifiedEmails.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-semibold text-[#111827]">Web Sitesinden Bulunan Email Adresleri</div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-medium">{verifiedEmails.length}</span>
              </div>
              <p className="text-xs text-[#6B7280] mb-3">Bu adresler firmanin web sitesinde acikca yer almaktadir.</p>
              <div className="space-y-2">
                {verifiedEmails.map((item) => (
                  <div key={item.email} className="flex items-center justify-between gap-2 py-2 border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#374151]">{item.email}</span>
                      <StatusBadge status="verified" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={item.email} />
                      <button
                        onClick={() => handleSaveContact(item.email)}
                        disabled={savingEmail === item.email || savedEmails.has(item.email)}
                        className="text-xs px-2 py-0.5 rounded border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-50 transition-colors"
                      >
                        {savedEmails.has(item.email) ? 'Kaydedildi' : savingEmail === item.email ? '...' : 'Kisiyi Kaydet'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Found People from Website */}
          {result.found_people?.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-3">Web Sitesinde Bulunan Kisiler</div>
              <p className="text-xs text-[#6B7280] mb-3">Bu kisiler firmanin web sitesinde isimleriyle yer almaktadir.</p>
              <div className="space-y-1.5">
                {result.found_people.map((person, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#F3F4F6] last:border-0">
                    <span className="text-xs font-medium text-[#111827]">{person.name}</span>
                    {person.title && <span className="text-xs text-[#6B7280]">{person.title}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Emails */}
          {estimatedEmails.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-sm font-semibold text-[#111827]">Tahmini Email Adresleri</div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#92400E] font-medium">{estimatedEmails.length}</span>
              </div>
              <p className="text-xs text-[#6B7280] mb-3">Bu adresler isim ve domain bilgisine gore olusturulmus kaliplardir. Web sitesinde dogrulanmamistir.</p>
              <div className="space-y-2">
                {estimatedEmails.map((item) => (
                  <div key={item.email} className="flex items-center justify-between gap-2 py-2 border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#374151]">{item.email}</span>
                      <StatusBadge status="estimated" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={item.email} />
                      <button
                        onClick={() => handleSaveContact(item.email)}
                        disabled={savingEmail === item.email || savedEmails.has(item.email)}
                        className="text-xs px-2 py-0.5 rounded border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 transition-colors"
                      >
                        {savedEmails.has(item.email) ? 'Kaydedildi' : savingEmail === item.email ? '...' : 'Kisiyi Kaydet'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No MX warning */}
          {!result.has_mx && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-md p-3 text-xs text-[#991B1B]">
              Bu domain icin MX kaydi bulunamadi. Email adresleri gecersiz olabilir.
            </div>
          )}

          {/* No results at all */}
          {verifiedEmails.length === 0 && estimatedEmails.length === 0 && (
            <div className="bg-[#FEF9C3] border border-[#FDE047] rounded-md p-3 text-xs text-[#92400E]">
              {personName
                ? 'Bu domain icin email bulunamadi. Web sitesinde acik email adresi yer almiyor olabilir.'
                : 'Kisi adi girilmediginden tahmini email olusturulamadi. Web sitesinde de acik email bulunamadi.'}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="text-xs px-4 py-2 border border-[#E5E7EB] rounded-md text-[#374151] hover:bg-[#F3F4F6] transition-colors"
            >
              CSV Olarak Indir
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#374151]">Onceki Aramalar</h2>
            <button
              onClick={handleExport}
              className="text-xs text-[#2563EB] hover:underline"
            >
              Tumunu Indir
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Domain</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kisi</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Bulunan</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {history.map(row => {
                const emails = (() => { try { return JSON.parse(row.found_emails || '[]') } catch { return [] } })()
                const totalCount = Array.isArray(emails) ? emails.length : 0
                const verifiedCount = Array.isArray(emails) ? emails.filter(e => typeof e === 'object' && e.status === 'verified').length : 0
                return (
                  <tr key={row.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 text-xs font-mono text-[#374151]">{row.domain}</td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280]">{row.person_name || '-'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="text-[#374151]">{totalCount} adres</span>
                      {verifiedCount > 0 && (
                        <span className="ml-1.5 text-[#059669]">({verifiedCount} dogrulanmis)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString('tr-TR') : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <HelpButton section="email-bulucu" />
    </div>
  )
}
