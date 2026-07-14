import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

// Shared chrome for legal pages: header with home link + back button,
// a content card, and a footer with navigation.
export default function LegalShell({ title, updated, children }) {
  const { lang } = useT()
  const isEn = lang === 'en'
  const navigate = useNavigate()

  // Go back in history when there is somewhere to go back to; otherwise (page
  // opened directly, via bookmark, or in a new tab) fall back to the home page.
  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #f5f9ff 40%, #F9FAFB 100%)' }}>
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #7e14ff 0%, #47bfff 100%)' }} />
      <header className="bg-white/70 backdrop-blur border-b border-[#EAE4F5]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </Link>
          <button
            onClick={goBack}
            className="text-sm text-[#6B7280] hover:text-[#7C3AED] transition-colors"
          >
            ← {isEn ? 'Back' : 'Geri'}
          </button>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-[#EAE4F5] rounded-xl shadow-[0_1px_3px_rgba(124,58,237,0.06),0_8px_24px_rgba(124,58,237,0.06)] p-8 sm:p-10">
            <h1 className="text-2xl font-bold text-[#111827] mb-2">{title}</h1>
            {updated && <p className="text-xs text-[#9CA3AF] mb-8">{updated}</p>}
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#EAE4F5] bg-white/70 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-[#9CA3AF]">© 2026 ATAOL AI Techs · askdesk.app</span>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-[#6B7280] hover:text-[#7C3AED]">{isEn ? 'Home' : 'Ana Sayfa'}</Link>
            <Link to="/terms" className="text-[#6B7280] hover:text-[#7C3AED]">{isEn ? 'Terms' : 'Kullanım Koşulları'}</Link>
            <Link to="/privacy" className="text-[#6B7280] hover:text-[#7C3AED]">{isEn ? 'Privacy' : 'Gizlilik'}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function LegalSection({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-[#111827] mb-2">{title}</h2>
      <div className="text-sm text-[#4B5563] leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
