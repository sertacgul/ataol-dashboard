import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useT } from '../contexts/LanguageContext'
import PasswordInput from '../components/PasswordInput'

export default function ForgotPassword() {
  const { t, lang } = useT()
  const isEn = lang === 'en'
  const [step, setStep] = useState('request') // request -> verify
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleRequest(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setMessage(isEn
        ? 'If an account exists with this email, a reset code has been sent.'
        : 'Bu email ile kayıtlı bir hesap varsa, sıfırlama kodu gönderildi.')
      setStep('verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = await api.post('/auth/reset-password', { email, reset_code: resetCode, new_password: newPassword })
      setMessage(data.message)
      setStep('done')
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
          <h1 className="text-lg font-semibold text-[#111827] mb-1">{t('Şifremi Unuttum')}</h1>
          <p className="text-sm text-[#6B7280] mb-6">
            {isEn ? 'Enter your email to receive a reset code' : 'Sıfırlama kodu almak için emailinizi girin'}
          </p>

          {error && (
            <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-[#059669] bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
              {message}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">{t('Email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
                {submitting
                  ? (isEn ? 'Sending...' : 'Gönderiliyor...')
                  : (isEn ? 'Send Reset Code' : 'Sıfırlama Kodu Gönder')}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  {isEn ? 'Reset Code' : 'Sıfırlama Kodu'}
                </label>
                <input type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value.toUpperCase())} required
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent tracking-widest font-mono"
                  placeholder="XXXXXXXX" maxLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1">
                  {isEn ? 'New Password' : 'Yeni Şifre'}
                </label>
                <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
                {submitting
                  ? (isEn ? 'Updating...' : 'Güncelleniyor...')
                  : (isEn ? 'Reset Password' : 'Şifreyi Sıfırla')}
              </button>
            </form>
          )}

          {step === 'done' && (
            <Link to="/login"
              className="block text-center w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
              {t('Giriş Yap')}
            </Link>
          )}
        </div>

        <p className="text-sm text-[#6B7280] text-center mt-4">
          <Link to="/login" className="text-[#2563EB] font-medium">{t('Giriş Yap')}</Link>
        </p>
      </div>
    </div>
  )
}
