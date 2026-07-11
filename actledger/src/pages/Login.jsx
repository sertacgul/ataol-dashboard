import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'

export default function Login() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 animate-[fadeInUp_0.5s_ease-out]">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="AskDesk" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
          <h1 className="text-lg font-semibold text-[#111827] mb-1">{t('Giriş Yap')}</h1>
          <p className="text-sm text-[#6B7280] mb-6">{t('Hesabınıza giriş yapın')}</p>

          {error && (
            <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="ornek@firma.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">{t('Şifre')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
              {submitting ? t('Giriş yapılıyor...') : t('Giriş Yap')}
            </button>
          </form>
          <div className="mt-3 text-center">
            <Link to="/forgot-password" className="text-xs text-[#6B7280] hover:text-[#2563EB] transition-colors">
              {t('Şifremi Unuttum')}
            </Link>
          </div>
        </div>

        <p className="text-sm text-[#6B7280] text-center mt-4">
          {t('Hesabınız yok mu?')} <Link to="/register" className="text-[#2563EB] font-medium">{t('Kayıt Ol')}</Link>
        </p>
      </div>
    </div>
  )
}
