import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { setSeo } from '../lib/seo'

const STEPS = [
  { n: '1', title: 'Kriterinizi söyleyin', text: 'Hedef sektör, bölge ve ulaşmak istediğiniz karar verici unvanlarını iletin.' },
  { n: '2', title: 'Biz üretip doğrularız', text: 'Doğru firmaları ve karar vericileri buluruz, iş e-postalarını doğrularız.' },
  { n: '3', title: '48 saatte teslim', text: 'Ad, unvan, firma, doğrulanmış e-posta ve kaynak sütunlu hazır CSV listeniz.' },
]

const TIERS = [
  { credits: 50, price: '$79' },
  { credits: 100, price: '$129', popular: true },
  { credits: 250, price: '$279' },
]

const empty = { name: '', email: '', company: '', sector: '', region: '', titles: '', quantity: '100', notes: '', website: '' }

export default function LeadService() {
  const [form, setForm] = useState(empty)
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [err, setErr] = useState('')

  useEffect(() => {
    setSeo({
      title: 'Sizin İçin Lead Listesi: 48 Saatte Doğrulanmış B2B Leadler',
      description: 'Ajanslar ve danışmanlar için hazır hizmet: sektör ve bölge söyleyin, 48 saatte doğrulanmış karar verici lead listesini CSV olarak teslim edelim.',
      canonical: 'https://askdesk.app/lead-listesi',
    })
  }, [])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setErr('Ad ve e-posta gerekli.'); return }
    setStatus('sending'); setErr('')
    try {
      await api.post('/lead-requests', form)
      setStatus('done')
    } catch (e) {
      setErr(e.message || 'Gönderilemedi, tekrar deneyin.')
      setStatus('error')
    }
  }

  const inputCls = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[#111827] focus:outline-none focus:border-[#2563EB] transition-colors'

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
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB] mb-2">Sizin İçin Lead Listesi</p>
          <h1 className="text-3xl font-bold text-[#111827] mb-3 tracking-tight leading-tight">
            Doğrulanmış karar verici listesi, 48 saatte hazır
          </h1>
          <p className="text-[#6B7280] mb-8 leading-relaxed max-w-2xl">
            Ajanslar ve danışmanlar için: lead araştırmasıyla vakit kaybetmeyin. Bize hedef sektör ve bölgeyi söyleyin,
            doğru karar vericileri bulup iş e-postalarını doğrulayalım ve size hazır bir CSV liste teslim edelim.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-10">
            {STEPS.map(s => (
              <div key={s.n} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] text-sm font-semibold flex items-center justify-center mb-2">{s.n}</div>
                <div className="text-sm font-semibold text-[#111827] mb-1">{s.title}</div>
                <div className="text-xs text-[#6B7280] leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-10">
            {TIERS.map(t => (
              <div key={t.credits} className={`rounded-xl p-4 text-center border ${t.popular ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] bg-white'}`}>
                {t.popular && <div className="text-[10px] font-semibold uppercase tracking-wide text-[#2563EB] mb-1">En çok tercih edilen</div>}
                <div className="text-2xl font-bold text-[#111827]">{t.credits}</div>
                <div className="text-xs text-[#6B7280] mb-2">doğrulanmış lead</div>
                <div className="text-lg font-semibold text-[#2563EB]">{t.price}</div>
              </div>
            ))}
          </div>

          {status === 'done' ? (
            <div className="bg-white border border-[#BFDBFE] rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-lg font-semibold text-[#111827] mb-1">Talebiniz alındı</h2>
              <p className="text-sm text-[#6B7280]">En kısa sürede kriterlerinizi netleştirmek ve teklifi paylaşmak için size dönüş yapacağız.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#111827]">Talep gönderin</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Ad Soyad *</label>
                  <input value={form.name} onChange={e => setField('name', e.target.value)} className={inputCls} placeholder="Adınız" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">E-posta *</label>
                  <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} className={inputCls} placeholder="siz@ajansiniz.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Firma / Ajans</label>
                  <input value={form.company} onChange={e => setField('company', e.target.value)} className={inputCls} placeholder="Ajansınızın adı" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Adet</label>
                  <select value={form.quantity} onChange={e => setField('quantity', e.target.value)} className={inputCls}>
                    <option value="50">50 lead</option>
                    <option value="100">100 lead</option>
                    <option value="250">250 lead</option>
                    <option value="Diğer">Daha fazlası</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Hedef sektör</label>
                  <input value={form.sector} onChange={e => setField('sector', e.target.value)} className={inputCls} placeholder="Örn: e-ticaret, imalat" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Bölge / lokasyon</label>
                  <input value={form.region} onChange={e => setField('region', e.target.value)} className={inputCls} placeholder="Örn: İstanbul, Türkiye" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Hedef unvanlar</label>
                <input value={form.titles} onChange={e => setField('titles', e.target.value)} className={inputCls} placeholder="Örn: Pazarlama Müdürü, Kurucu, Satış Direktörü" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Not (opsiyonel)</label>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3} className={inputCls} placeholder="Eklemek istedikleriniz" />
              </div>
              {/* Honeypot: hidden from users, catches bots */}
              <input type="text" value={form.website} onChange={e => setField('website', e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

              {err && <p className="text-xs text-[#DC2626]">{err}</p>}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                {status === 'sending' ? 'Gönderiliyor...' : 'Talebi Gönder'}
              </button>
              <p className="text-[11px] text-[#9CA3AF] text-center">Ödeme yok. Kriterlerinizi netleştirip teklifi paylaşırız.</p>
            </form>
          )}
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
