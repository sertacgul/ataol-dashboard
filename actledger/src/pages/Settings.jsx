import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import HelpButton from '../components/HelpButton'
import { useT } from '../contexts/LanguageContext'

const EMPTY_EMAIL_SETTINGS = {
  smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', from_name: '', from_email: '',
}

const EMPTY_BLOG_SETTINGS = {
  platform: 'wordpress', blog_url: '', api_username: '', api_password: '',
}

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
  const { t, lang } = useT()
  const isEn = lang === 'en'
  const { user } = useAuth()

  // Discount code state
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemSubmitting, setRedeemSubmitting] = useState(false)
  const [redeemError, setRedeemError] = useState('')
  const [redeemed, setRedeemed] = useState(null)

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Email settings state
  const [emailSettings, setEmailSettings] = useState(null)
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailEditMode, setEmailEditMode] = useState(false)
  const [emailForm, setEmailForm] = useState(EMPTY_EMAIL_SETTINGS)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailTesting, setEmailTesting] = useState(false)

  // Blog settings state
  const [blogSettings, setBlogSettings] = useState(null)
  const [blogLoading, setBlogLoading] = useState(true)
  const [blogEditMode, setBlogEditMode] = useState(false)
  const [blogForm, setBlogForm] = useState(EMPTY_BLOG_SETTINGS)
  const [blogSaving, setBlogSaving] = useState(false)
  const [blogError, setBlogError] = useState('')
  const [blogSuccess, setBlogSuccess] = useState('')

  useEffect(() => {
    api.get('/profile').then(data => {
      setProfile(data.profile || null)
      if (data.profile) setForm(profileToForm(data.profile))
    }).catch(() => {
      setProfile(null)
    }).finally(() => {
      setProfileLoading(false)
    })

    api.get('/email-settings').then(data => {
      setEmailSettings(data.settings || null)
      if (data.settings) {
        setEmailForm({
          smtp_host: data.settings.smtp_host || '',
          smtp_port: String(data.settings.smtp_port || 587),
          smtp_user: data.settings.smtp_user || '',
          smtp_pass: data.settings.smtp_pass || '',
          from_name: data.settings.from_name || '',
          from_email: data.settings.from_email || '',
        })
      }
    }).catch(() => setEmailSettings(null)).finally(() => setEmailLoading(false))

    api.get('/blog').then(data => {
      setBlogSettings(data.settings || null)
      if (data.settings) {
        setBlogForm({
          platform: data.settings.platform || 'wordpress',
          blog_url: data.settings.blog_url || '',
          api_username: data.settings.api_username || '',
          api_password: data.settings.api_password || '',
        })
      }
    }).catch(() => setBlogSettings(null)).finally(() => setBlogLoading(false))
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

  async function handleEmailSave(e) {
    e.preventDefault()
    setEmailSaving(true)
    setEmailError('')
    setEmailSuccess('')
    try {
      const payload = { ...emailForm, smtp_port: Number(emailForm.smtp_port) || 587 }
      if (emailSettings) {
        await api.put('/email-settings', payload)
      } else {
        await api.post('/email-settings', payload)
      }
      // Refresh
      const data = await api.get('/email-settings')
      setEmailSettings(data.settings || null)
      setEmailEditMode(false)
      setEmailSuccess('Email ayarları kaydedildi.')
    } catch (err) {
      setEmailError(err.message || 'Kayıt başarısız')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleEmailTest() {
    setEmailTesting(true)
    setEmailError('')
    setEmailSuccess('')
    try {
      const data = await api.post('/email-settings/test', {})
      setEmailSuccess(data.message || 'Test emaili gönderildi.')
    } catch (err) {
      setEmailError(err.message || 'Test gönderilemedi')
    } finally {
      setEmailTesting(false)
    }
  }

  async function handleBlogSave(e) {
    e.preventDefault()
    setBlogSaving(true)
    setBlogError('')
    setBlogSuccess('')
    try {
      if (blogSettings) {
        await api.put('/blog', blogForm)
      } else {
        await api.post('/blog', blogForm)
      }
      const data = await api.get('/blog')
      setBlogSettings(data.settings || null)
      setBlogEditMode(false)
      setBlogSuccess('Blog ayarları kaydedildi.')
    } catch (err) {
      setBlogError(err.message || 'Kayıt başarısız')
    } finally {
      setBlogSaving(false)
    }
  }

  async function handleRedeem(e) {
    e.preventDefault()
    setRedeemSubmitting(true)
    setRedeemError('')
    try {
      const data = await api.post('/auth/redeem-code', { code: redeemCode })
      setRedeemed({ discount_percent: data.discount_percent, discount_expires_at: data.discount_expires_at })
    } catch (err) {
      setRedeemError(err.message || (isEn ? 'Invalid discount code' : 'Geçersiz indirim kodu'))
    } finally {
      setRedeemSubmitting(false)
    }
  }

  const discount = redeemed || (user?.discount_code
    ? { discount_percent: user.discount_percent, discount_expires_at: user.discount_expires_at }
    : null)

  const inputCls = 'w-full text-sm border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:border-[#2563EB] bg-white text-[#111827] placeholder-[#9CA3AF]'
  const textareaCls = inputCls + ' resize-none'
  const readValCls = 'text-sm text-[#111827]'
  const labelCls = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div>
      <h1 className="text-base font-semibold text-[#111827] mb-4">{t('Ayarlar')}</h1>

      {/* Hesap Bilgileri */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-4">{t('Hesap Bilgileri')}</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">{t('Ad')}</div>
            <div className="text-sm text-[#111827]">{user?.name || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">{t('Email')}</div>
            <div className="text-sm text-[#111827]">{user?.email || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">{t('Şirket')}</div>
            <div className="text-sm text-[#111827]">{user?.company_name || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">{t('Rol')}</div>
            <div className="text-sm text-[#111827]">{user?.role || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-[#6B7280] mb-0.5">{t('Kayıt Tarihi')}</div>
            <div className="text-sm text-[#111827]">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* İndirim Kodu */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-4">{isEn ? 'Discount Code' : 'İndirim Kodu'}</div>
        {discount ? (
          <div className="text-sm text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">
            {isEn
              ? `${discount.discount_percent}% discount active — until ${new Date(discount.discount_expires_at).toLocaleDateString('en-US')}`
              : `%${discount.discount_percent} indirim aktif — ${new Date(discount.discount_expires_at).toLocaleDateString('tr-TR')} tarihine kadar`}
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="flex flex-col gap-3">
            {redeemError && (
              <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{redeemError}</div>
            )}
            <div className="flex gap-2">
              <input value={redeemCode} onChange={e => setRedeemCode(e.target.value)} className={inputCls + ' uppercase'} placeholder={isEn ? 'Enter code' : 'Kodu girin'} />
              <button type="submit" disabled={redeemSubmitting || !redeemCode.trim()} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2 whitespace-nowrap">
                {redeemSubmitting ? (isEn ? 'Applying...' : 'Uygulanıyor...') : (isEn ? 'Apply' : 'Uygula')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Email Ayarları */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#374151]">{t('Email Ayarları')}</div>
          {!emailLoading && emailSettings && !emailEditMode && (
            <button
              onClick={() => { setEmailEditMode(true); setEmailError(''); setEmailSuccess('') }}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
            >
              {t('Düzenle')}
            </button>
          )}
        </div>
        {emailLoading ? (
          <div className="text-xs text-[#9CA3AF]">{t('Yükleniyor...')}</div>
        ) : !emailSettings || emailEditMode ? (
          <form onSubmit={handleEmailSave} className="flex flex-col gap-3">
            {emailError && (
              <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{emailError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>{t('SMTP Sunucu')}</label>
                <input value={emailForm.smtp_host} onChange={e => setEmailForm(p => ({ ...p, smtp_host: e.target.value }))} className={inputCls} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className={labelCls}>{t('Port')}</label>
                <input value={emailForm.smtp_port} onChange={e => setEmailForm(p => ({ ...p, smtp_port: e.target.value }))} className={inputCls} placeholder="587" type="number" />
              </div>
              <div>
                <label className={labelCls}>{t('Kullanıcı Adı')}</label>
                <input value={emailForm.smtp_user} onChange={e => setEmailForm(p => ({ ...p, smtp_user: e.target.value }))} className={inputCls} placeholder="user@domain.com" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t('Şifre')}</label>
                <input type="password" value={emailForm.smtp_pass} onChange={e => setEmailForm(p => ({ ...p, smtp_pass: e.target.value }))} className={inputCls} placeholder="••••••••" />
              </div>
              <div>
                <label className={labelCls}>{t('Gönderici Adı')}</label>
                <input value={emailForm.from_name} onChange={e => setEmailForm(p => ({ ...p, from_name: e.target.value }))} className={inputCls} placeholder="Firma Adı" />
              </div>
              <div>
                <label className={labelCls}>{t('Gönderici Email')}</label>
                <input value={emailForm.from_email} onChange={e => setEmailForm(p => ({ ...p, from_email: e.target.value }))} className={inputCls} placeholder="hello@firma.com" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              {emailEditMode && (
                <button type="button" onClick={() => setEmailEditMode(false)} className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]">{t('İptal')}</button>
              )}
              <button type="submit" disabled={emailSaving} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2">
                {emailSaving ? t('Kaydediliyor...') : t('Kaydet')}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            {emailSuccess && (
              <div className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">{emailSuccess}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('SMTP Sunucu')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.smtp_host || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Port')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.smtp_port || 587}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Kullanıcı Adı')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.smtp_user || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Şifre')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.smtp_pass || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Gönderici Adı')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.from_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Gönderici Email')}</div>
                <div className="text-sm text-[#111827]">{emailSettings.from_email || '-'}</div>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleEmailTest}
                disabled={emailTesting}
                className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-50 rounded-md px-3 py-1.5"
              >
                {emailTesting ? t('Gönderiliyor...') : t('Test Emaili Gönder')}
              </button>
              {emailError && <div className="text-xs text-[#991B1B] mt-2">{emailError}</div>}
              {emailSuccess && <div className="text-xs text-[#065F46] mt-2">{emailSuccess}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Blog Ayarları */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-md mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#374151]">{t('Blog Ayarları')}</div>
          {!blogLoading && blogSettings && !blogEditMode && (
            <button
              onClick={() => { setBlogEditMode(true); setBlogError(''); setBlogSuccess('') }}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
            >
              {t('Düzenle')}
            </button>
          )}
        </div>
        {blogLoading ? (
          <div className="text-xs text-[#9CA3AF]">{t('Yükleniyor...')}</div>
        ) : !blogSettings || blogEditMode ? (
          <form onSubmit={handleBlogSave} className="flex flex-col gap-3">
            {blogError && (
              <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{blogError}</div>
            )}
            <div>
              <label className={labelCls}>{t('Platform')}</label>
              <select value={blogForm.platform} onChange={e => setBlogForm(p => ({ ...p, platform: e.target.value }))} className={inputCls}>
                <option value="wordpress">WordPress</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('Blog URL')}</label>
              <input value={blogForm.blog_url} onChange={e => setBlogForm(p => ({ ...p, blog_url: e.target.value }))} className={inputCls} placeholder="https://blogunuz.com" />
            </div>
            <div>
              <label className={labelCls}>{t('API Kullanıcı Adı')}</label>
              <input value={blogForm.api_username} onChange={e => setBlogForm(p => ({ ...p, api_username: e.target.value }))} className={inputCls} placeholder="WordPress kullanıcı adı" />
            </div>
            <div>
              <label className={labelCls}>{t('API Şifresi (Uygulama Şifresi)')}</label>
              <input type="password" value={blogForm.api_password} onChange={e => setBlogForm(p => ({ ...p, api_password: e.target.value }))} className={inputCls} placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" />
            </div>
            <div className="text-xs text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2">
              {t('WordPress için Uygulama Şifresi kullanın. Kullanıcı Profili sayfasından Uygulama Şifreleri bölümünden oluşturabilirsiniz.')}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              {blogEditMode && (
                <button type="button" onClick={() => setBlogEditMode(false)} className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]">{t('İptal')}</button>
              )}
              <button type="submit" disabled={blogSaving} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2">
                {blogSaving ? t('Kaydediliyor...') : t('Kaydet')}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            {blogSuccess && (
              <div className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">{blogSuccess}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Platform')}</div>
                <div className="text-sm text-[#111827]">{blogSettings.platform || 'WordPress'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Blog URL')}</div>
                <div className="text-sm text-[#111827]">{blogSettings.blog_url || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('API Kullanıcı Adı')}</div>
                <div className="text-sm text-[#111827]">{blogSettings.api_username || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('API Şifresi (Uygulama Şifresi)')}</div>
                <div className="text-sm text-[#111827]">{blogSettings.api_password || '-'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Firma Profili */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-[#374151]">{t('Firma Profili')}</div>
          {!profileLoading && profile && !editMode && (
            <button
              onClick={handleEdit}
              className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-3 py-1.5"
            >
              {t('Düzenle')}
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="text-xs text-[#9CA3AF]">{t('Yükleniyor...')}</div>
        ) : !profile ? (
          <div className="text-sm text-[#6B7280]">
            {t('Henüz firma profili oluşturulmamış.')}{' '}
            <Link to="/app/onboarding" className="text-[#2563EB] hover:underline">
              {t('Profil oluştur')}
            </Link>
          </div>
        ) : !editMode ? (
          /* Read-only view */
          <div className="flex flex-col gap-3">
            {saveSuccess && (
              <div className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">
                {t('Profil güncellendi.')}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Firma Adı')}</div>
                <div className={readValCls}>{profile.company_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-[#6B7280] mb-0.5">{t('Web Sitesi')}</div>
                <div className={readValCls}>{profile.website || '-'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Sektör')}</div>
              <div className={readValCls}>{profile.sector || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Açıklama')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.description || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Değer Önerisi')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.value_proposition || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Hedef Kitle')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.target_audience || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Ürünler / Hizmetler')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.products_services) || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Rakipler')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.competitors) || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Ayırt Edici Özellikler (USP)')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{arrToLines(profile.usps) || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('İçerik Tonu')}</div>
              <div className={readValCls}>
                {t(TONE_OPTIONS.find(o => o.value === profile.tone)?.label || profile.tone || '-')}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] mb-0.5">{t('Örnek İçerik')}</div>
              <div className={readValCls + ' whitespace-pre-line'}>{profile.sample_content || '-'}</div>
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
                <label className={labelCls}>{t('Firma Adı')}</label>
                <input value={form.company_name} onChange={e => setField('company_name', e.target.value)} className={inputCls} placeholder="ActLedger" />
              </div>
              <div>
                <label className={labelCls}>{t('Web Sitesi')}</label>
                <input value={form.website} onChange={e => setField('website', e.target.value)} className={inputCls} placeholder="https://firmaniz.com" />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('Sektör')}</label>
              <input value={form.sector} onChange={e => setField('sector', e.target.value)} className={inputCls} placeholder="SaaS, E-ticaret, Fintech..." />
            </div>
            <div>
              <label className={labelCls}>{t('Açıklama')}</label>
              <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3} className={textareaCls} placeholder="Firmanız hakkında kısa bir açıklama" />
            </div>
            <div>
              <label className={labelCls}>{t('Değer Önerisi')}</label>
              <textarea value={form.value_proposition} onChange={e => setField('value_proposition', e.target.value)} rows={2} className={textareaCls} placeholder="Müşterilerinize sunduğunuz temel değer" />
            </div>
            <div>
              <label className={labelCls}>{t('Hedef Kitle')}</label>
              <textarea value={form.target_audience} onChange={e => setField('target_audience', e.target.value)} rows={2} className={textareaCls} placeholder="Hedef müşteri kitlenizi tanımlayın" />
            </div>
            <div>
              <label className={labelCls}>
                {t('Ürünler / Hizmetler')}
                <span className="text-[#9CA3AF] font-normal ml-1">{t('- her satıra bir ürün/hizmet')}</span>
              </label>
              <textarea value={form.products_services} onChange={e => setField('products_services', e.target.value)} rows={3} className={textareaCls} placeholder={'CRM yazılımı\nMobil uygulama'} />
            </div>
            <div>
              <label className={labelCls}>
                {t('Rakipler')}
                <span className="text-[#9CA3AF] font-normal ml-1">{t('- her satıra bir rakip')}</span>
              </label>
              <textarea value={form.competitors} onChange={e => setField('competitors', e.target.value)} rows={2} className={textareaCls} placeholder={'Rakip A\nRakip B'} />
            </div>
            <div>
              <label className={labelCls}>
                {t('Ayırt Edici Özellikler (USP)')}
                <span className="text-[#9CA3AF] font-normal ml-1">{t('- her satıra bir USP')}</span>
              </label>
              <textarea value={form.usps} onChange={e => setField('usps', e.target.value)} rows={2} className={textareaCls} placeholder={'7/24 destek\nKurulum gerektirmez'} />
            </div>
            <div>
              <label className={labelCls}>{t('İçerik Tonu')}</label>
              <select value={form.tone} onChange={e => setField('tone', e.target.value)} className={inputCls}>
                {TONE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                {t('Örnek İçerik')}
                <span className="text-[#9CA3AF] font-normal ml-1">{t('- isteğe bağlı')}</span>
              </label>
              <textarea value={form.sample_content} onChange={e => setField('sample_content', e.target.value)} rows={3} className={textareaCls} placeholder="Markanızı en iyi yansıtan bir içerik örneği" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-medium text-[#374151] border border-[#E5E7EB] rounded-md px-4 py-2 hover:bg-[#F9FAFB]"
              >
                {t('İptal')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2"
              >
                {saving ? t('Kaydediliyor...') : t('Kaydet')}
              </button>
            </div>
          </form>
        )}
      </div>
      <HelpButton section="ayarlar" />
    </div>
  )
}
