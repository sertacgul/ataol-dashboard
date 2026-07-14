import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../components/AuthLayout'

const FREE_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.com.tr', 'yandex.com', 'yandex.com.tr',
  'mail.com', 'protonmail.com', 'proton.me', 'icloud.com', 'me.com',
  'aol.com', 'zoho.com', 'gmx.com', 'gmx.de', 'mail.ru',
  'inbox.com', 'fastmail.com', 'tutanota.com', 'tuta.com',
  'msn.com', 'windowslive.com', 'mynet.com', 'superonline.com',
]

export default function Register() {
  const { t, lang } = useT()
  const isEn = lang === 'en'
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '', discount_code: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      if (field === 'email') setError('')
    }
  }

  function validateEmail() {
    const domain = form.email.split('@')[1]?.toLowerCase()
    if (domain && FREE_DOMAINS.includes(domain)) {
      setError(isEn
        ? 'Please use your corporate email address. Personal email addresses (Gmail, Hotmail, Yahoo, etc.) are not accepted.'
        : 'Lütfen kurumsal email adresinizi kullanın. Gmail, Hotmail, Yahoo gibi kişisel email adresleri kabul edilmemektedir.')
      return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validateEmail()) return
    if (!agreed) {
      setError(isEn ? 'Please accept the Terms of Use to continue.' : 'Devam etmek için Kullanım Koşulları\'nı kabul edin.')
      return
    }
    setSubmitting(true)
    try {
      await register(form.email, form.password, form.name, form.company_name, form.discount_code, agreed)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent'

  return (
    <AuthLayout
      title={t('Kayıt Ol')}
      subtitle={isEn ? '7-day free trial. Corporate email required. No credit card.' : '7 gün ücretsiz deneme. Kurumsal email gerekli. Kredi kartı gerekmez.'}
      altText={t('Zaten hesabınız var mı?')}
      altLinkText={t('Giriş Yap')}
      altLinkTo="/login"
      showLegalLinks={false}
    >
      {error && (
        <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">{t('Ad Soyad')}</label>
          <input type="text" value={form.name} onChange={update('name')} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">{t('Firma Adı')}</label>
          <input type="text" value={form.company_name} onChange={update('company_name')} className={inputCls} placeholder={t('İsteğe bağlı')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">{isEn ? 'Corporate Email' : 'Kurumsal Email'}</label>
          <input type="email" value={form.email} onChange={update('email')} onBlur={validateEmail} required className={inputCls} placeholder="ad@firmaniz.com" />
          <p className="text-xs text-[#9CA3AF] mt-1">
            {isEn ? 'Gmail, Hotmail, Yahoo etc. are not accepted' : 'Gmail, Hotmail, Yahoo vb. kabul edilmez'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">{t('Şifre')}</label>
          <PasswordInput value={form.password} onChange={update('password')} required minLength={6} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1">{isEn ? 'Discount Code' : 'İndirim Kodu'}</label>
          <input type="text" value={form.discount_code} onChange={update('discount_code')} className={`${inputCls} uppercase`} placeholder={isEn ? 'Optional' : 'İsteğe bağlı'} />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <label htmlFor="terms" className="text-xs text-[#6B7280]">
            {isEn ? (
              <>I have read and agree to the <Link to="/terms" target="_blank" className="text-[#2563EB] font-medium">Terms of Use</Link> and <Link to="/privacy" target="_blank" className="text-[#2563EB] font-medium">Privacy Policy</Link>.</>
            ) : (
              <><Link to="/terms" target="_blank" className="text-[#2563EB] font-medium">Kullanım Koşulları</Link> ve <Link to="/privacy" target="_blank" className="text-[#2563EB] font-medium">Gizlilik Politikası</Link>'nı okudum ve kabul ediyorum.</>
            )}
          </label>
        </div>

        <button type="submit" disabled={submitting || !agreed}
          className="w-full py-2.5 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
          style={{ background: '#2563EB' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}>
          {submitting ? t('Kayıt yapılıyor...') : t('Kayıt Ol')}
        </button>
      </form>
    </AuthLayout>
  )
}
