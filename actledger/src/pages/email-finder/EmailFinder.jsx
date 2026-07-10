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
      setError('Firma seçin veya domain girin.')
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
      setError(e.message || 'Arama başarısız oldu.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveContact(email) {
    if (!savingResultId) return
    setSavingEmail(email)
    try {
      await api.post(`/email-finder/${savingResultId}/save-contact`, {
        email,
        name: personName || '',
        title: personTitle || '',
      })
      setSavedEmails(prev => new Set([...prev, email]))
    } catch (e) {
      alert(e.message || 'Kaydetme başarısız.')
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
    if (!res.ok) { alert('Export hatası'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-finder.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-semibold text-[#111827]">Email Bulucu</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">OperIQ ile firma domain'inden email adresi bul ve kisi olarak kaydet.</p>
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
              {loading ? 'Aranıyor...' : 'OperIQ ile Ara'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 mb-6">
          {result.found_emails?.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-3">
                Tahmin Edilen Email Adresleri
                <span className="ml-2 text-xs font-normal text-[#9CA3AF]">({result.domain})</span>
              </div>
              <div className="space-y-2">
                {result.found_emails.map((email) => (
                  <div key={email} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#F3F4F6] last:border-0">
                    <span className="text-xs font-mono text-[#374151]">{email}</span>
                    <div className="flex items-center gap-2">
                      <CopyButton text={email} />
                      <button
                        onClick={() => handleSaveContact(email)}
                        disabled={savingEmail === email || savedEmails.has(email)}
                        className="text-xs px-2 py-0.5 rounded border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-50 transition-colors"
                      >
                        {savedEmails.has(email) ? 'Kaydedildi' : savingEmail === email ? '...' : 'Kisiyi Kaydet'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.website_emails?.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-3">Web Sitesinden Bulunan</div>
              <div className="space-y-2">
                {result.website_emails.map((email) => (
                  <div key={email} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#F3F4F6] last:border-0">
                    <span className="text-xs font-mono text-[#374151]">{email}</span>
                    <CopyButton text={email} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.found_names?.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              <div className="text-sm font-semibold text-[#111827] mb-3">Bulunan Kisiler</div>
              <div className="space-y-1.5">
                {result.found_names.map((person, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#F3F4F6] last:border-0">
                    <span className="text-xs font-medium text-[#111827]">{person.name}</span>
                    {person.title && <span className="text-xs text-[#6B7280]">{person.title}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.found_emails?.length === 0 && result.website_emails?.length === 0 && (
            <div className="bg-[#FEF9C3] border border-[#FDE047] rounded-md p-3 text-xs text-[#92400E]">
              Kisi adi girilmedi veya bu domain icin email tahmini yapilamadi.
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
                return (
                  <tr key={row.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 text-xs font-mono text-[#374151]">{row.domain}</td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280]">{row.person_name || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">{emails.length} adres</td>
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
