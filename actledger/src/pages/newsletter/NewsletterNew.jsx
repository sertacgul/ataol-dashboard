import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

const inputClass = 'w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

function buildPosterHtml(title, body) {
  const excerpt = body ? body.slice(0, 200).replace(/\n/g, ' ') : ''
  return `<div style="width:1200px;height:627px;background:#1E3A8A;display:flex;flex-direction:column;justify-content:flex-end;padding:60px;box-sizing:border-box;font-family:system-ui,sans-serif;"><div style="max-width:700px;"><h1 style="color:#fff;font-size:42px;font-weight:700;line-height:1.2;margin:0 0 20px;">${title || 'Başlık'}</h1><p style="color:#93C5FD;font-size:18px;line-height:1.6;margin:0;">${excerpt}${excerpt.length === 200 ? '…' : ''}</p></div></div>`
}

function PosterPreview({ title, body }) {
  const excerpt = body ? body.slice(0, 180).replace(/\n/g, ' ') : ''
  return (
    <div
      className="flex flex-col justify-end rounded-md overflow-hidden"
      style={{
        background: '#1E3A8A',
        aspectRatio: '1200/627',
        padding: '5%',
        fontFamily: 'system-ui,sans-serif',
      }}
    >
      <div style={{ maxWidth: '60%' }}>
        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, margin: '0 0 0.5rem' }}>
          {title || 'Başlık'}
        </h2>
        <p style={{ color: '#93C5FD', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
          {excerpt}{excerpt.length >= 180 ? '…' : ''}
        </p>
      </div>
    </div>
  )
}

export default function NewsletterNew() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileContext, setProfileContext] = useState('')

  useEffect(() => {
    api.get('/profile').then(data => {
      const p = data.profile
      if (!p) return
      const ctx = [
        p.company_name && `Firma: ${p.company_name}`,
        p.sector && `Sektör: ${p.sector}`,
        p.description && `Açıklama: ${p.description}`,
        p.value_proposition && `Değer Önerisi: ${p.value_proposition}`,
        p.target_audience && `Hedef Kitle: ${p.target_audience}`,
        p.tone && `Ton: ${p.tone}`,
      ].filter(Boolean).join('\n')
      setProfileContext(ctx)
    }).catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!title) { setError('Önce başlık girin.'); return }
    setAiLoading(true)
    setError('')
    try {
      const prompt = `${profileContext ? profileContext + '\n\n' : ''}Başlık: "${title}"\n\nBu başlık için profesyonel, değer odaklı, okunabilir bir email newsletter içeriği yaz. Türkçe, HTML olmadan düz metin. 3-5 paragraf.`
      const data = await api.post('/ai/generate', { prompt })
      setBody(data.text || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave(status) {
    setSaving(true)
    setError('')
    try {
      const poster_html = buildPosterHtml(title, body)
      await api.post('/newsletter', { title, body, poster_html, status })
      navigate('/app/newsletter')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/newsletter" className="text-xs text-[#6B7280] hover:text-[#111827]">Newsletter</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">Yeni Bülten</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-4">
        {/* Title */}
        <div className="mb-4">
          <label className={labelClass}>Başlık</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Bülten başlığı..."
          />
        </div>

        {/* AI generate */}
        <div className="mb-4">
          <button
            onClick={handleGenerate}
            disabled={aiLoading}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {aiLoading ? 'İçerik oluşturuluyor...' : 'OperIQ ile İçerik Oluştur'}
          </button>
        </div>

        {/* Body */}
        <div className="mb-6">
          <label className={labelClass}>İçerik</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={12}
            className={`${inputClass} resize-y`}
            placeholder="Bülten içeriği..."
          />
        </div>

        {/* Poster preview */}
        {(title || body) && (
          <div className="mb-6">
            <label className={labelClass}>Poster Önizleme (1200×627 oranı)</label>
            <div className="border border-[#E5E7EB] rounded-md overflow-hidden">
              <PosterPreview title={title} body={body} />
            </div>
          </div>
        )}

        {/* Save buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="text-xs font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {saving ? 'Kaydediliyor...' : 'Taslak Kaydet'}
          </button>
          <button
            onClick={() => handleSave('completed')}
            disabled={saving}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {saving ? 'Kaydediliyor...' : 'Tamamla'}
          </button>
          <Link
            to="/app/newsletter"
            className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md px-4 py-1.5"
          >
            İptal
          </Link>
        </div>
      </div>
    </div>
  )
}
