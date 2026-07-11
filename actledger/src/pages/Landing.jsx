import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

const FEATURES = [
  {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    titleTr: 'AI Destekli Outreach',
    titleEn: 'AI-Powered Outreach',
    descTr: 'Yapay zekâ ile kişiselleştirilmiş email kampanyaları oluşturun. Email açılma takibi, otomatik şablon üretimi ve firma bazlı içerik optimizasyonu.',
    descEn: 'Create personalized email campaigns with AI. Email open tracking, automatic template generation, and company-based content optimization.',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    titleTr: 'Lead Generation',
    titleEn: 'Lead Generation',
    descTr: 'Google Maps entegrasyonu ile hedef sektörünüzdeki firmaları bulun, yorumlarını analiz edin ve tek tıkla lead listesine ekleyin. Sentiment analizi ile kaliteli leadleri önden seçin.',
    descEn: 'Find companies in your target sector with Google Maps integration, analyze reviews, and add to your lead list in one click. Pre-select quality leads with sentiment analysis.',
  },
  {
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
    titleTr: 'CRM Pipeline',
    titleEn: 'CRM Pipeline',
    descTr: 'Sürükle-bırak kanban görünümü ile satış sürecini görselleştirin. Leadlerinizi keşfedildi, iletişime geçildi, teklif verildi ve kazanıldı aşamaları arasında yönetin.',
    descEn: 'Visualize your sales process with drag-and-drop kanban view. Manage leads across discovered, contacted, offered, and won stages.',
  },
  {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    titleTr: 'SEO İçerik Üretimi',
    titleEn: 'SEO Content Creation',
    descTr: '6 adımlı SEO makale yazma süreci: trend araştırması, konu seçimi, Türkçe içerik, İngilizce çeviri, SEO skoru analizi ve doğrudan WordPress yayını.',
    descEn: '6-step SEO article workflow: trend research, topic selection, Turkish content, English translation, SEO score analysis, and direct WordPress publishing.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7',
    titleTr: 'Email Bulucu',
    titleEn: 'Email Finder',
    descTr: 'Firma web sitesini tarayarak gerçek email adreslerini bulun. MX kayıt doğrulama, web sitesinden veri çekme ve kalıp bazlı email tahmini ile iletişim bilgilerine ulaşın.',
    descEn: 'Find real email addresses by scanning company websites. Reach contact info with MX record verification, web scraping, and pattern-based email estimation.',
  },
  {
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    titleTr: 'Sosyal Medya Yönetimi',
    titleEn: 'Social Media Management',
    descTr: 'LinkedIn, Twitter/X, Instagram ve Facebook için platforma özel içerikler üretin. Karakter sınırı kontrolü, hashtag önerisi ve AI destekli post oluşturma.',
    descEn: 'Create platform-specific content for LinkedIn, Twitter/X, Instagram and Facebook. Character limit control, hashtag suggestions, and AI-powered post creation.',
  },
  {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    titleTr: 'Analytics Dashboard',
    titleEn: 'Analytics Dashboard',
    descTr: 'Email gönderim trendi, sosyal medya dağılımı, pipeline aşamaları ve içerik üretim istatistikleri. Tüm verilerinizi tek panelde izleyin.',
    descEn: 'Email sending trends, social media distribution, pipeline stages, and content production statistics. Monitor all your data in one panel.',
  },
  {
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    titleTr: 'Finansal Simülasyon',
    titleEn: 'Financial Simulation',
    descTr: '3 senaryo (iyimser, gerçekçi, kötümser) ile 12 aylık gelir/gider projeksiyonu. Birim ekonomi analizi, kâra geçiş noktası ve nakit akış grafikleri.',
    descEn: '12-month revenue/expense projection with 3 scenarios (optimistic, realistic, pessimistic). Unit economics analysis, break-even point, and cash flow charts.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    titleTr: 'Rakip Analizi',
    titleEn: 'Competitor Analysis',
    descTr: 'Rakip firmaların web sitelerini analiz edin. Güçlü yönler, zayıf yönler ve fırsatlar raporu ile stratejik konumlanmanızı belirleyin.',
    descEn: 'Analyze competitor websites. Determine your strategic positioning with strengths, weaknesses, and opportunities reports.',
  },
]

const STATS = [
  { valueTr: '11+', valueEn: '11+', labelTr: 'Entegre Modül', labelEn: 'Integrated Modules' },
  { valueTr: '4', valueEn: '4', labelTr: 'Sosyal Medya Platformu', labelEn: 'Social Media Platforms' },
  { valueTr: '3', valueEn: '3', labelTr: 'Senaryo Simülasyonu', labelEn: 'Scenario Simulations' },
  { valueTr: '6', valueEn: '6', labelTr: 'Adımlı SEO Süreci', labelEn: 'Step SEO Workflow' },
]

const STEPS = [
  {
    numTr: '1', numEn: '1',
    titleTr: 'Kayıt Olun', titleEn: 'Sign Up',
    descTr: 'Ücretsiz hesap oluşturun ve firma profilinizi doldurun. Web sitenizi analiz ederek profili otomatik oluşturur.',
    descEn: 'Create a free account and fill your company profile. Auto-generates your profile by analyzing your website.',
  },
  {
    numTr: '2', numEn: '2',
    titleTr: 'Leadlerinizi Bulun', titleEn: 'Find Your Leads',
    descTr: 'Google Maps, email bulucu veya manuel giriş ile potansiyel müşterilerinizi sisteme ekleyin.',
    descEn: 'Add your potential customers via Google Maps, email finder, or manual entry.',
  },
  {
    numTr: '3', numEn: '3',
    titleTr: 'Kampanya Oluşturun', titleEn: 'Create Campaigns',
    descTr: 'AI ile kişiselleştirilmiş email, SEO makale, sosyal medya içeriği ve newsletter üretin.',
    descEn: 'Create personalized emails, SEO articles, social media content, and newsletters with AI.',
  },
  {
    numTr: '4', numEn: '4',
    titleTr: 'Büyümeyi Takip Edin', titleEn: 'Track Growth',
    descTr: 'Analytics, pipeline ve finansal simülasyon ile performansınızı ölçün ve stratejinizi optimize edin.',
    descEn: 'Measure performance and optimize your strategy with analytics, pipeline, and financial simulation.',
  },
]

export default function Landing() {
  const { t, lang, toggleLang } = useT()
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
          <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
            {isEn ? 'Pricing' : 'Fiyatlandırma'}
          </a>
          <button
            onClick={toggleLang}
            className="text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md px-2.5 py-1.5 transition-colors"
          >
            {lang === 'tr' ? 'EN' : 'TR'}
          </button>
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
          <a
            href="https://www.ataolai.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-[#2563EB] bg-[#EFF6FF] rounded-full px-4 py-1.5 mb-6 hover:bg-[#DBEAFE] transition-colors"
          >
            Powered by ATAOL AI Techs
          </a>
          <h1 className="text-4xl font-bold text-[#111827] mb-5 leading-tight">
            {isEn
              ? 'The All-in-One Growth Platform for Startups'
              : "Startup'lar İçin Hepsi Bir Arada Büyüme Platformu"}
          </h1>
          <p className="text-base text-[#6B7280] mb-8 max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? 'Find potential customers, create personalized outreach campaigns, manage leads in a CRM pipeline, produce SEO content, and make data-driven strategic decisions. All powered by AI.'
              : 'Potansiyel müşterilerinizi bulun, kişiselleştirilmiş outreach kampanyaları oluşturun, leadlerinizi CRM pipeline ile yönetin, SEO içerik üretin ve veriye dayalı stratejik kararlar alın. Tümü AI destekli.'}
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
              {isEn ? 'Everything You Need to Grow' : 'Büyümeniz İçin İhtiyacınız Olan Her Şey'}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-xl mx-auto">
              {isEn
                ? 'From lead discovery to content creation, from pipeline management to competitive analysis. One platform, all tools.'
                : 'Lead keşfinden içerik üretimine, pipeline yönetiminden rakip analizine kadar. Tek platform, tüm araçlar.'}
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
              {isEn ? 'How It Works' : 'Nasıl Çalışır?'}
            </h2>
            <p className="text-sm text-[#6B7280]">
              {isEn ? '4 simple steps to accelerate your growth' : '4 basit adımda büyümenizi hızlandırın'}
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

      {/* Pricing */}
      <section className="px-6 py-16 bg-[#F9FAFB]" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#111827] mb-3">
              {isEn ? 'Simple, Transparent Pricing' : 'Basit ve Şeffaf Fiyatlandırma'}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-xl mx-auto">
              {isEn
                ? 'Start free, upgrade as you grow. No hidden fees.'
                : 'Ücretsiz başlayın, büyüdükçe yükseltin. Gizli ücret yok.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Free */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">
                {isEn ? 'Starter' : 'Başlangıç'}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-[#111827]">$0</span>
              </div>
              <p className="text-xs text-[#F59E0B] font-medium mb-1">
                {isEn ? '14-day free trial' : '14 gün ücretsiz deneme'}
              </p>
              <p className="text-xs text-[#9CA3AF] mb-5">
                {isEn ? 'Credit card required. Charged after trial.' : 'Kredi kartı gerekli. 14 gün sonunda ödeme alınır.'}
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  isEn ? '20 leads' : '20 lead',
                  isEn ? '20 emails/month' : '20 email/ay',
                  isEn ? '2 SEO articles/month' : '2 SEO makale/ay',
                  isEn ? 'CRM Pipeline' : 'CRM Pipeline',
                  isEn ? 'Analytics & BMC' : 'Analytics ve BMC',
                  isEn ? '5 AI uses/day' : 'Günlük 5 AI kullanım',
                  isEn ? '1 user' : '1 kullanıcı',
                  isEn ? 'Corporate email only' : 'Sadece kurumsal email',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <svg className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-md py-2.5 hover:bg-[#EFF6FF] transition-colors"
              >
                {isEn ? 'Start Trial' : 'Denemeye Başla'}
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white border-2 border-[#2563EB] rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-white bg-[#2563EB] rounded-full px-3 py-0.5">
                {isEn ? 'Most Popular' : 'En Popüler'}
              </div>
              <div className="text-xs font-medium text-[#2563EB] uppercase tracking-wide mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-[#111827]">$25</span>
                <span className="text-sm text-[#6B7280]">/{isEn ? 'mo' : 'ay'}</span>
              </div>
              <p className="text-xs text-[#10B981] font-medium mb-5">
                {isEn ? '$250/year (save $50)' : '$250/yıl ($50 tasarruf)'}
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  isEn ? '1 user' : '1 kullanıcı',
                  isEn ? '500 leads' : '500 lead',
                  isEn ? '200 emails/month' : '200 email/ay',
                  isEn ? '10 SEO articles/month' : '10 SEO makale/ay',
                  isEn ? 'Unlimited AI usage' : 'Sınırsız AI kullanımı',
                  isEn ? 'Email Finder' : 'Email Bulucu',
                  isEn ? 'Competitor Analysis' : 'Rakip Analizi',
                  isEn ? 'Social Media' : 'Sosyal Medya',
                  isEn ? 'Priority support' : 'Öncelikli destek',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <svg className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block text-center text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md py-2.5 transition-colors"
              >
                {isEn ? 'Get Started' : 'Başla'}
              </Link>
            </div>

            {/* Growth */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">Growth</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-[#111827]">$40</span>
                <span className="text-sm text-[#6B7280]">/{isEn ? 'mo' : 'ay'}</span>
              </div>
              <p className="text-xs text-[#10B981] font-medium mb-5">
                {isEn ? '$400/year (save $80)' : '$400/yıl ($80 tasarruf)'}
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  isEn ? '1 user' : '1 kullanıcı',
                  isEn ? 'Unlimited leads' : 'Sınırsız lead',
                  isEn ? 'Unlimited emails' : 'Sınırsız email',
                  isEn ? 'Unlimited SEO articles' : 'Sınırsız SEO makale',
                  isEn ? 'Unlimited AI usage' : 'Sınırsız AI kullanımı',
                  isEn ? 'All Pro features' : 'Tüm Pro özellikleri',
                  isEn ? 'API access' : 'API erişimi',
                  isEn ? 'Custom onboarding' : 'Özel onboarding',
                  isEn ? 'Dedicated support' : 'Özel destek',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <svg className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-md py-2.5 hover:bg-[#EFF6FF] transition-colors"
              >
                {isEn ? 'Get Started' : 'Başla'}
              </Link>
            </div>

            {/* Team */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">Team</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-[#111827]">$35</span>
                <span className="text-sm text-[#6B7280]">/{isEn ? 'user/mo' : 'kullanıcı/ay'}</span>
              </div>
              <p className="text-xs text-[#10B981] font-medium mb-5">
                {isEn ? 'Min. 3 users ($105/mo)' : 'Min. 3 kullanıcı ($105/ay)'}
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  isEn ? 'Min. 3 team members' : 'En az 3 ekip üyesi',
                  isEn ? 'All Growth features' : 'Tüm Growth özellikleri',
                  isEn ? 'Team collaboration' : 'Ekip işbirliği',
                  isEn ? 'Shared pipeline & leads' : 'Ortak pipeline ve leadler',
                  isEn ? 'Role-based access' : 'Rol bazlı erişim',
                  isEn ? 'Admin panel' : 'Yönetici paneli',
                  isEn ? 'Dedicated account manager' : 'Özel hesap yöneticisi',
                  isEn ? 'Custom integrations' : 'Özel entegrasyonlar',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <svg className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-md py-2.5 hover:bg-[#EFF6FF] transition-colors"
              >
                {isEn ? 'Contact Sales' : 'Satışa Ulaşın'}
              </Link>
            </div>
          </div>

          {/* Secure payment badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
            <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
              {isEn
                ? 'Secure payment with 256-bit SSL encryption. Payments processed by Lemon Squeezy.'
                : '256-bit SSL şifreleme ile güvenli ödeme. Ödemeler Lemon Squeezy tarafından işlenir.'}
            </span>
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="px-6 py-16 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#111827] mb-3">
            {isEn ? 'AI-Powered Platform' : 'AI Destekli Platform'}
          </h2>
          <p className="text-sm text-[#6B7280] max-w-2xl mx-auto mb-8 leading-relaxed">
            {isEn
              ? 'AI technology is integrated across all modules. From smart company profile creation to personalized email drafting, from SEO analysis to competitor research, AI accelerates every step of your workflow.'
              : 'Yapay zekâ teknolojisi tüm modüllere entegre edilmiştir. Akıllı firma profili oluşturmadan kişiselleştirilmiş email taslağına, SEO analizinden rakip araştırmasına kadar her adımda AI iş akışınızı hızlandırır.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Smart Profiling' : 'Akıllı Profil Oluşturma'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'Enter your website URL, AI analyzes your site and auto-fills your company profile.' : 'Web site URL\'nizi girin, AI sitenizi analiz edip firma profilinizi otomatik doldursun.'}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Content Generation' : 'İçerik Üretimi'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'SEO articles, social media posts, newsletters, email templates. All content is generated specific to your brand.' : 'SEO makale, sosyal medya postu, newsletter, email şablonu. Tüm içerikler markanıza özel üretilir.'}</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="text-sm font-semibold text-[#111827] mb-2">{isEn ? 'Strategic Analysis' : 'Stratejik Analiz'}</div>
              <p className="text-xs text-[#6B7280]">{isEn ? 'Competitor SWOT analysis, BMC recommendations, financial projections. Make data-driven decisions.' : 'Rakip SWOT analizi, BMC önerileri, finansal projeksiyonlar. Veriye dayalı kararlar alın.'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#111827] mb-4">
            {isEn ? 'Ready to Grow Your Startup?' : "Startup'ınızı Büyütmeye Hazır mısınız?"}
          </h2>
          <p className="text-sm text-[#6B7280] mb-8">
            {isEn
              ? 'Start free today. No credit card required.'
              : 'Bugün ücretsiz başlayın. Kredi kartı gerekmez.'}
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
                  : "Startup'lar için hepsi bir arada büyüme platformu. Müşteri bulun, kampanya oluşturun, pipeline'ınızı yönetin."}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] mb-3">{isEn ? 'Product' : 'Ürün'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li>Outreach</li>
                <li>Lead Generation</li>
                <li>CRM Pipeline</li>
                <li>{isEn ? 'SEO Content' : 'SEO İçerik'}</li>
                <li>Analytics</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] mb-3">{isEn ? 'Contact' : 'İletişim'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li>
                  <a href="https://www.ataolai.tech/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB] transition-colors">
                    ATAOL AI Techs
                  </a>
                </li>
                <li>
                  <a href="mailto:info@ataolai.tech" className="hover:text-[#2563EB] transition-colors">
                    info@ataolai.tech
                  </a>
                </li>
                <li>
                  {isEn
                    ? 'Istanbul Technical University ARI Teknokent Maslak/ISTANBUL'
                    : 'İstanbul Teknik Üniversitesi Arı Teknokent Maslak/İSTANBUL'}
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-6 flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">&copy; 2026 AskDesk. Powered by <a href="https://www.ataolai.tech/" target="_blank" rel="noopener noreferrer" className="hover:text-[#2563EB] transition-colors">ATAOL AI Techs</a></span>
            <span className="text-xs text-[#9CA3AF]">{isEn ? 'All rights reserved.' : 'Tüm hakları saklıdır.'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
