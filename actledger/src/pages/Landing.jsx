import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

const FEATURES = [
  {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    titleTr: 'AI Destekli Outreach',
    titleEn: 'AI-Powered Outreach',
    descTr: 'OperIQ yapay zeka ile kisisellestirilmis email kampanyalari olusturun. Email acilma takibi, otomatik sablon uretimi ve firma bazli icerik optimizasyonu.',
    descEn: 'Create personalized email campaigns with OperIQ AI. Email open tracking, automatic template generation, and company-based content optimization.',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    titleTr: 'Lead Generation',
    titleEn: 'Lead Generation',
    descTr: 'Google Maps entegrasyonu ile hedef sektorunuzdeki firmalari bulun, yorumlarini analiz edin ve tek tikla lead listesine ekleyin. Sentiment analizi ile kaliteli leadleri onden secin.',
    descEn: 'Find companies in your target sector with Google Maps integration, analyze reviews, and add to your lead list in one click. Pre-select quality leads with sentiment analysis.',
  },
  {
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
    titleTr: 'CRM Pipeline',
    titleEn: 'CRM Pipeline',
    descTr: 'Surukle-birak kanban gorunumu ile satis surecini goruntulelestirin. Leadlerinizi kesfedildi, iletisime gecildi, teklif verildi ve kazanildi asamalari arasinda yonetin.',
    descEn: 'Visualize your sales process with drag-and-drop kanban view. Manage leads across discovered, contacted, offered, and won stages.',
  },
  {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    titleTr: 'SEO Icerik Uretimi',
    titleEn: 'SEO Content Creation',
    descTr: '6 adimli SEO makale yazma sureci: trend arastirmasi, konu secimi, Turkce icerik, Ingilizce ceviri, SEO skoru analizi ve dogrudan WordPress yayini.',
    descEn: '6-step SEO article workflow: trend research, topic selection, Turkish content, English translation, SEO score analysis, and direct WordPress publishing.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7',
    titleTr: 'Email Bulucu',
    titleEn: 'Email Finder',
    descTr: 'Firma web sitesini tarayarak gercek email adreslerini bulun. MX kayit dogrulama, web sitesinden veri cekme ve kalip bazli email tahmini ile iletisim bilgilerine ulasin.',
    descEn: 'Find real email addresses by scanning company websites. Reach contact info with MX record verification, web scraping, and pattern-based email estimation.',
  },
  {
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    titleTr: 'Sosyal Medya Yonetimi',
    titleEn: 'Social Media Management',
    descTr: 'LinkedIn, Twitter/X, Instagram ve Facebook icin platforma ozel icerikler uretin. Karakter siniri kontrolu, hashtag onerisi ve AI destekli post olusturma.',
    descEn: 'Create platform-specific content for LinkedIn, Twitter/X, Instagram and Facebook. Character limit control, hashtag suggestions, and AI-powered post creation.',
  },
  {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    titleTr: 'Analytics Dashboard',
    titleEn: 'Analytics Dashboard',
    descTr: 'Email gonderim trendi, sosyal medya dagilimi, pipeline asamalari ve icerik uretim istatistikleri. Tum verilerinizi tek panelde izleyin.',
    descEn: 'Email sending trends, social media distribution, pipeline stages, and content production statistics. Monitor all your data in one panel.',
  },
  {
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    titleTr: 'Finansal Simulasyon',
    titleEn: 'Financial Simulation',
    descTr: '3 senaryo (iyimser, gercekci, kotumser) ile 12 aylik gelir/gider projeksiyonu. Birim ekonomi analizi, kara gecis noktasi ve nakit akis grafikleri.',
    descEn: '12-month revenue/expense projection with 3 scenarios (optimistic, realistic, pessimistic). Unit economics analysis, break-even point, and cash flow charts.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    titleTr: 'Rakip Analizi',
    titleEn: 'Competitor Analysis',
    descTr: 'Rakip firmalarin web sitelerini analiz edin. Guclu yonler, zayif yonler ve firsatlar raporu ile stratejik konumlanmanizi belirleyin.',
    descEn: 'Analyze competitor websites. Determine your strategic positioning with strengths, weaknesses, and opportunities reports.',
  },
]

const STATS = [
  { valueTr: '11+', valueEn: '11+', labelTr: 'Entegre Modul', labelEn: 'Integrated Modules' },
  { valueTr: '4', valueEn: '4', labelTr: 'Sosyal Medya Platformu', labelEn: 'Social Media Platforms' },
  { valueTr: '3', valueEn: '3', labelTr: 'Senaryo Simülasyonu', labelEn: 'Scenario Simulations' },
  { valueTr: '6', valueEn: '6', labelTr: 'Adimli SEO Sureci', labelEn: 'Step SEO Workflow' },
]

const STEPS = [
  {
    numTr: '1', numEn: '1',
    titleTr: 'Kayit Olun', titleEn: 'Sign Up',
    descTr: 'Ucretsiz hesap olusturun ve firma profilinizi doldurun. OperIQ web sitenizi analiz ederek profili otomatik olusturur.',
    descEn: 'Create a free account and fill your company profile. OperIQ auto-generates your profile by analyzing your website.',
  },
  {
    numTr: '2', numEn: '2',
    titleTr: 'Leadlerinizi Bulun', titleEn: 'Find Your Leads',
    descTr: 'Google Maps, email bulucu veya manuel giris ile potansiyel musterilerinizi sisteme ekleyin.',
    descEn: 'Add your potential customers via Google Maps, email finder, or manual entry.',
  },
  {
    numTr: '3', numEn: '3',
    titleTr: 'Kampanya Olusturun', titleEn: 'Create Campaigns',
    descTr: 'OperIQ ile kisisellestirilmis email, SEO makale, sosyal medya icerigi ve newsletter uretin.',
    descEn: 'Create personalized emails, SEO articles, social media content, and newsletters with OperIQ.',
  },
  {
    numTr: '4', numEn: '4',
    titleTr: 'Buyumeyi Takip Edin', titleEn: 'Track Growth',
    descTr: 'Analytics, pipeline ve finansal simulasyon ile performansinizi olcun ve stratejinizi optimize edin.',
    descEn: 'Measure performance and optimize your strategy with analytics, pipeline, and financial simulation.',
  },
]

export default function Landing() {
  const { t, lang } = useT()
  const isEn = lang === 'en'

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* Navbar */}
      <nav className="border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-base font-bold text-[#111827]">AskDesk</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
            {t('Giriş Yap')}
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2 transition-colors"
          >
            {t('Ücretsiz Başla')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 animate-[fadeInUp_0.6s_ease-out]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block text-xs font-medium text-[#2563EB] bg-[#EFF6FF] rounded-full px-4 py-1.5 mb-6">
            Powered by ATAOL AI Techs
          </div>
          <h1 className="text-4xl font-bold text-[#111827] mb-5 leading-tight">
            {isEn
              ? 'The All-in-One Growth Platform for Startups'
              : "Startup'lar icin Hepsi Bir Arada Buyume Platformu"}
          </h1>
          <p className="text-base text-[#6B7280] mb-8 max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Find potential customers, create personalized outreach campaigns, manage leads in a CRM pipeline, produce SEO content, and make data-driven strategic decisions. All powered by OperIQ AI.'
              : 'Potansiyel musterilerinizi bulun, kisisellestirilmis outreach kampanyalari olusturun, leadlerinizi CRM pipeline ile yonetin, SEO icerik uretin ve veriye dayali stratejik kararlar alin. Tumu OperIQ AI destekli.'}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-6 py-2.5 transition-colors shadow-sm"
            >
              {t('Ücretsiz Başla')}
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-[#374151] border border-[#D1D5DB] rounded-md px-6 py-2.5 hover:bg-[#F9FAFB] transition-colors"
            >
              {t('Giriş Yap')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-[#2563EB]">{isEn ? s.valueEn : s.valueTr}</div>
              <div className="text-sm text-[#6B7280] mt-1">{isEn ? s.labelEn : s.labelTr}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-[#F9FAFB]" id="features">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] mb-3">
              {isEn ? 'Everything You Need to Grow' : 'Buyumeniz Icin Ihtiyaciniz Olan Her Sey'}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-xl mx-auto">
              {isEn
                ? 'From lead discovery to content creation, from pipeline management to competitive analysis. One platform, all tools.'
                : 'Lead kesfinden icerik uretimine, pipeline yonetiminden rakip analizine kadar. Tek platform, tum araclar.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <article key={i} className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mb-2">{isEn ? f.titleEn : f.titleTr}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{isEn ? f.descEn : f.descTr}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16" id="how-it-works">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] mb-3">
              {isEn ? 'How It Works' : 'Nasil Calisir?'}
            </h2>
            <p className="text-sm text-[#6B7280]">
              {isEn ? '4 simple steps to accelerate your growth' : '4 basit adimda buyumenizi hizlandirin'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 bg-[#2563EB] text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {s.numTr}
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mb-2">{isEn ? s.titleEn : s.titleTr}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{isEn ? s.descEn : s.descTr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="px-6 py-16 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#111827] mb-3">
            {isEn ? 'Powered by OperIQ AI' : 'OperIQ AI ile Guclendirilmis'}
          </h2>
          <p className="text-sm text-[#6B7280] max-w-2xl mx-auto mb-8 leading-relaxed">
            {isEn
              ? 'OperIQ, ATAOL AI Techs\' native AI engine, is integrated across all modules. From smart company profile creation to personalized email drafting, from SEO analysis to competitor research, AI accelerates every step of your workflow.'
              : 'ATAOL AI Techs\'in yerli yapay zeka motoru OperIQ, tum modullere entegre edilmistir. Akilli firma profili olusturmadan kisisellestirilmis email taslagina, SEO analizinden rakip arastirmasina kadar her adimda AI is akisinizi hizlandirir.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Smart Profiling' : 'Akilli Profil Olusturma'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'Enter your website URL, OperIQ analyzes your site and auto-fills your company profile.' : 'Web site URL\'nizi girin, OperIQ sitenizi analiz edip firma profilinizi otomatik doldursun.'}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Content Generation' : 'Icerik Uretimi'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'SEO articles, social media posts, newsletters, email templates. All content is generated specific to your brand.' : 'SEO makale, sosyal medya postu, newsletter, email sablonu. Tum icerikler markaniza ozel uretilir.'}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Strategic Analysis' : 'Stratejik Analiz'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'Competitor SWOT analysis, BMC recommendations, financial projections. Make data-driven decisions.' : 'Rakip SWOT analizi, BMC onerileri, finansal projeksiyonlar. Veriye dayali kararlar alin.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#111827] mb-4">
            {isEn ? 'Ready to Grow Your Startup?' : "Startup'inizi Buyutmeye Hazir misiniz?"}
          </h2>
          <p className="text-sm text-[#6B7280] mb-8">
            {isEn
              ? 'Start free today. No credit card required.'
              : 'Bugun ucretsiz baslayin. Kredi karti gerekmez.'}
          </p>
          <Link
            to="/register"
            className="inline-block text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-8 py-3 transition-colors shadow-sm"
          >
            {t('Ücretsiz Başla')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#2563EB] rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <span className="text-sm font-bold text-[#111827]">AskDesk</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {isEn
                  ? 'All-in-one growth platform for startups. Find customers, create campaigns, manage your pipeline.'
                  : "Startup'lar icin hepsi bir arada buyume platformu. Musteri bulun, kampanya olusturun, pipeline'inizi yonetin."}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] mb-3">{isEn ? 'Product' : 'Urun'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li>Outreach</li>
                <li>Lead Generation</li>
                <li>CRM Pipeline</li>
                <li>{isEn ? 'SEO Content' : 'SEO Icerik'}</li>
                <li>Analytics</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] mb-3">{isEn ? 'Company' : 'Firma'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li>ATAOL AI Techs</li>
                <li>OperIQ AI</li>
                <li>destek@askdesk.app</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-6 flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">&copy; 2026 AskDesk. Powered by ATAOL AI Techs</span>
            <span className="text-xs text-[#9CA3AF]">{isEn ? 'All rights reserved.' : 'Tum hakları saklidir.'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
