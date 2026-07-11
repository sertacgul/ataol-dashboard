import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import HelpButton from '../components/HelpButton'
import { useT } from '../contexts/LanguageContext'

export default function Dashboard() {
  const { t } = useT()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(data => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  const openRate = stats?.total_sent > 0
    ? Math.round((stats.total_opened / stats.total_sent) * 100) + '%'
    : '-'

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <StatCard label="Toplam Lead" value={stats?.total_companies ?? '-'} />
        <StatCard label="Gönderilen Email" value={stats?.total_sent ?? '-'} />
        <StatCard label="Açılma Oranı (%)" value={openRate} />
        <StatCard label="Toplam Email" value={stats?.total_emails ?? '-'} />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#374151]">{t('Son Emailler')}</h2>
          <Link to="/app/outreach" className="text-xs text-[#2563EB] hover:underline">{t('Tümünü Gör')}</Link>
        </div>
        {!stats?.recent_emails?.length ? (
          <div className="text-xs text-[#9CA3AF] text-center py-8">{t('Henüz email bulunmuyor.')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Firma')}</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Konu')}</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Durum')}</th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Tarih')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_emails.map(email => (
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
                    <Badge status={email.opened ? 'opened' : email.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {email.created_at ? new Date(email.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <HelpButton section="baslangic" />
    </div>
  )
}
