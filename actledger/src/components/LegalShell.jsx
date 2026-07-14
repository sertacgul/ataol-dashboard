import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

// Shared chrome for legal pages: header with home link + back button,
// a content card, and a footer with navigation.
export default function LegalShell({ title, updated, children }) {
  const { lang } = useT()
  const isEn = lang === 'en'
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[#6B7280] hover:text-[#2563EB] transition-colors"
          >
            ← {isEn ? 'Back' : 'Geri'}
          </button>
        </div>
      </header>

      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-[#E5E7EB] rounded-md p-8">
            <h1 className="text-2xl font-semibold text-[#111827] mb-2">{title}</h1>
            {updated && <p className="text-xs text-[#9CA3AF] mb-8">{updated}</p>}
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-[#9CA3AF]">© 2026 ATAOL AI Techs · askdesk.app</span>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-[#6B7280] hover:text-[#2563EB]">{isEn ? 'Home' : 'Ana Sayfa'}</Link>
            <Link to="/terms" className="text-[#6B7280] hover:text-[#2563EB]">{isEn ? 'Terms' : 'Kullanım Koşulları'}</Link>
            <Link to="/privacy" className="text-[#6B7280] hover:text-[#2563EB]">{isEn ? 'Privacy' : 'Gizlilik'}</Link>
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
