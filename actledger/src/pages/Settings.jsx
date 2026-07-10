import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Samimi' },
  { value: 'technical', label: 'Teknik' },
  { value: 'casual', label: 'Günlük' },
]

const PROFILE_FIELDS = [
  'company_name', 'website', 'sector', 'description',
  'value_proposition', 'target_audience', 'products_services',
  'competitors', 'usps', 'tone', 'sample_content',
]

function arrToLines(val) {
  if (Array.isArray(val)) return val.join('\n')
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.join('\n')
    } catch { /* not JSON */ }
  }
  return val || ''
}

function parseLines(str) {
  return str.split('\n').map(s => s.trim()).filter(Boolean)
}

function profileToForm(p) {
  return {
    company_name: p.company_name || '',
    website: p.website || '',
    sector: p.sector || '',
    description: p.description || '',
    value_proposition: p.value_proposition || '',
    target_audience: p.target_audience || '',
    products_services: arrToLines(p.products_services),
    competitors: arrToLines(p.competitors),
    usps: arrToLines(p.usps),
    tone: p.tone || 'formal',
    sample_content: p.sample_content || '',
  }
}

export default function Settings() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    api.get('/profile').then(data => {
      setProfile(data.profile || null)
      if (data.profile) setForm(profileToForm(data.profile))
    }).catch(() => {
      setProfile(null)
    }).finally(() => {
      setProfileLoading(false)
    })
  }, [])

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleEdit() {
    if (profile) setForm(profileToForm(profile))
    setSaveError('')
    setSaveSuccess(false)
    setEditMode(true)
  }

  function handleCancel() {
    setEditMode(false)
    setSaveError('')
    setSaveSuccess(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const payload = {
        ...form,
        products_services: parseLines(form.products_services),
        competitors: parseLines(form.competitors),
        usps: parseLines(form.usps),
      }
      const data = await api.put('/profile', payload)
      setProfile(data.profile)
      setEditMode(false)
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
  const textareaCls = inputCls + ' resize-none'
  const readValCls = 'text-sm text-[#111827]'
  const labelCls = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">Ayarlar</h1>

      {/* Hesap Bilgileri */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-4">Hesap Bilgileri</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Ad</div>
            <div className="text-sm text-[#111827]">{user?.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Email</div>
            <div className="text-sm text-[#111827]">{user?.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Şirket</div>
            <div className="text-sm text-[#111827]">{user?.company_name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Rol</div>
            <div className="text-sm text-[#111827]">{user?.role || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">Kayıt Tarihi</div>
            <div className="text-sm text-[#111827]">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Firma Profili */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#374151]">Firma Profili</div>
          {!profileLoading && profile && !editMode && (
            <button
              onClick={handleEdit}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
            >
              Düzenle
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="text-xs text-[#9CA3AF]">Yükleniyor...</div>
        ) : !profile ? (
          <div className="text-sm text-[#6B7280]">
            Henüz firma profili oluşturulmamış.{' '}
            <Link to="/app/onboarding" className="text-[#2563EB] hover:underline">
              Profil oluştur
            </Link>
          </div>
        ) : !editMode ? (
          /* Read-only view */
          <div className="flex flex-col gap-3">
            {saveSuccess && (
              <div className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">
                Profil güncellendi.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">Firma Adı</div>
                <div className={readValCls}>{profile.company_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">Web Sitesi</div>
                <div className={readValCls}>{profile.website || '—'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Sektör</div>
              <div className={readValCls}>{profile.sector || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Açıklama</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.description || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Değer Önerisi</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.value_proposition || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Hedef Kitle</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.target_audience || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Ürünler / Hizmetler</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.products_services) || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Rakipler</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.competitors) || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Ayırt Edici Özellikler (USP)</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.usps) || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">İçerik Tonu</div>
              <div className={readValCls}>
                {TONE_OPTIONS.find(t => t.value === profile.tone)?.label || profile.tone || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">Örnek İçerik</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.sample_content || '—'}</div>
            </div>
          </div>
        ) : (
          /* Edit form */
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            {saveError && (
              <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">
                {saveError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Firma Adı</label>
                <input value={form.company_name} onChange={e => setField('company_name', e.target.value)} className={inputCls} placeholder="ActLedger" />
              </div>
              <div>
                <label className={labelCls}>Web Sitesi</label>
                <input value={form.website} onChange={e => setField('website', e.target.value)} className={inputCls} placeholder="https://firmaniz.com" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Sektör</label>
              <input value={form.sector} onChange={e => setField('sector', e.target.value)} className={inputCls} placeholder="SaaS, E-ticaret, Fintech..." />
            </div>
            <div>
              <label className={labelCls}>Açıklama</label>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3} className={textareaCls} placeholder="Firmanız hakkında kısa bir açıklama" />
            </div>
            <div>
              <label className={labelCls}>Değer Önerisi</label>
              <textarea value={form.value_proposition} onChange={e => setField('value_proposition', e.target.value)} rows={2} className={textareaCls} placeholder="Müşterilerinize sunduğunuz temel değer" />
            </div>
            <div>
              <label className={labelCls}>Hedef Kitle</label>
              <textarea value={form.target_audience} onChange={e => setField('target_audience', e.target.value)} rows={2} className={textareaCls} placeholder="Hedef müşteri kitlenizi tanımlayın" />
            </div>
            <div>
              <label className={labelCls}>
                Ürünler / Hizmetler
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir ürün/hizmet</span>
              </label>
              <textarea value={form.products_services} onChange={e => setField('products_services', e.target.value)} rows={3} className={textareaCls} placeholder={'CRM yazılımı\nMobil uygulama'} />
            </div>
            <div>
              <label className={labelCls}>
                Rakipler
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir rakip</span>
              </label>
              <textarea value={form.competitors} onChange={e => setField('competitors', e.target.value)} rows={2} className={textareaCls} placeholder={'Rakip A\nRakip B'} />
            </div>
            <div>
              <label className={labelCls}>
                Ayırt Edici Özellikler (USP)
                <span className="text-[#9CA3AF] font-normal ml-1">— her satıra bir USP</span>
              </label>
              <textarea value={form.usps} onChange={e => setField('usps', e.target.value)} rows={2} className={textareaCls} placeholder={'7/24 destek\nKurulum gerektirmez'} />
            </div>
            <div>
              <label className={labelCls}>İçerik Tonu</label>
              <select value={form.tone} onChange={e => setField('tone', e.target.value)} className={inputCls}>
                {TONE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Örnek İçerik
                <span className="text-[#9CA3AF] font-normal ml-1">— isteğe bağlı</span>
              </label>
              <textarea value={form.sample_content} onChange={e => setField('sample_content', e.target.value)} rows={3} className={textareaCls} placeholder="Markanızı en iyi yansıtan bir içerik örneği" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
