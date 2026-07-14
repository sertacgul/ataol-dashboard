import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'
import HelpButton from '../../components/HelpButton'
import { useT } from '../../contexts/LanguageContext'

const FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylı' },
  { value: 'sent', label: 'Gönderildi' },
  { value: 'rejected', label: 'Reddedildi' },
]

const SECTORS = [
  '', 'Teknoloji', 'E-ticaret', 'Finans / Fintech', 'Sağlık', 'Eğitim', 'Üretim / İmalat',
  'Lojistik', 'Gıda', 'Enerji', 'İnşaat / Gayrimenkul', 'Tarım', 'Turizm',
  'Medya / Reklam', 'Hukuk', 'Danışmanlık', 'Perakende', 'Otomotiv', 'Diğer',
]

const COMPANY_SIZES = [
  '', '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+',
]

export default function OutreachList() {
  const { t } = useT()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  // Auto-outreach state
  const [aoQuery, setAoQuery] = useState('')
  const [aoSector, setAoSector] = useState('')
  const [aoSize, setAoSize] = useState('')
  const [aoLocation, setAoLocation] = useState('')
  const [aoLoading, setAoLoading] = useState(false)
  const [aoResult, setAoResult] = useState(null)
  const [aoError, setAoError] = useState('')

  function loadEmails() {
    setLoading(true)
    const path = status ? `/outreach?status=${status}` : '/outreach'
    api.get(path)
      .then(data => setEmails(data.emails || []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadEmails() }, [status])

  function exportCsv() {
    const cols = ['email', 'first_name', 'company', 'subject', 'body']
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = emails.map(e => [
      e.contact_email || '',
      (e.contact_name || '').split(' ')[0] || '',
      e.company_name || '',
      e.subject || '',
      e.body || '',
    ].map(esc).join(','))
    const csv = [cols.join(','), ...rows].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'outreach-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAutoOutreach(e) {
    e?.preventDefault()
    if (!aoQuery.trim() && !aoSector && !aoSize && !aoLocation.trim()) { setAoError(t('En az bir kriter girin')); return }
    setAoLoading(true)
    setAoResult(null)
    setAoError('')
    try {
      const data = await api.post('/email-finder/auto-outreach', {
        query: aoQuery.trim(),
        sector: aoSector,
        company_size: aoSize,
        location: aoLocation.trim(),
        local_language: false,
      })
      setAoResult(data)
      loadEmails()
    } catch (err) {
      setAoError(err.message)
    } finally {
      setAoLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">Outreach</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {emails.length} email
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={emails.length === 0}
            className="text-xs font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-50 rounded-md px-3 py-1.5"
          >
            {t('CSV İndir')}
          </button>
          <Link
            to="/app/outreach/new"
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
          >
            + {t('Yeni Email')}
          </Link>
        </div>
      </div>

      {/* Auto-Outreach section */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#ECFDF5] rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h2 className="text-sm font-semibold text-[#111827]">{t('Otomatik Outreach')}</h2>
        </div>

        <form onSubmit={handleAutoOutreach} className="space-y-3">
          {/* Row 1: Company name */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={aoQuery}
              onChange={e => setAoQuery(e.target.value)}
              placeholder={t('Hedef firma adı veya domain (opsiyonel)')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent"
            />
          </div>

          {/* Row 2: Sector + Size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-[#6B7280] mb-1">{t('Sektör')}</label>
              <select
                value={aoSector}
                onChange={e => setAoSector(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent bg-white"
              >
                <option value="">{t('Sektör seçin (opsiyonel)')}</option>
                {SECTORS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-[#6B7280] mb-1">{t('Firma Büyüklüğü')}</label>
              <select
                value={aoSize}
                onChange={e => setAoSize(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent bg-white"
              >
                <option value="">{t('Büyüklük seçin (opsiyonel)')}</option>
                {COMPANY_SIZES.filter(Boolean).map(s => <option key={s} value={s}>{s} {t('çalışan')}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Location */}
          <div>
            <label className="block text-[10px] font-medium text-[#6B7280] mb-1">{t('Lokasyon')}</label>
            <input
              type="text"
              value={aoLocation}
              onChange={e => setAoLocation(e.target.value)}
              placeholder={t('Ülke veya şehir (opsiyonel)')}
              className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent"
            />
            {aoLocation.trim() && (
              <p className="text-[10px] text-[#9CA3AF] mt-1">{t('Mail metni lokasyona uygun yerel dilde yazılacak')}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={aoLoading}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {aoLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t('Firma analiz ediliyor...')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t('Otomatik Outreach Oluştur')}
              </>
            )}
          </button>
        </form>

        {aoError && (
          <div className="mt-2 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-1.5">
            {aoError}
            <button onClick={() => setAoError('')} className="ml-2 font-bold">x</button>
          </div>
        )}
      </div>

      {/* Auto-Outreach Result Modal */}
      {aoResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAoResult(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto my-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-5 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#ECFDF5] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-sm font-semibold text-[#111827]">{t('Otomatik Outreach')}</h3>
              </div>
              <button onClick={() => setAoResult(null)} className="text-[#9CA3AF] hover:text-[#111827]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Company Info */}
              <div className="bg-[#F9FAFB] rounded-lg p-3">
                <div className="text-xs font-semibold text-[#111827] mb-1">{aoResult.company?.name}</div>
                <div className="text-[10px] text-[#6B7280] space-x-2">
                  {aoResult.company?.domain && <span>{aoResult.company.domain}</span>}
                  {aoResult.company?.sector && <><span>|</span><span>{aoResult.company.sector}</span></>}
                </div>
                {aoResult.company?.description && <p className="text-[10px] text-[#9CA3AF] mt-1">{aoResult.company.description}</p>}
              </div>

              {/* Value Proposition */}
              {aoResult.value_proposition && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-[#1D4ED8] uppercase tracking-wider mb-1">{t('Değer Önerisi')}</div>
                  <p className="text-xs text-[#1E40AF]">{aoResult.value_proposition}</p>
                </div>
              )}

              {/* Contact */}
              {aoResult.contact?.email && (
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">{t('Alıcı')}</label>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <span className="font-medium text-[#111827]">{aoResult.contact.name}</span>
                    {aoResult.contact.title && <><span className="text-[#D1D5DB]">-</span><span>{aoResult.contact.title}</span></>}
                    <span className="text-[#2563EB]">{aoResult.contact.email}</span>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">{t('Konu')}</label>
                <input type="text" defaultValue={aoResult.subject} className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-md" />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">{t('Mesaj')}</label>
                <textarea defaultValue={aoResult.body} rows={10} className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-md resize-y" />
              </div>

              {/* Saved notice */}
              {aoResult.outreach_id && (
                <div className="flex items-center gap-2 text-xs text-[#059669] bg-[#ECFDF5] border border-[#D1FAE5] rounded-md px-3 py-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t('Outreach bölümüne kaydedildi')}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {aoResult.contact?.email && (
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(aoResult.subject)
                      const body = encodeURIComponent(aoResult.body)
                      window.open(`mailto:${aoResult.contact.email}?subject=${subject}&body=${body}`)
                    }}
                    className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2"
                  >
                    {t('Mail Uygulamasında Aç')}
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Konu: ${aoResult.subject}\n\n${aoResult.body}`)
                  }}
                  className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
                >
                  {t('Kopyala')}
                </button>
                {aoResult.outreach_id && (
                  <Link
                    to={`/app/outreach/${aoResult.outreach_id}`}
                    className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] rounded-md px-4 py-2 hover:bg-[#EFF6FF]"
                  >
                    {t('Detayı Gör')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`text-xs px-3 py-1 rounded-md border ${
              status === f.value
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
            }`}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Firma')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Konu')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Durum')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Tarih')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  {t('Yükleniyor...')}
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  {status ? t('Bu filtrede email bulunamadı.') : t('Henüz email oluşturulmamış.')}
                </td>
              </tr>
            ) : (
              emails.map(email => (
                <tr key={email.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{email.company_name || '-'}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/app/outreach/${email.id}`}
                      className="text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      {email.subject || t('(konu yok)')}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge status={email.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {email.created_at ? new Date(email.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <HelpButton section="outreach" />
    </div>
  )
}
