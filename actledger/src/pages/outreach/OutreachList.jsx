import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'
import HelpButton from '../../components/HelpButton'

const FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylı' },
  { value: 'sent', label: 'Gönderildi' },
  { value: 'rejected', label: 'Reddedildi' },
]

export default function OutreachList() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = status ? `/outreach?status=${status}` : '/outreach'
    api.get(path)
      .then(data => setEmails(data.emails || []))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">Outreach</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {emails.length} email
          </span>
        </div>
        <Link
          to="/app/outreach/new"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          + Yeni Email
        </Link>
      </div>

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
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Firma</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Konu</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Durum</th>
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
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  {status ? 'Bu filtrede email bulunamadı.' : 'Henüz email oluşturulmamış.'}
                </td>
              </tr>
            ) : (
              emails.map(email => (
                <tr key={email.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{email.company_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/app/outreach/${email.id}`}
                      className="text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      {email.subject || '(konu yok)'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge status={email.opened ? 'opened' : email.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {email.created_at ? new Date(email.created_at).toLocaleDateString('tr-TR') : '—'}
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
