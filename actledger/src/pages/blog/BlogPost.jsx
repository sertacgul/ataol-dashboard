import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPost } from '../../content/blog'
import { setSeo } from '../../lib/seo'

function Block({ block }) {
  const [type, content] = block
  if (type === 'h2') return <h2 className="text-xl font-bold text-[#111827] mt-8 mb-3 leading-snug">{content}</h2>
  if (type === 'h3') return <h3 className="text-base font-semibold text-[#111827] mt-6 mb-2">{content}</h3>
  if (type === 'ul') return (
    <ul className="list-disc pl-5 my-3 space-y-1.5 text-[#374151]">
      {content.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}
    </ul>
  )
  if (type === 'template') return (
    <div className="my-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-4">
      <div className="text-xs font-medium text-[#6B7280] mb-2">Konu: {content.subject}</div>
      <div className="text-sm text-[#374151] whitespace-pre-line leading-relaxed">{content.body}</div>
    </div>
  )
  if (type === 'table') return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border border-[#E5E7EB] rounded-md">
        <thead>
          <tr className="bg-[#F9FAFB]">
            {content.head.map((h, i) => <th key={i} className="text-left font-medium text-[#374151] px-3 py-2 border-b border-[#E5E7EB]">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((r, i) => (
            <tr key={i} className="border-b border-[#E5E7EB] last:border-0">
              {r.map((cell, j) => <td key={j} className="px-3 py-2 text-[#374151]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  return <p className="my-3 leading-relaxed text-[#374151]">{content}</p>
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  useEffect(() => {
    if (!post) return
    const url = `https://askdesk.app/blog/${post.slug}/`
    const articleLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.metaDescription,
      author: { '@type': 'Organization', name: post.author },
      publisher: {
        '@type': 'Organization',
        name: 'ATAOL AI Techs',
        logo: { '@type': 'ImageObject', url: 'https://askdesk.app/assets/favicon-512.png' },
      },
      mainEntityOfPage: url,
      inLanguage: 'tr-TR',
    }
    const faqLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (post.faq || []).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    }
    setSeo({
      title: post.metaTitle,
      description: post.metaDescription,
      canonical: url,
      jsonLd: [articleLd, faqLd],
    })
  }, [post])

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4">
        <div className="text-sm text-[#6B7280] mb-3">Yazı bulunamadı.</div>
        <Link to="/blog" className="text-sm text-[#2563EB] hover:underline">Blog'a dön</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </Link>
          <Link to="/blog" className="text-sm text-[#6B7280] hover:text-[#2563EB]">← Blog</Link>
        </div>
      </header>

      <main className="flex-1 py-12 px-4">
        <article className="max-w-2xl mx-auto">
          <div className="text-xs text-[#9CA3AF] mb-3">{post.author}</div>
          <h1 className="text-3xl font-bold text-[#111827] mb-6 leading-tight tracking-tight">{post.title}</h1>

          <div>
            {post.body.map((block, i) => <Block key={i} block={block} />)}
          </div>

          {post.faq?.length > 0 && (
            <section className="mt-10 pt-8 border-t border-[#E5E7EB]">
              <h2 className="text-xl font-bold text-[#111827] mb-4">Sık Sorulan Sorular</h2>
              <div className="space-y-4">
                {post.faq.map((f, i) => (
                  <div key={i}>
                    <h3 className="text-base font-semibold text-[#111827] mb-1">{f.q}</h3>
                    <p className="text-[#374151] leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {post.related?.length > 0 && (
            <section className="mt-10 pt-8 border-t border-[#E5E7EB]">
              <h2 className="text-xl font-bold text-[#111827] mb-4">İlgili Rehberler</h2>
              <ul className="space-y-2">
                {post.related.map(slug => getPost(slug)).filter(Boolean).map(rp => (
                  <li key={rp.slug}>
                    <Link to={`/blog/${rp.slug}`} className="text-sm font-medium text-[#2563EB] hover:underline">{rp.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 bg-white sm:rounded-xl sm:border sm:border-[#E5E7EB] p-6">
            <div className="text-sm font-semibold text-[#111827] mb-1">Bunu elle yapmak zorunda değilsin</div>
            <p className="text-sm text-[#6B7280] mb-4">AskDesk doğru kişiyi ve doğrulanmış e-postayı bulur, o firmaya özel e-postayı yazar. Sen kendi gelen kutundan gönderirsin.</p>
            <Link to="/register" className="inline-block text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2">
              Ücretsiz dene
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between text-xs text-[#9CA3AF]">
          <span>© 2026 ATAOL AI Techs</span>
          <Link to="/blog" className="hover:text-[#2563EB]">Tüm yazılar</Link>
        </div>
      </footer>
    </div>
  )
}
