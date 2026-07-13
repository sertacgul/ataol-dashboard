import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

// ─── Badge Component ─────────────────────────────────────────

function VerificationBadge({ status }) {
  const config = {
    verified: { label: 'Verified', bg: '#ECFDF5', color: '#059669', icon: 'M5 13l4 4L19 7' },
    likely: { label: 'Likely', bg: '#EFF6FF', color: '#2563EB', icon: 'M5 13l4 4L19 7' },
    risky: { label: 'Risky', bg: '#FEF3C7', color: '#D97706', icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    unknown: { label: 'Unknown', bg: '#F3F4F6', color: '#6B7280', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01' },
  }
  const c = config[status] || config.unknown
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: c.bg, color: c.color }}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
      </svg>
      {c.label}
    </span>
  )
}

// ─── Copy Button ─────────────────────────────────────────────

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={copy} className="text-[10px] text-[#6B7280] hover:text-[#2563EB] transition-colors" title="Kopyala">
      {copied ? (
        <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  )
}

// ─── Credits Display ─────────────────────────────────────────

function CreditsBar({ credits }) {
  if (!credits || !credits.outreach) return null
  const { used, limit, remaining } = credits.outreach
  const pct = Math.round((used / limit) * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-24 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 90 ? '#DC2626' : pct > 70 ? '#D97706' : '#2563EB' }} />
      </div>
      <span className="text-[#6B7280] whitespace-nowrap">
        {remaining}/{limit}
      </span>
    </div>
  )
}

// ─── Filters Sidebar ─────────────────────────────────────────

function FilterSection({ title, options, selected, onChange }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-[#374151] mb-2">{title}</div>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer text-xs text-[#6B7280] hover:text-[#111827]">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
            className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────

export default function EmailFinder() {
  const { t } = useT()

  // Search state
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search history
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])

  // Results
  const [company, setCompany] = useState(null)
  const [people, setPeople] = useState([])
  const [totalCount, setTotalCount] = useState(0)

  // Credits
  const [credits, setCredits] = useState(null)

  // Filters
  const [seniorityFilter, setSeniorityFilter] = useState([])
  const [departmentFilter, setDepartmentFilter] = useState([])
  const [statusFilter, setStatusFilter] = useState([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Selection
  const [selected, setSelected] = useState(new Set())
  const [revealingId, setRevealingId] = useState(null)
  const [bulkRevealing, setBulkRevealing] = useState(false)

  // Compose email
  const [composePerson, setComposePerson] = useState(null)
  const [composeLoading, setComposeLoading] = useState(false)
  const [composeResult, setComposeResult] = useState(null)

  // Verify
  const [verifyingEmail, setVerifyingEmail] = useState(null)

  // Load credits on mount
  useEffect(() => { loadCredits() }, [])

  async function loadCredits() {
    try {
      const data = await api.get('/email-finder/credits')
      setCredits(data)
    } catch {}
  }

  // Load search history
  async function loadHistory() {
    try { const data = await api.get('/activity?module=email-finder&action=search&limit=20'); setHistory(data.items || []) } catch {}
  }

  // Core search runner
  async function runSearch(searchQuery) {
    const q = (searchQuery || '').trim()
    if (!q) return
    setLoading(true)
    setError('')
    setCompany(null)
    setPeople([])
    setSelected(new Set())
    try {
      const data = await api.post('/email-finder/search', { query: q, domain: q.includes('.') ? q : undefined })
      setCompany(data.company)
      setPeople(data.people || [])
      setTotalCount(data.total_count || 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Search
  async function handleSearch(e) {
    e?.preventDefault()
    runSearch(query)
  }

  // Reveal single
  async function handleReveal(person) {
    setRevealingId(person.id)
    try {
      const data = await api.post('/email-finder/reveal', { person_id: person.id, domain: company.domain })
      setPeople(prev => prev.map(p => p.id === person.id ? {
        ...p,
        revealed: true,
        full_name: data.person_name,
        masked_name: data.person_name,
        full_email: data.email,
        masked_email: data.email,
        full_phone: data.phone || null,
        masked_phone: data.phone || null,
        verification_status: data.verification_status,
        confidence_score: data.confidence_score,
        source: data.source,
      } : p))
      setCredits(prev => prev && prev.outreach ? { ...prev, outreach: { ...prev.outreach, remaining: data.credits_remaining, used: prev.outreach.limit - data.credits_remaining } } : prev)
    } catch (err) {
      setError(err.message)
    } finally {
      setRevealingId(null)
    }
  }

  // Bulk reveal
  async function handleBulkReveal(ids) {
    setBulkRevealing(true)
    try {
      const data = await api.post('/email-finder/bulk-reveal', { person_ids: ids, domain: company.domain })
      const revealedMap = {}
      for (const r of data.revealed) revealedMap[r.person_id] = r
      setPeople(prev => prev.map(p => revealedMap[p.id] ? {
        ...p,
        revealed: true,
        full_name: revealedMap[p.id].person_name,
        masked_name: revealedMap[p.id].person_name,
        full_email: revealedMap[p.id].email,
        masked_email: revealedMap[p.id].email,
        full_phone: revealedMap[p.id].phone || null,
        masked_phone: revealedMap[p.id].phone || null,
        verification_status: revealedMap[p.id].verification_status,
        confidence_score: revealedMap[p.id].confidence_score,
        source: revealedMap[p.id].source,
      } : p))
      setCredits(prev => prev && prev.outreach ? { ...prev, outreach: { ...prev.outreach, remaining: data.credits_remaining, used: prev.outreach.limit - data.credits_remaining } } : prev)
      setSelected(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkRevealing(false)
    }
  }

  // CSV Export
  async function handleExport() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/email-finder/export`, {
        method: 'POST', credentials: 'include',
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'askdesk-emails.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  // Compose email
  async function handleCompose(person) {
    setComposePerson(person)
    setComposeLoading(true)
    setComposeResult(null)
    try {
      const data = await api.post('/email-finder/compose', {
        person_name: person.full_name,
        person_title: person.title,
        email: person.full_email,
        company_name: company?.name,
        company_domain: company?.domain,
        company_sector: company?.sector,
        company_description: company?.description,
      })
      setComposeResult(data)
    } catch (err) {
      setError(err.message)
      setComposePerson(null)
    } finally {
      setComposeLoading(false)
    }
  }

  // Verify email
  async function handleVerify(person) {
    setVerifyingEmail(person.full_email)
    try {
      const data = await api.post('/email-finder/verify', { email: person.full_email })
      setPeople(prev => prev.map(p => p.id === person.id ? {
        ...p,
        verification_status: data.status,
        confidence_score: data.confidence_score || p.confidence_score,
      } : p))
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifyingEmail(null)
    }
  }

  // Filter logic
  function toggleFilter(setter, value) {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  const filteredPeople = people.filter(p => {
    if (seniorityFilter.length && !seniorityFilter.includes(p.seniority)) return false
    if (departmentFilter.length && !departmentFilter.includes(p.department)) return false
    if (statusFilter.length) {
      if (!p.revealed) return statusFilter.includes('Hidden')
      if (!statusFilter.includes(p.verification_status)) return false
    }
    return true
  })

  // Checkbox logic
  function toggleSelect(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleSelectAll() {
    const unrevealed = filteredPeople.filter(p => !p.revealed)
    if (selected.size === unrevealed.length) setSelected(new Set())
    else setSelected(new Set(unrevealed.map(p => p.id)))
  }

  const seniorities = [...new Set(people.map(p => p.seniority))].sort()
  const departments = [...new Set(people.map(p => p.department))].sort()

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: Search + Credits */}
      <div className="border-b border-[#E5E7EB] bg-white px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 min-w-[200px]">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('Firma veya domain ara...')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg disabled:opacity-50 transition-colors shrink-0"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : t('Ara')}
            </button>
          </form>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setHistoryOpen(o => !o); if (!historyOpen) loadHistory() }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-2 hover:bg-[#F9FAFB]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('Arama Geçmişi')}
            </button>
            {historyOpen && (
              <div className="absolute right-0 mt-1 w-64 max-h-80 overflow-y-auto bg-white border border-[#E5E7EB] rounded-md shadow-lg z-20">
                {history.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-[#9CA3AF] text-center">{t('Geçmiş yok')}</div>
                ) : (
                  history.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setQuery(item.title); setHistoryOpen(false); runSearch(item.title) }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[#F9FAFB] border-b border-[#F3F4F6] last:border-0"
                    >
                      <span className="text-[#111827] truncate">{item.title}</span>
                      <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <CreditsBar credits={credits} />
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-[#DC2626] font-bold">x</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar filters - desktop */}
        {people.length > 0 && (
          <div className="hidden lg:block w-56 border-r border-[#E5E7EB] bg-[#FAFBFC] p-4 overflow-y-auto shrink-0">
            <div className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-4">{t('Filtrele')}</div>
            {seniorities.length > 0 && (
              <FilterSection title={t('Seniority')} options={seniorities} selected={seniorityFilter} onChange={v => toggleFilter(setSeniorityFilter, v)} />
            )}
            {departments.length > 0 && (
              <FilterSection title={t('Departman')} options={departments} selected={departmentFilter} onChange={v => toggleFilter(setDepartmentFilter, v)} />
            )}
            <FilterSection
              title={t('Doğrulama')}
              options={['Verified', 'Likely', 'Risky', 'Unknown', 'Hidden']}
              selected={statusFilter}
              onChange={v => toggleFilter(setStatusFilter, v)}
            />
          </div>
        )}

        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Empty state */}
          {!company && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#9CA3AF]">
              <svg className="w-16 h-16 mb-4 text-[#E5E7EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm">{t('Firma veya domain ara...')}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[#6B7280]">
              <svg className="w-8 h-8 animate-spin mb-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm">{t('Web sitesi taranıyor...')}</p>
            </div>
          )}

          {/* Company card + results */}
          {company && !loading && (
            <>
              {/* Company header card */}
              <div className="border border-[#E5E7EB] rounded-lg p-4 mb-4 bg-white">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#111827]">{company.name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280] flex-wrap">
                      <span>{company.domain}</span>
                      {company.sector && <><span className="text-[#D1D5DB]">|</span><span>{company.sector}</span></>}
                      {company.location && <><span className="text-[#D1D5DB]">|</span><span>{company.location}</span></>}
                      {company.employee_count && <><span className="text-[#D1D5DB]">|</span><span>{company.employee_count}</span></>}
                    </div>
                    {company.description && <p className="text-xs text-[#9CA3AF] mt-1.5">{company.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {company.mx_valid !== false && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        MX
                      </span>
                    )}
                    <span className="text-[#6B7280]">{totalCount} {t('kişi bulundu')}</span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {/* Mobile filter toggle */}
                  <button
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="lg:hidden text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5 hover:bg-[#F9FAFB]"
                  >
                    {t('Filtrele')}
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={() => handleBulkReveal([...selected])}
                      disabled={bulkRevealing}
                      className="text-xs font-medium text-white bg-[#2563EB] rounded-md px-3 py-1.5 hover:bg-[#1D4ED8] disabled:opacity-50"
                    >
                      {bulkRevealing ? '...' : `${t('Seçilenleri Aç')} (${selected.size} ${t('kredi')})`}
                    </button>
                  )}
                  {people.some(p => !p.revealed) && (
                    <button
                      onClick={() => handleBulkReveal(people.filter(p => !p.revealed).map(p => p.id))}
                      disabled={bulkRevealing}
                      className="text-xs font-medium text-[#2563EB] border border-[#DBEAFE] rounded-md px-3 py-1.5 hover:bg-[#EFF6FF] disabled:opacity-50"
                    >
                      {t('Tümünü Aç')} ({people.filter(p => !p.revealed).length} {t('kredi')})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExport} className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5 hover:bg-[#F9FAFB]">
                    CSV Export
                  </button>
                </div>
              </div>

              {/* Mobile filters dropdown */}
              {mobileFiltersOpen && (
                <div className="lg:hidden border border-[#E5E7EB] rounded-lg p-4 mb-3 bg-[#FAFBFC]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {seniorities.length > 0 && (
                      <FilterSection title={t('Seniority')} options={seniorities} selected={seniorityFilter} onChange={v => toggleFilter(setSeniorityFilter, v)} />
                    )}
                    {departments.length > 0 && (
                      <FilterSection title={t('Departman')} options={departments} selected={departmentFilter} onChange={v => toggleFilter(setDepartmentFilter, v)} />
                    )}
                    <FilterSection title={t('Doğrulama')} options={['Verified', 'Likely', 'Risky', 'Unknown', 'Hidden']} selected={statusFilter} onChange={v => toggleFilter(setStatusFilter, v)} />
                  </div>
                </div>
              )}

              {/* Results table */}
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="w-8 py-2.5 px-3">
                        <input type="checkbox" onChange={toggleSelectAll} checked={selected.size > 0 && selected.size === filteredPeople.filter(p => !p.revealed).length}
                          className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#2563EB]" />
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280]">{t('Ad Soyad')}</th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden sm:table-cell">{t('Unvan/Pozisyon (opsiyonel)')}</th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden md:table-cell">{t('Departman')}</th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280]">Email</th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden xl:table-cell">{t('Telefon')}</th>
                      <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] w-36"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeople.map(person => (
                      <tr key={person.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFBFC]">
                        <td className="py-2.5 px-3">
                          {!person.revealed && (
                            <input type="checkbox" checked={selected.has(person.id)} onChange={() => toggleSelect(person.id)}
                              className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#2563EB]" />
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-medium ${person.revealed ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                            {person.revealed ? person.full_name : person.masked_name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#6B7280] hidden sm:table-cell">{person.title}</td>
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F3F4F6] text-[#6B7280]">{person.department}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={person.revealed ? 'text-[#2563EB] font-medium' : 'text-[#9CA3AF]'}>
                            {person.revealed ? person.full_email : person.masked_email}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 hidden xl:table-cell">
                          {person.revealed ? (
                            person.full_phone ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[#111827] text-[11px]">{person.full_phone}</span>
                                <CopyBtn text={person.full_phone} />
                              </div>
                            ) : <span className="text-[#D1D5DB]">-</span>
                          ) : (
                            person.masked_phone ? <span className="text-[#9CA3AF] text-[11px]">{person.masked_phone}</span> : <span className="text-[#D1D5DB]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {person.revealed ? (
                            <div className="flex items-center gap-2">
                              <VerificationBadge status={person.verification_status} />
                              <CopyBtn text={person.full_email} />
                              <button
                                onClick={() => handleCompose(person)}
                                className="text-[10px] text-[#6B7280] hover:text-[#2563EB] transition-colors whitespace-nowrap"
                                title="Mail Yaz"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              </button>
                              {person.verification_status !== 'verified' && person.source && person.source !== 'hunter' && (
                                <button
                                  onClick={() => handleVerify(person)}
                                  disabled={verifyingEmail === person.full_email}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-[#059669] hover:text-[#047857] disabled:opacity-50 transition-colors whitespace-nowrap"
                                  title={t('Doğrula')}
                                >
                                  {verifyingEmail === person.full_email ? (
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                  )}
                                  {t('Doğrula')}
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReveal(person)}
                              disabled={revealingId === person.id}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-3 py-1.5 transition-colors"
                            >
                              {revealingId === person.id ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              )}
                              Reveal
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPeople.length === 0 && people.length > 0 && (
                  <div className="py-8 text-center text-sm text-[#9CA3AF]">Filtreye uygun sonuc yok</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {composePerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setComposePerson(null); setComposeResult(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto my-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-5 py-3 flex items-center justify-between z-10">
              <h3 className="text-sm font-semibold text-[#111827]">Mail Yaz - {composePerson.full_name}</h3>
              <button onClick={() => { setComposePerson(null); setComposeResult(null) }} className="text-[#9CA3AF] hover:text-[#111827]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              {composeLoading && (
                <div className="flex flex-col items-center py-8 text-[#6B7280]">
                  <svg className="w-6 h-6 animate-spin mb-2 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs">{t('Kişiselleştirilmiş mail hazırlanıyor...')}</p>
                </div>
              )}
              {composeResult && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1">{t('Alıcı')}</label>
                    <p className="text-xs text-[#6B7280]">{composePerson.full_email}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1">{t('Konu')}</label>
                    <input type="text" defaultValue={composeResult.subject} className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#374151] mb-1">{t('Mesaj')}</label>
                    <textarea defaultValue={composeResult.body} rows={10} className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-md resize-y" />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent(composeResult.subject)
                        const body = encodeURIComponent(composeResult.body)
                        window.open(`mailto:${composePerson.full_email}?subject=${subject}&body=${body}`)
                      }}
                      className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2"
                    >
                      {t('Mail Uygulamasında Aç')}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`Konu: ${composeResult.subject}\n\n${composeResult.body}`)
                      }}
                      className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
                    >
                      {t('Kopyala')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
