import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'
import { useT } from '../../contexts/LanguageContext'

const PLATFORM_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
]

const PLATFORM_COLORS = {
  linkedin: { bg: '#0077B5', label: 'LinkedIn' },
  twitter: { bg: '#1DA1F2', label: 'Twitter/X' },
  instagram: { bg: '#E4405F', label: 'Instagram' },
  facebook: { bg: '#1877F2', label: 'Facebook' },
}

const STATUS_LABELS = {
  draft: 'Taslak',
  scheduled: 'Planlandı',
  published: 'Yayınlandı',
}

function PlatformBadge({ platform }) {
  const p = PLATFORM_COLORS[platform]
  if (!p) return <span className="text-xs text-[#6B7280]">{platform || '-'}</span>
  return (
    <span
      className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: p.bg }}
    >
      {p.label}
    </span>
  )
}

export default function SocialList() {
  const { t } = useT()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activePlatform, setActivePlatform] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = activePlatform ? `/social?platform=${activePlatform}` : '/social'
    api.get(path)
      .then(data => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [activePlatform])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">{t('Sosyal Medya')}</h1>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
            {posts.length} post
          </span>
        </div>
        <Link
          to="/app/social/new"
          className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
        >
          + {t('Yeni Post')}
        </Link>
      </div>

      <div className="flex items-center gap-1 mb-4">
        {PLATFORM_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActivePlatform(f.value)}
            className={`text-xs rounded-md px-3 py-1.5 border transition-colors ${
              activePlatform === f.value
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
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('Platform')}</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">{t('İçerik')}</th>
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
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-xs text-[#9CA3AF] py-8">
                  {t('Henüz post oluşturulmamış.')}
                </td>
              </tr>
            ) : (
              posts.map(p => (
                <tr key={p.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2.5">
                    <PlatformBadge platform={p.platform} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#374151] max-w-sm">
                    <span className="truncate block" style={{ maxWidth: '320px' }}>
                      {p.content ? (p.content.length > 80 ? p.content.slice(0, 80) + '…' : p.content) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge status={p.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#9CA3AF]">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : '-'}
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
