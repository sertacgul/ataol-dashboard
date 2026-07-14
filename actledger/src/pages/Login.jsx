import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'
import PasswordInput from '../components/PasswordInput'
import AuthLayout from '../components/AuthLayout'

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
    <AuthLayout
      title={t('Giriş Yap')}
      subtitle={t('Hesabınıza giriş yapın')}
      altText={t('Hesabınız yok mu?')}
      altLinkText={t('Kayıt Ol')}
      altLinkTo="/register"
    >
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
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={submitting}
          className="w-full py-2.5 text-sm font-semibold text-white rounded-md disabled:opacity-50 transition-colors"
          style={{ background: '#2563EB' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1D4ED8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563EB')}>
          {submitting ? t('Giriş yapılıyor...') : t('Giriş Yap')}
        </button>
      </form>
      <div className="mt-3 text-center">
        <Link to="/forgot-password" className="text-xs text-[#6B7280] hover:text-[#2563EB] transition-colors">
          {t('Şifremi Unuttum')}
        </Link>
      </div>
    </AuthLayout>
  )
}
