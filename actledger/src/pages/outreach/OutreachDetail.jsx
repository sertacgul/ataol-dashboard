import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'
import { useT } from '../../contexts/LanguageContext'

export default function OutreachDetail() {
  const { t } = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function copyEmail() {
    const text = `${t('Konu')}: ${email.subject || ''}\n\n${email.body || ''}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  useEffect(() => {
    api.get(`/outreach/${id}`)
      .then(data => setEmail(data.email))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(status) {
    setActionLoading(true)
    try {
      await api.put(`/outreach/${id}`, { status })
      setEmail(prev => ({ ...prev, status }))
    } finally {
      setActionLoading(false)
    }
  }

  function openInGmail() {
    const to = encodeURIComponent(email.contact_email || '')
    const su = encodeURIComponent(email.subject || '')
    const body = encodeURIComponent(email.body || '')
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`
    window.open(url, '_blank', 'noopener')
  }

  async function markAsSent() {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/outreach/${id}`, { status: 'sent' })
      setEmail(prev => ({ ...prev, status: 'sent', sent_at: new Date().toISOString() }))
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-[#9CA3AF] py-8 text-center">{t('Yükleniyor...')}</div>
  }

  if (!email) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-[#6B7280] mb-3">{t('Email bulunamadı.')}</div>
        <Link to="/app/outreach" className="text-xs text-[#2563EB] hover:underline">{t('Outreach listesine dön')}</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/app/outreach" className="text-xs text-[#6B7280] hover:text-[#111827]">Outreach</Link>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-semibold text-[#111827]">{email.subject || t('(konu yok)')}</span>
      </div>

      {error && (
        <div className="text-sm text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-[#111827]">{email.company_name || '-'}</span>
              <Badge status={email.status} />
            </div>
            {email.contact_name && (
              <div className="text-xs text-[#6B7280]">{email.contact_name}</div>
            )}
            <div className="text-xs text-[#9CA3AF] mt-0.5">
              {email.created_at ? new Date(email.created_at).toLocaleDateString('tr-TR') : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyEmail}
              className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5"
            >
              {copied ? t('Kopyalandı') : t('Kopyala')}
            </button>
            <button
              onClick={openInGmail}
              className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-md px-3 py-1.5"
            >
              {t('Gmail\'de Aç')}
            </button>
            {email.status === 'pending' && (
              <>
                <button
                  onClick={() => updateStatus('approved')}
                  disabled={actionLoading}
                  className="text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-3 py-1.5"
                >
                  {t('Onayla')}
                </button>
                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={actionLoading}
                  className="text-xs font-medium text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 rounded-md px-3 py-1.5"
                >
                  {t('Reddet')}
                </button>
              </>
            )}
            {email.status === 'approved' && (
              <button
                onClick={markAsSent}
                disabled={actionLoading}
                className="text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-3 py-1.5"
              >
                {actionLoading ? t('İşaretleniyor...') : t('Gönderildi olarak işaretle')}
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] pt-4">
          <div className="text-xs font-medium text-[#374151] mb-1">{t('Konu')}</div>
          <div className="text-sm text-[#111827] mb-4">{email.subject || '-'}</div>

          <div className="text-xs font-medium text-[#374151] mb-1">{t('İçerik')}</div>
          <div className="text-sm text-[#111827] whitespace-pre-wrap bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2">
            {email.body || '-'}
          </div>
        </div>

        {email.sent_at && (
          <div className="border-t border-[#E5E7EB] mt-4 pt-4 flex items-center gap-4">
            <div>
              <span className="text-xs text-[#9CA3AF]">{t('Gönderildi olarak işaretlendi')}: </span>
              <span className="text-xs text-[#111827]">
                {new Date(email.sent_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
