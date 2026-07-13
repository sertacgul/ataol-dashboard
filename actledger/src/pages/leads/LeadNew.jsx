import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

const SENIORITY_OPTIONS = [
  { value: '', label: 'Seçiniz' },
  { value: 'c-level', label: 'C-Level' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
  { value: 'junior', label: 'Junior' },
]

export default function LeadNew() {
  const { t } = useT()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    website: '',
    sector: '',
    country: '',
    notes: '',
    contact_name: '',
    contact_email: '',
    contact_title: '',
    contact_seniority: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('Firma adı zorunludur.')); return }
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/leads', form)
      navigate(`/app/leads/${data.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const inputClass = 'w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
  const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/leads" className="text-xs text-[#6B7280] hover:text-[#111827]">Leads</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{t('Yeni Lead')}</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
          <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('Firma Bilgileri')}</h2>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>{t('Firma Adı')} <span className="text-[#DC2626]">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} className={inputClass} placeholder="Örn: Acme Corp" />
            </div>
            <div>
              <label className={labelClass}>{t('Web Sitesi')}</label>
              <input name="website" value={form.website} onChange={handleChange} className={inputClass} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('Sektör')}</label>
                <input name="sector" value={form.sector} onChange={handleChange} className={inputClass} placeholder="Teknoloji" />
              </div>
              <div>
                <label className={labelClass}>{t('Ülke')}</label>
                <input name="country" value={form.country} onChange={handleChange} className={inputClass} placeholder="Türkiye" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('Notlar')}</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="İlave bilgiler..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-5">
          <h2 className="text-sm font-semibold text-[#111827] mb-4">{t('İletişim Kişisi')}</h2>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>{t('Ad Soyad')}</label>
              <input name="contact_name" value={form.contact_name} onChange={handleChange} className={inputClass} placeholder="Ahmet Yılmaz" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="contact_email" value={form.contact_email} onChange={handleChange} type="email" className={inputClass} placeholder="ahmet@firma.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('Unvan')}</label>
                <input name="contact_title" value={form.contact_title} onChange={handleChange} className={inputClass} placeholder="CEO" />
              </div>
              <div>
                <label className={labelClass}>{t('Kıdem')}</label>
                <select name="contact_seniority" value={form.contact_seniority} onChange={handleChange} className={inputClass}>
                  {SENIORITY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{t(o.label)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {loading ? t('Kaydediliyor...') : t('Kaydet')}
          </button>
          <Link
            to="/app/leads"
            className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-1.5 hover:bg-[#F9FAFB]"
          >
            {t('İptal')}
          </Link>
        </div>
      </form>
    </div>
  )
}
