import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import HelpButton from '../components/HelpButton'
import PasswordInput from '../components/PasswordInput'
import { useT } from '../contexts/LanguageContext'

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

const VARIANTS = {
  pro: { month: '1904790', year: '1904803' },
  growth: { month: '1904815', year: '1904807' },
  team: { month: '1904872', year: '1904858' },
  packs: { c40: '1904911', c200: '1904915', c1000: '1904921' },
}

const PLANS = [
  { key: 'pro', name: 'Pro', priceMonth: '$29/mo', priceYear: '$290/yr' },
  { key: 'growth', name: 'Growth', priceMonth: '$49/mo', priceYear: '$490/yr' },
  { key: 'team', name: 'Team', priceMonth: '$29/user/mo', priceYear: '$290/user/yr' },
]

const CREDIT_PACKS = [
  { variant: VARIANTS.packs.c40, credits: 40, price: '$10' },
  { variant: VARIANTS.packs.c200, credits: 200, price: '$35' },
  { variant: VARIANTS.packs.c1000, credits: 1000, price: '$120' },
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

  // Plan & billing state
  const [billingCycle, setBillingCycle] = useState('month')
  const [submitting, setSubmitting] = useState(false)
  const [billingErr, setBillingErr] = useState('')

  // Change password state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwSubmitting, setPwSubmitting] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)


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
      if (data.type === 'free_month') {
        setRedeemed({ free_month: true, code: data.code, redeem_expires_at: data.redeem_expires_at })
      } else {
        setRedeemed({ discount_percent: data.discount_percent, discount_expires_at: data.discount_expires_at })
      }
    } catch (err) {
      setRedeemError(err.message || (isEn ? 'Invalid discount code' : 'Geçersiz indirim kodu'))
    } finally {
      setRedeemSubmitting(false)
    }
  }

  async function goCheckout(variantId) {
    setSubmitting(true)
    setBillingErr('')
    try {
      const { url } = await api.post('/payments/checkout', { variant_id: variantId })
      if (url) window.location.href = url
    } catch (e) {
      setBillingErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const [voucherPlan, setVoucherPlan] = useState('growth')
  const [voucherBusy, setVoucherBusy] = useState(false)
  const [voucherMsg, setVoucherMsg] = useState('')
  async function activateVoucher() {
    setVoucherBusy(true); setVoucherMsg('')
    try {
      const r = await api.post('/payments/activate-voucher', { plan: voucherPlan })
      setVoucherMsg((isEn ? 'Free month started on ' : 'Ücretsiz ay başladı: ') + voucherPlan + ', ' + new Date(r.free_until).toLocaleDateString('tr-TR'))
    } catch (err) { setVoucherMsg(err.message) } finally { setVoucherBusy(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwSubmitting(true)
    setPwMsg('')
    setPwErr('')
    try {
      await api.post('/auth/change-password', { current_password: pwCurrent, new_password: pwNew })
      setPwMsg(isEn ? 'Password updated' : 'Şifre güncellendi')
      setPwCurrent('')
      setPwNew('')
    } catch (err) {
      setPwErr(err.message || (isEn ? 'Update failed' : 'Güncelleme başarısız'))
    } finally {
      setPwSubmitting(false)
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
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl mb-6">
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
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl mb-6">
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

      {user?.pending_voucher && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-md p-4 mb-4">
          <div className="text-sm font-medium text-[#065F46] mb-2">
            {isEn ? 'You have 1 free month available' : '1 aylık ücretsiz kullanım hakkınız var'}
          </div>
          <div className="text-xs text-[#047857] mb-3">
            {isEn ? 'Choose a plan and start. Valid until ' : 'Paket seçip başlatın. Son kullanım: '}
            {new Date(user.pending_voucher.redeem_expires_at).toLocaleDateString('tr-TR')}
          </div>
          <div className="flex items-center gap-2">
            <select value={voucherPlan} onChange={e => setVoucherPlan(e.target.value)} className="border border-[#A7F3D0] rounded-md px-2 py-1.5 text-sm">
              <option value="pro">Pro</option>
              <option value="growth">Growth</option>
              <option value="team">Team</option>
            </select>
            <button onClick={activateVoucher} disabled={voucherBusy} className="text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-4 py-2">
              {voucherBusy ? (isEn ? 'Starting...' : 'Başlatılıyor...') : (isEn ? 'Start free month' : 'Ücretsiz ayı başlat')}
            </button>
          </div>
          {voucherMsg && <div className="text-xs text-[#065F46] mt-2">{voucherMsg}</div>}
        </div>
      )}

      {/* Plan & Faturalama */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-4">{isEn ? 'Plan & Billing' : 'Plan & Faturalama'}</div>

        <div className="text-sm text-[#111827] mb-4">
          {isEn ? 'Current plan: ' : 'Mevcut plan: '}
          <span className="font-medium">
            {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free'}
          </span>
        </div>

        {billingErr && (
          <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2 mb-4">{billingErr}</div>
        )}

        {/* Aylık / Yıllık toggle */}
        <div className="inline-flex border border-[#E5E7EB] rounded-md overflow-hidden mb-4">
          <button
            onClick={() => setBillingCycle('month')}
            className={`text-xs font-medium px-4 py-1.5 ${billingCycle === 'month' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#374151] hover:bg-[#F9FAFB]'}`}
          >
            {isEn ? 'Monthly' : 'Aylık'}
          </button>
          <button
            onClick={() => setBillingCycle('year')}
            className={`text-xs font-medium px-4 py-1.5 ${billingCycle === 'year' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#374151] hover:bg-[#F9FAFB]'}`}
          >
            {isEn ? 'Yearly' : 'Yıllık'}
          </button>
        </div>

        {/* Plan satırları */}
        <div className="flex flex-col gap-2 mb-6">
          {PLANS.map(plan => {
            const isCurrent = user?.plan === plan.key
            return (
              <div key={plan.key} className="flex items-center justify-between border border-[#E5E7EB] rounded-md px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[#111827]">{plan.name}</div>
                  <div className="text-xs text-[#6B7280]">{billingCycle === 'month' ? plan.priceMonth : plan.priceYear}</div>
                </div>
                {isCurrent ? (
                  <button disabled className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] bg-[#F9FAFB] rounded-md px-4 py-2 cursor-default">
                    {isEn ? 'Current plan' : 'Mevcut plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => goCheckout(VARIANTS[plan.key][billingCycle])}
                    disabled={submitting}
                    className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2"
                  >
                    {isEn ? 'Upgrade' : 'Yükselt'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Kredi Paketleri */}
        <div className="text-xs font-semibold text-[#374151] mb-3">{isEn ? 'Credit Packs (Pay as you go)' : 'Kredi Paketi (Kullandıkça Öde)'}</div>
        <div className="flex flex-wrap gap-2">
          {CREDIT_PACKS.map(pack => (
            <button
              key={pack.variant}
              onClick={() => goCheckout(pack.variant)}
              disabled={submitting}
              className="text-xs font-medium text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] disabled:opacity-50 rounded-md px-4 py-2"
            >
              {pack.credits} {isEn ? 'credits' : 'kredi'} · {pack.price}
            </button>
          ))}
        </div>
      </div>

      {/* Şifre Değiştir */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl mb-6">
        <div className="text-xs font-semibold text-[#374151] mb-4">{isEn ? 'Change Password' : 'Şifre Değiştir'}</div>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
          {pwErr && (
            <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2">{pwErr}</div>
          )}
          {pwMsg && (
            <div className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] rounded-md px-3 py-2">{pwMsg}</div>
          )}
          <div>
            <label className={labelCls}>{isEn ? 'Current Password' : 'Mevcut Şifre'}</label>
            <PasswordInput value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{isEn ? 'New Password' : 'Yeni Şifre'}</label>
            <PasswordInput value={pwNew} onChange={e => setPwNew(e.target.value)} />
          </div>
          <div>
            <button type="submit" disabled={pwSubmitting || !pwCurrent || !pwNew} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2">
              {pwSubmitting ? (isEn ? 'Updating...' : 'Güncelleniyor...') : (isEn ? 'Update' : 'Güncelle')}
            </button>
          </div>
        </form>
      </div>

      {/* Blog Ayarları */}
      <div className="bg-white border border-[#E5E7EB] rounded-md p-6 max-w-2xl mb-6">
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
