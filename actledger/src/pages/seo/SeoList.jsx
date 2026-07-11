import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import HelpButton from '../../components/HelpButton'
import { useT } from '../../contexts/LanguageContext'

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
]

const STATUS_LABELS = {
  draft: 'Taslak',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
}

const STATUS_COLORS = {
  draft: 'text-[#6B7280] bg-[#F3F4F6]',
  in_progress: 'text-[#1D4ED8] bg-[#EFF6FF]',
  completed: 'text-[#065F46] bg-[#ECFDF5]',
}

export default function SeoList() {
  const { t } = useT()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = activeStatus ? `/seo?status=${activeStatus}` : '/seo'
    api.get(path)
      .then(data => setArticles(data.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [activeStatus])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">{t('SEO Makaleleri')}</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {`${articles.length} ${t('makale')}`}
          </span>
        </div>
        <Link
          to="/app/seo/new"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          + {t('Yeni Makale')}
        </Link>
      </div>

      <div className="flex items-center gap-1 mb-4">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveStatus(f.value)}
            className={`text-xs rounded-md px-3 py-1.5 border transition-colors ${
              activeStatus === f.value
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
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Başlık')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Konu')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Aşama')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Durum')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Tarih')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-xs text-[#9CA3AF] py-8">
                  {t('Yükleniyor...')}
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-xs text-[#9CA3AF] py-8">
                  {t('Henüz makale oluşturulmamış.')}
                </td>
              </tr>
            ) : (
              articles.map(a => (
                <tr key={a.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/app/seo/${a.id}`}
                      className="text-sm font-medium text-[#2563EB] hover:underline"
                    >
                      {a.title || t('(Başlıksız)')}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{a.topic || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{a.step || 1} / 6</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || 'text-[#6B7280] bg-[#F3F4F6]'}`}>
                      {t(STATUS_LABELS[a.status] || a.status || 'Taslak')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <HelpButton section="icerik-uretimi" />
    </div>
  )
}
