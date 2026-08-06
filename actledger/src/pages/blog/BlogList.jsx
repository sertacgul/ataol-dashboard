import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { POSTS } from '../../content/blog'
import { setSeo } from '../../lib/seo'

export default function BlogList() {
  useEffect(() => {
    setSeo({
      title: 'AskDesk Blog: B2B Büyüme, Outbound ve Lead Bulma Rehberleri',
      description: 'Startup ve KOBI kurucuları için B2B e-posta bulma, soğuk outreach, lead generation ve büyüme rehberleri. ATAOL AI Techs tarafından.',
      canonical: 'https://askdesk.app/blog/',
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </Link>
          <Link to="/" className="text-sm text-[#6B7280] hover:text-[#2563EB]">Ana Sayfa</Link>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-2">AskDesk Blog</p>
          <h1 className="text-3xl font-bold text-[#111827] mb-3 tracking-tight">Büyüme, outbound ve lead bulma rehberleri</h1>
          <p className="text-[#6B7280] mb-10 leading-relaxed max-w-2xl">
            Satış ekibi olmayan kurucular için: doğru kişiyi bulma, iş e-postasına ulaşma ve kişiselleştirilmiş outreach üzerine uygulamalı yazılar.
          </p>

          <div className="space-y-4">
            {POSTS.map(post => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block bg-white border border-[#E5E7EB] rounded-xl p-6 hover:border-[#BFDBFE] hover:shadow-[0_8px_24px_rgba(37,99,235,0.06)] transition-all"
              >
                <h2 className="text-lg font-semibold text-[#111827] mb-2 leading-snug">{post.title}</h2>
                <p className="text-sm text-[#6B7280] leading-relaxed">{post.excerpt}</p>
                <span className="inline-block mt-3 text-sm font-medium text-[#2563EB]">Devamını oku</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5 text-xs text-[#9CA3AF] text-center">
          © 2026 ATAOL AI Techs · askdesk.app
        </div>
      </footer>
    </div>
  )
}
