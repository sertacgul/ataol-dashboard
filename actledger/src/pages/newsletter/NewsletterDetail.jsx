import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'
import { useT } from '../../contexts/LanguageContext'

function PosterPreview({ title, body, posterRef }) {
  const excerpt = body ? body.slice(0, 180).replace(/\n/g, ' ') : ''
  return (
    <div
      ref={posterRef}
      style={{
        background: '#1E3A8A',
        width: '600px',
        height: '313px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '30px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui,sans-serif',
      }}
    >
      <div style={{ maxWidth: '360px' }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.2, margin: '0 0 0.5rem' }}>
          {title || 'Başlık'}
        </h2>
        <p style={{ color: '#93C5FD', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
          {excerpt}{excerpt.length >= 180 ? '…' : ''}
        </p>
      </div>
    </div>
  )
}

export default function NewsletterDetail() {
  const { t } = useT()
  const { id } = useParams()
  const [newsletter, setNewsletter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const posterRef = useRef(null)

  useEffect(() => {
    api.get(`/newsletter/${id}`)
      .then(data => setNewsletter(data.newsletter))
      .catch(() => setError('Bülten yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDownloadPng() {
    if (!posterRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(posterRef.current, { useCORS: true })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${newsletter?.title || 'poster'}.png`
      a.click()
    } catch {
      alert('PNG indirme başarısız.')
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleSaveTemplate() {
    if (!newsletter) return
    setSavingTemplate(true)
    try {
      await api.post('/templates', {
        category: 'newsletter',
        name: newsletter.title,
        content: newsletter.body,
      })
      alert('Şablon olarak kaydedildi.')
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-[#9CA3AF] py-8">{t('Yükleniyor...')}</p>
  }

  if (error || !newsletter) {
    return (
      <div>
        <p className="text-xs text-[#991B1B]">{error || 'Bülten bulunamadı.'}</p>
        <Link to="/app/newsletter" className="text-xs text-[#2563EB] mt-2 block">{t('Listeye Dön')}</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/newsletter" className="text-xs text-[#6B7280] hover:text-[#111827]">Newsletter</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{newsletter.title || '(Başlıksız)'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#111827]">{newsletter.title || '(Başlıksız)'}</h1>
          <Badge status={newsletter.status} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPng}
            className="text-xs font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5"
          >
            {t('Poster İndir (PNG)')}
          </button>
          <button
            onClick={handlePrint}
            className="text-xs font-medium text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5"
          >
            {t('PDF İndir')}
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-3 py-1.5"
          >
            {savingTemplate ? '...' : t('Şablon Olarak Kaydet')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-4">
        <h2 className="text-xs font-medium text-[#374151] mb-3">{t('İçerik')}</h2>
        <div className="text-sm text-[#111827] leading-relaxed whitespace-pre-wrap">
          {newsletter.body || '-'}
        </div>
      </div>

      {/* Poster */}
      <div className="mb-4">
        <h2 className="text-xs font-medium text-[#374151] mb-2">Poster Önizleme</h2>
        <div className="border border-[#E5E7EB] rounded-md overflow-hidden inline-block">
          <PosterPreview
            title={newsletter.title}
            body={newsletter.body}
            posterRef={posterRef}
          />
        </div>
      </div>

      <div className="text-xs text-[#9CA3AF]">
        Oluşturulma: {newsletter.created_at ? new Date(newsletter.created_at).toLocaleDateString('tr-TR') : '-'}
      </div>
    </div>
  )
}
