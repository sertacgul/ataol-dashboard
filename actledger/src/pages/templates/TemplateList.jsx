import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

const CATEGORY_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Sosyal Medya' },
  { value: 'seo', label: 'SEO' },
  { value: 'newsletter', label: 'Newsletter' },
]

const CATEGORY_LABELS = {
  email: 'Email',
  social: 'Sosyal Medya',
  seo: 'SEO',
  newsletter: 'Newsletter',
}

const CATEGORY_COLORS = {
  email: 'bg-[#DBEAFE] text-[#1E40AF]',
  social: 'bg-[#EDE9FE] text-[#5B21B6]',
  seo: 'bg-[#DCFCE7] text-[#166534]',
  newsletter: 'bg-[#FEF3C7] text-[#92400E]',
}

export default function TemplateList() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = activeCategory ? `/templates?category=${activeCategory}` : '/templates'
    api.get(path)
      .then(data => setTemplates(data.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [activeCategory])

  const filtered = templates.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">Şablonlar</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {filtered.length} şablon
          </span>
        </div>
        <Link
          to="/app/templates/new"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          + Yeni Şablon
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveCategory(f.value)}
              className={`text-xs rounded-md px-3 py-1.5 border transition-colors ${
                activeCategory === f.value
                  ? 'bg-[#2563EB] text-white border-[#2563EB]'
                  : 'text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF] w-48"
          placeholder="Şablon ara..."
        />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Ad</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kategori</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Platform</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  Yükleniyor...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  Şablon bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-[#111827]">{t.name || '(Adsız)'}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.category ? (
                      <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[t.category] || 'bg-[#F3F4F6] text-[#374151]'}`}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{t.platform || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '—'}
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
