import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCredits } from '../contexts/CreditsContext'
import { useT } from '../contexts/LanguageContext'
import { api } from '../lib/api'

// One-time outreach top-up packs. Mirrors CREDIT_PACKS in Settings.jsx; these
// variant ids are the Lemon Squeezy one-time products handled by the billing
// webhook (kind: 'onetime', pool: 'outreach').
const PACKS = [
  { variant: '1904911', credits: 40, price: '$10' },
  { variant: '1904915', credits: 200, price: '$35', popular: true },
  { variant: '1904921', credits: 1000, price: '$120' },
]

// Opens automatically when any API call returns 402 (out of credits). Catches
// the peak-intent moment and offers a one-click top-up or plan upgrade instead
// of dead-ending in an error. Wired via CreditsContext + api.onOutOfCredits.
export default function CreditWall() {
  const { creditWall, closeCreditWall } = useCredits()
  const { t } = useT()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!creditWall) return null

  const isContent = creditWall.credit_type === 'content'

  async function buy(variantId) {
    setBusy(true)
    setErr('')
    try {
      const { url } = await api.post('/payments/checkout', { variant_id: variantId })
      if (url) window.location.href = url
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  function goUpgrade() {
    closeCreditWall()
    navigate('/app/settings')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCreditWall}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="border-b border-[#E5E7EB] px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#111827]">{t('Krediniz doldu')}</h3>
          <button onClick={closeCreditWall} className="text-[#9CA3AF] hover:text-[#111827]" aria-label={t('Kapat')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5">
          {isContent ? (
            <>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                {t('İçerik krediniz doldu. Daha fazla içerik üretmek için planınızı yükseltin.')}
              </p>
              <button
                onClick={goUpgrade}
                className="w-full py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
              >
                {t('Planı Yükselt')}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                {t('İşleme devam etmek için kredi ekleyin. Anında hesabınıza tanımlanır.')}
              </p>
              <div className="space-y-2">
                {PACKS.map(p => (
                  <button
                    key={p.variant}
                    onClick={() => buy(p.variant)}
                    disabled={busy}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors disabled:opacity-60 ${
                      p.popular ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] hover:border-[#BFDBFE]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111827]">{p.credits} {t('kredi')}</span>
                      {p.popular && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2563EB] bg-white border border-[#BFDBFE] rounded px-1.5 py-0.5">{t('Popüler')}</span>}
                    </span>
                    <span className="text-sm font-semibold text-[#2563EB]">{p.price}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={goUpgrade}
                className="w-full mt-3 text-xs text-[#6B7280] hover:text-[#2563EB] transition-colors"
              >
                {t('veya aylık planı yükselt')}
              </button>
            </>
          )}

          {err && <p className="mt-3 text-xs text-[#DC2626]">{err}</p>}
        </div>
      </div>
    </div>
  )
}
