import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'

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
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '' })
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
    setSubmitting(true)
    try {
      await register(form.email, form.password, form.name, form.company_name)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="AskDesk" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
          <h1 className="text-lg font-semibold text-[#111827] mb-1">{t('Kayıt Ol')}</h1>
          <p className="text-sm text-[#6B7280] mb-1">{t('Yeni hesap oluşturun')}</p>
          <p className="text-xs text-[#9CA3AF] mb-6">
            {isEn
              ? '7-day free trial. Corporate email required. Payment will be charged after trial period.'
              : '7 gün ücretsiz deneme. Kurumsal email gerekli. Deneme süresi sonunda ödeme alınır.'}
          </p>

          {error && (
            <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Ad Soyad')}</label>
              <input type="text" value={form.name} onChange={update('name')} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Firma Adı')}</label>
              <input type="text" value={form.company_name} onChange={update('company_name')}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder={t('İsteğe bağlı')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                {isEn ? 'Corporate Email' : 'Kurumsal Email'}
              </label>
              <input type="email" value={form.email} onChange={update('email')} onBlur={validateEmail} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="ad@firmaniz.com" />
              <p className="text-xs text-[#9CA3AF] mt-1">
                {isEn ? 'Gmail, Hotmail, Yahoo etc. are not accepted' : 'Gmail, Hotmail, Yahoo vb. kabul edilmez'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Şifre')}</label>
              <input type="password" value={form.password} onChange={update('password')} required minLength={6}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
              {submitting ? t('Kayıt yapılıyor...') : t('Kayıt Ol')}
            </button>
          </form>
        </div>

        <p className="text-sm text-[#6B7280] text-center mt-4">
          {t('Zaten hesabınız var mı?')} <Link to="/login" className="text-[#2563EB] font-medium">{t('Giriş Yap')}</Link>
        </p>
      </div>
    </div>
  )
}
