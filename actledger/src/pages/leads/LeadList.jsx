import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadList() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = query ? `/leads?q=${encodeURIComponent(query)}` : '/leads'
    api.get(path)
      .then(data => setCompanies(data.companies || []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [query])

  function handleSearch(e) {
    e.preventDefault()
    setQuery(search)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">Leads</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {companies.length} firma
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/leads/maps"
            className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5 hover:bg-[#F9FAFB]"
          >
            Maps'ten Bul
          </Link>
          <Link
            to="/app/leads/new"
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
          >
            + Yeni Lead
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Firma ara..."
          className="flex-1 text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]"
        />
        <button
          type="submit"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          Ara
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setSearch(''); setQuery('') }}
            className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5 hover:bg-[#F9FAFB]"
          >
            Temizle
          </button>
        )}
      </form>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Firma</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Sektör</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Ülke</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kaynak</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-xs text-[#9CA3AF] py-8">
                  Yükleniyor...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-xs text-[#9CA3AF] py-8">
                  {query ? 'Arama sonucu bulunamadı.' : 'Henüz lead eklenmemiş.'}
                </td>
              </tr>
            ) : (
              companies.map(c => (
                <tr key={c.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/app/leads/${c.id}`}
                      className="text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{c.sector || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{c.country || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{c.source || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
