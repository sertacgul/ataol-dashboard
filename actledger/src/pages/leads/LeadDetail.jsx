import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

export default function LeadDetail() {
  const { t } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [firstStageId, setFirstStageId] = useState(null)
  const [inPipeline, setInPipeline] = useState(false)
  const [addingPipeline, setAddingPipeline] = useState(false)

  useEffect(() => {
    api.get(`/leads/${id}`)
      .then(data => {
        setCompany(data.company)
        setContacts(data.contacts || [])
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    api.get('/pipeline')
      .then(data => {
        setFirstStageId(data.stages?.[0]?.id || null)
        setInPipeline((data.items || []).some(i => i.company_id === id))
      })
      .catch(() => {})
  }, [id])

  async function addToPipeline() {
    if (!firstStageId || inPipeline || addingPipeline) return
    setAddingPipeline(true)
    try {
      await api.post('/pipeline/items', { company_id: id, stage_id: firstStageId })
      setInPipeline(true)
    } catch { /* ignore */ } finally {
      setAddingPipeline(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('Bu lead\'i silmek istediğinizden emin misiniz?'))) return
    setDeleting(true)
    try {
      await api.del(`/leads/${id}`)
      navigate('/app/leads')
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-[#6B7280] mb-3">{t('Firma bulunamadı.')}</div>
        <Link to="/app/leads" className="text-xs text-[#2563EB] hover:underline">{t('Leads listesine dön')}</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
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
              {t('Email Gönder')}
            </Link>
            <button
              onClick={addToPipeline}
              disabled={inPipeline || addingPipeline || !firstStageId}
              className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-60 rounded-md px-3 py-1.5"
            >
              {inPipeline ? t('Pipeline\'da') : addingPipeline ? t('Ekleniyor...') : t('Pipeline\'a Ekle')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-[#DC2626] border border-[#FECACA] rounded-md px-3 py-1.5 hover:bg-[#FEF2F2] disabled:opacity-50"
            >
              {deleting ? t('Siliniyor...') : t('Sil')}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs text-[#9CA3AF]">{t('Sektör')}</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.sector || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">{t('Ülke')}</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.country || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">{t('Kaynak')}</dt>
            <dd className="text-sm text-[#111827] mt-0.5">{company.source || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">{t('Web Sitesi')}</dt>
            <dd className="text-sm mt-0.5">
              {company.website
                ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">{company.website}</a>
                : '-'
              }
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">{t('Telefon')}</dt>
            <dd className="text-sm mt-0.5">
              {company.phone
                ? <a href={`tel:${company.phone}`} className="text-[#2563EB] hover:underline">{company.phone}</a>
                : '-'
              }
            </dd>
          </div>
          {company.notes && (
            <div className="col-span-2">
              <dt className="text-xs text-[#9CA3AF]">{t('Notlar')}</dt>
              <dd className="text-sm text-[#111827] mt-0.5">{company.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <h2 className="text-xs font-semibold text-[#374151]">{t('İletişim Kişileri')}</h2>
        </div>
        {contacts.length === 0 ? (
          <div className="text-xs text-[#9CA3AF] text-center py-6">{t('Henüz kişi eklenmemiş.')}</div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {contacts.map(ct => (
              <li key={ct.id} className="px-4 py-3">
                <div className="text-sm font-medium text-[#111827]">{ct.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  {ct.email && <span className="text-xs text-[#6B7280]">{ct.email}</span>}
                  {ct.title && <span className="text-xs text-[#9CA3AF]">{ct.title}</span>}
                  {ct.seniority && (
                    <span className="text-xs font-medium text-[#374151] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full">
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
