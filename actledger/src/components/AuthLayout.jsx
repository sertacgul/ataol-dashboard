import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

// Premium split layout for auth pages: a brand-gradient panel (logo colors)
// on the left, a clean form on the right. Collapses to a single column on
// mobile with a compact logo header.
export default function AuthLayout({ title, subtitle, children, altText, altLinkText, altLinkTo }) {
  const { t, lang } = useT()
  const isEn = lang === 'en'

  const bullets = isEn
    ? ['Find the right company and decision-maker', 'Let AI write a personalized email', 'Send it from your own inbox']
    : ['Doğru şirketi ve karar vericiyi bul', 'AI kişiselleştirilmiş e-postayı yazsın', 'Kendi gelen kutundan gönder']

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white"
        style={{ background: 'linear-gradient(150deg, #4c1d95 0%, #7e14ff 46%, #47bfff 100%)' }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(48px)' }} />
          <div className="absolute -bottom-24 -right-16 w-[26rem] h-[26rem] rounded-full" style={{ background: 'rgba(71,191,255,0.35)', filter: 'blur(64px)' }} />
        </div>

        <Link to="/" className="relative inline-flex items-center gap-2.5 w-fit">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/95 shadow-sm">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-6 h-6" />
          </span>
          <span className="text-lg font-semibold tracking-tight">AskDesk</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-[1.2] mb-7 max-w-sm">
            {isEn ? 'Turn a company name into a ready-to-send email.' : 'Bir firma adını, göndermeye hazır bir e-postaya dönüştür.'}
          </h2>
          <ul className="space-y-3.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/90">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/70">© 2026 ATAOL AI Techs · askdesk.app</div>
      </div>

      {/* Form side */}
      <div className="flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-6 h-16 lg:justify-end">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </Link>
          <Link to="/" className="text-sm text-[#6B7280] hover:text-[#7C3AED] transition-colors">
            ← {t('Ana Sayfa')}
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-[#111827] mb-1">{title}</h1>
            {subtitle && <p className="text-sm text-[#6B7280] mb-6">{subtitle}</p>}

            {children}

            {altText && (
              <p className="text-sm text-[#6B7280] text-center mt-6">
                {altText} <Link to={altLinkTo} className="text-[#7C3AED] font-medium hover:underline">{altLinkText}</Link>
              </p>
            )}

            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-[#9CA3AF]">
              <Link to="/terms" className="hover:text-[#7C3AED]">{t('Kullanım Koşulları')}</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-[#7C3AED]">{t('Gizlilik')}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
