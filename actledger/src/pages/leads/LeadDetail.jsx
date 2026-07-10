import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`/leads/${id}`)
      .then(data => {
        setCompany(data.company)
        setContacts(data.contacts || [])
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!window.confirm('Bu lead\'i silmek istediğinizden emin misiniz?')) return
    setDeleting(true)
    try {
      await api.del(`/leads/${id}`)
      navigate('/app/leads')
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">Yükleniyor...</div>
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-[#6B7280] mb-3">Firma bulunamadı.</div>
        <Link to="/app/leads" className="text-xs text-[#2563EB] hover:underline">Leads listesine dön</Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/leads" className="text-xs text-[#6B7280] hover:text-[#111827]">Leads</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{company.name}</span>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-base font-semibold text-[#111827]">{company.name}</h1>
          <div className="flex items-center gap-2">
            <Link
              to={`/app/outreach/new?company=${id}`}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
            >
              Email Gönder
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-[#DC2626] border border-[#FECACA] rounded-md px-3 py-1.5 hover:bg-[#FEF2F2] disabled:opacity-50"
            >
              {deleting ? 'Siliniyor...' : 'Sil'}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs text-[#9CA3AF]">Sektör</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.sector || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">Ülke</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.country || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">Kaynak</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.source || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">Web Sitesi</dt>
            <dd className="text-sm mt-0.5">
              {company.website
                ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">{company.website}</a>
                : '—'
              }
            </dd>
          </div>
          {company.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-[#9CA3AF]">Notlar</dt>
              <dd className="text-sm text-[#111827] mt-0.5">{company.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <h2 className="text-xs font-semibold text-[#374151]">İletişim Kişileri</h2>
        </div>
        {contacts.length === 0 ? (
          <div className="text-xs text-[#9CA3AF] text-center py-6">Henüz kişi eklenmemiş.</div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {contacts.map(ct => (
              <li key={ct.id} className="px-4 py-3">
                <div className="text-sm font-medium text-[#111827]">{ct.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  {ct.email && <span className="text-xs text-[#6B7280]">{ct.email}</span>}
                  {ct.title && <span className="text-xs text-[#9CA3AF]">{ct.title}</span>}
                  {ct.seniority && (
                    <span className="text-[10px] font-medium text-[#374151] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full">
                      {ct.seniority}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
