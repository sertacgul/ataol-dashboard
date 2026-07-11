import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'

export default function Register() {
  const { t } = useT()
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
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
          <p className="text-sm text-[#6B7280] mb-6">{t('Yeni hesap oluşturun')}</p>

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
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Email')}</label>
              <input type="email" value={form.email} onChange={update('email')} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
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
