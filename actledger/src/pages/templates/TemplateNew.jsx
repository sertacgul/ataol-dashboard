import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

const inputClass = 'w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

const CATEGORIES = [
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Sosyal Medya' },
  { value: 'seo', label: 'SEO' },
  { value: 'newsletter', label: 'Newsletter' },
]

const SOCIAL_PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
]

export default function TemplateNew() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('email')
  const [platform, setPlatform] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name) { setError('Şablon adı zorunludur.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/templates', {
        name,
        category,
        platform: category === 'social' ? platform : null,
        content,
        tags,
      })
      navigate('/app/templates')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/templates" className="text-xs text-[#6B7280] hover:text-[#111827]">Şablonlar</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">Yeni Şablon</span>
      </div>

      {error && (
        <div className="mb-4 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-5 mb-4">
        {/* Name */}
        <div className="mb-4">
          <label className={labelClass}>Şablon Adı</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
            placeholder="Şablon adı..."
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className={labelClass}>Kategori</label>
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPlatform('') }}
            className={inputClass}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Platform — only if social */}
        {category === 'social' && (
          <div className="mb-4">
            <label className={labelClass}>Platform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className={inputClass}
            >
              <option value="">Seçin...</option>
              {SOCIAL_PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          <label className={labelClass}>İçerik</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            className={`${inputClass} resize-y`}
            placeholder="Şablon içeriği..."
          />
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className={labelClass}>Etiketler (virgülle ayırın)</label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            className={inputClass}
            placeholder="satış, tanıtım, hoş geldin"
          />
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-1.5"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <Link
            to="/app/templates"
            className="text-xs text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md px-4 py-1.5"
          >
            İptal
          </Link>
        </div>
      </div>
    </div>
  )
}
