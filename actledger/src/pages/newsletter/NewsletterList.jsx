import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'

export default function NewsletterList() {
  const [newsletters, setNewsletters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/newsletter')
      .then(data => setNewsletters(data.newsletters || []))
      .catch(() => setNewsletters([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">Newsletter</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {newsletters.length} bülten
          </span>
        </div>
        <Link
          to="/app/newsletter/new"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          + Yeni Bülten
        </Link>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Başlık</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Durum</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center text-xs text-[#9CA3AF] py-8">
                  Yükleniyor...
                </td>
              </tr>
            ) : newsletters.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-xs text-[#9CA3AF] py-8">
                  Henüz bülten oluşturulmamış.
                </td>
              </tr>
            ) : (
              newsletters.map(n => (
                <tr key={n.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/app/newsletter/${n.id}`}
                      className="text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      {n.title || '(Başlıksız)'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge status={n.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('tr-TR') : '—'}
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
