import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useT } from '../../contexts/LanguageContext'

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

export default function SeoDetail() {
  const { t } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    api.get(`/seo/${id}`)
      .then(data => setArticle(data.article))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handlePublish() {
    setPublishing(true)
    setPublishError('')
    setPublishResult(null)
    try {
      const data = await api.post('/blog/publish', { article_id: id })
      setPublishResult(data)
    } catch (err) {
      setPublishError(err.message || 'Yayinlama basarisiz')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  if (error) {
    return (
      <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
        {error}
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/seo" className="text-xs text-[#6B7280] hover:text-[#111827]">{t('SEO Makaleleri')}</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{article.title || t('(Başlıksız)')}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[article.status] || 'text-[#6B7280] bg-[#F3F4F6]'}`}>
            {t(STATUS_LABELS[article.status] || article.status || 'Taslak')}
          </span>
          <span className="text-xs text-[#9CA3AF]">Aşama {article.step || 1} / 6</span>
          {article.seo_score !== null && article.seo_score !== undefined && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              article.seo_score >= 70 ? 'text-[#065F46] bg-[#ECFDF5]' :
              article.seo_score >= 40 ? 'text-[#92400E] bg-[#FEF3C7]' :
              'text-[#991B1B] bg-[#FEE2E2]'
            }`}>
              SEO: {article.seo_score}/100
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-50 rounded-md px-3 py-1.5"
          >
            {publishing ? t('Yayinlaniyor...') : t("Blog'a Yayinla")}
          </button>
          <button
            onClick={() => navigate(`/app/seo/new?id=${id}`)}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
          >
            {t('Düzenle')}
          </button>
        </div>
      </div>

      {publishResult && (
        <div className="mb-4 text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">
          Yayinlandi!{' '}
          {publishResult.url && (
            <a href={publishResult.url} target="_blank" rel="noreferrer" className="underline font-medium">
              Yayin linkini goruntule
            </a>
          )}
        </div>
      )}
      {publishError && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {publishError}
          {publishError.includes('ayar') && (
            <Link to="/app/settings" className="ml-2 underline font-medium text-[#2563EB]">
              Ayarlar sayfasina git
            </Link>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Meta */}
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">{t('Genel Bilgiler')}</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-[#9CA3AF]">{t('Başlık')}</p>
              <p className="text-sm text-[#111827] font-medium">{article.title || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">{t('Konu')}</p>
              <p className="text-sm text-[#111827]">{article.topic || '-'}</p>
            </div>
            {article.keywords && (
              <div>
                <p className="text-xs text-[#9CA3AF]">{t('Anahtar Kelimeler')}</p>
                <p className="text-sm text-[#111827]">{article.keywords}</p>
              </div>
            )}
            {article.keyword_density != null && (
              <div>
                <p className="text-xs text-[#9CA3AF]">{t('Anahtar Kelime Yoğunluğu')}</p>
                <p className="text-sm text-[#111827]">%{article.keyword_density}</p>
              </div>
            )}
            {article.meta_title && (
              <div>
                <p className="text-xs text-[#9CA3AF]">Meta Başlık</p>
                <p className="text-sm text-[#111827]">{article.meta_title}</p>
              </div>
            )}
            {article.meta_description && (
              <div>
                <p className="text-xs text-[#9CA3AF]">Meta Açıklama</p>
                <p className="text-sm text-[#111827]">{article.meta_description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#9CA3AF]">{t('Oluşturulma Tarihi')}</p>
              <p className="text-sm text-[#111827]">
                {article.created_at ? new Date(article.created_at).toLocaleDateString('tr-TR') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* TR Content */}
        {article.body_tr && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">{t('Türkçe İçerik')}</h2>
            <pre className="text-xs text-[#111827] whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
              {(article.body_tr || '').replace(/^#{1,6}\s+/gm, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').replace(/_{1,2}([^_]+)_{1,2}/g, '$1')}
            </pre>
          </div>
        )}

        {/* EN Content */}
        {article.body_en && (
          <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">{t('İngilizce İçerik')}</h2>
            <pre className="text-xs text-[#111827] whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
              {(article.body_en || '').replace(/^#{1,6}\s+/gm, '').replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').replace(/_{1,2}([^_]+)_{1,2}/g, '$1')}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
