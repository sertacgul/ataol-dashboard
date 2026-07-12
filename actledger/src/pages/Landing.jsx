import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../contexts/LanguageContext'

const FEATURES = [
  {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    titleTr: 'Tam Otomatik Outreach',
    titleEn: 'Fully Automated Outreach',
    descTr: 'Firma adını girin, AI sektör analizi yapsın, karar vericileri bulsun ve 300-500 kelimelik sektöre özel kişiselleştirilmiş email otomatik oluştursun. Açılma takibi dahil.',
    descEn: 'Enter a company name. AI analyzes the sector, finds decision-makers, and auto-composes a 300-500 word sector-specific personalized email. Open tracking included.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7',
    titleTr: 'Kişi ve Email Bulucu',
    titleEn: 'People & Email Finder',
    descTr: 'Firma web sitesini ve AI bilgi tabanını tarayarak gerçek kişileri bulun: isim, unvan, email, telefon. MX doğrulama, toplu reveal ve CSV dışa aktarma.',
    descEn: 'Scan company websites and AI knowledge base to find real people: name, title, email, phone. MX verification, bulk reveal, and CSV export.',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    titleTr: 'Lead Generation',
    titleEn: 'Lead Generation',
    descTr: 'Google Maps entegrasyonu ile hedef sektörünüzdeki firmaları bulun, müşteri yorumlarını analiz edin ve tek tıkla lead listesine ekleyin.',
    descEn: 'Find companies in your target sector with Google Maps, analyze customer reviews, and add to your lead list in one click.',
  },
  {
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
    titleTr: 'CRM Pipeline',
    titleEn: 'CRM Pipeline',
    descTr: 'Sürükle-bırak kanban ile satış sürecini görselleştirin. Leadlerinizi aşamalar arasında yönetin, dönüşüm oranlarını takip edin.',
    descEn: 'Visualize your sales process with drag-and-drop kanban. Manage leads across stages and track conversion rates.',
  },
  {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    titleTr: 'SEO İçerik Üretimi',
    titleEn: 'SEO Content Creation',
    descTr: '6 adımlı SEO makale süreci: trend araştırması, konu seçimi, Türkçe içerik, İngilizce çeviri, SEO skoru ve WordPress yayını.',
    descEn: '6-step SEO article workflow: trend research, topic selection, content writing, translation, SEO scoring, and WordPress publishing.',
  },
  {
    icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
    titleTr: 'Sosyal Medya Yönetimi',
    titleEn: 'Social Media Management',
    descTr: 'LinkedIn, Twitter/X, Instagram ve Facebook için platforma özel içerik üretimi. Karakter limiti kontrolü ve AI hashtag önerisi.',
    descEn: 'Platform-specific content for LinkedIn, Twitter/X, Instagram and Facebook. Character limit control and AI hashtag suggestions.',
  },
  {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    titleTr: 'Analytics Dashboard',
    titleEn: 'Analytics Dashboard',
    descTr: 'Email gönderim trendi, açılma oranları, sosyal medya dağılımı, pipeline aşamaları ve içerik üretim istatistikleri.',
    descEn: 'Email sending trends, open rates, social media distribution, pipeline stages, and content production statistics.',
  },
  {
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    titleTr: 'Finansal Simülasyon',
    titleEn: 'Financial Simulation',
    descTr: '3 senaryo ile 12 aylık gelir/gider projeksiyonu. LTV/CAC, churn rate, EBITDA ve nakit akış grafikleri.',
    descEn: '12-month revenue/expense projection with 3 scenarios. LTV/CAC, churn rate, EBITDA margin, and cash flow charts.',
  },
  {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    titleTr: 'Rakip Analizi',
    titleEn: 'Competitor Analysis',
    descTr: 'Rakip firmaların web sitelerini AI ile analiz edin. SWOT raporu ile stratejik konumlanmanızı belirleyin.',
    descEn: 'Analyze competitor websites with AI. Determine strategic positioning with SWOT reports.',
  },
]

const STATS = [
  { value: '14+', labelTr: 'Entegre Modül', labelEn: 'Integrated Modules' },
  { value: '28', labelTr: 'Dil Desteği', labelEn: 'Languages Supported' },
  { value: '1-Click', labelTr: 'Otomatik Outreach', labelEn: 'Auto Outreach' },
  { value: '6', labelTr: 'Adımlı SEO Süreci', labelEn: 'Step SEO Workflow' },
]

const STEPS = [
  { num: '01', titleTr: 'Firma Adını Girin', titleEn: 'Enter a Company', descTr: 'Hedef firma adı veya domain girin. AI firmayı analiz edip sektör, karar vericiler ve iletişim bilgilerini otomatik bulsun.', descEn: 'Enter a target company name or domain. AI analyzes the company, finds sector, decision-makers, and contact info automatically.' },
  { num: '02', titleTr: 'AI Email Yazsın', titleEn: 'AI Writes the Email', descTr: 'Sektöre özel sorunları tespit eden, çözüm sunan ve ticaret odası referansı içeren 300-500 kelimelik profesyonel email otomatik oluşturulsun.', descEn: 'Auto-generate a 300-500 word professional email that identifies sector-specific pain points, proposes solutions, and includes trade chamber references.' },
  { num: '03', titleTr: 'Gönderin ve Takip Edin', titleEn: 'Send & Track', descTr: 'Emaili onaylayıp gönderin. Açılma takibi ile kimin okuduğunu, ne zaman açtığını görün.', descEn: 'Approve and send. Track who opened your email and when with real-time open tracking.' },
  { num: '04', titleTr: 'Pipeline ile Yönetin', titleEn: 'Manage with Pipeline', descTr: 'Yanıt alan leadleri CRM pipeline ile takip edin. Analytics ile kampanya performansını ölçün.', descEn: 'Follow up on responding leads with CRM pipeline. Measure campaign performance with analytics.' },
]

const DEMO_SCREENS = [
  { id: 'dashboard', label: 'Dashboard', route: 'dashboard', sidebarIcon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'leads', label: 'Leads', route: 'leads', sidebarIcon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'outreach', label: 'Outreach', route: 'outreach', sidebarIcon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { id: 'emailfinder', label: 'Email Finder', route: 'email-finder', sidebarIcon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7' },
  { id: 'pipeline', label: 'Pipeline', route: 'pipeline', sidebarIcon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { id: 'seo', label: 'SEO Content', route: 'seo-content', sidebarIcon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'social', label: 'Social Media', route: 'social', sidebarIcon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { id: 'newsletter', label: 'Newsletter', route: 'newsletter', sidebarIcon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
  { id: 'templates', label: 'Templates', route: 'templates', sidebarIcon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { id: 'calendar', label: 'Calendar', route: 'calendar', sidebarIcon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'analytics', label: 'Analytics', route: 'analytics', sidebarIcon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'simulator', label: 'Simulator', route: 'simulator', sidebarIcon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'bmc', label: 'Business Canvas', route: 'bmc', sidebarIcon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm4 0v14m8-14v14M4 9h16M4 15h16' },
  { id: 'competitors', label: 'Competitors', route: 'competitors', sidebarIcon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
]

function ScreenDashboard() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-sm font-semibold text-[#111827]">Dashboard</div>
          <div className="text-xs text-[#9CA3AF]">Welcome back, your overview is ready</div>
        </div>
        <div className="text-xs text-[#9CA3AF] border border-[#E5E7EB] rounded-md px-3 py-1.5">Last 30 days</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Leads', value: '2,847', change: '+12.5%' },
          { label: 'Emails Sent', value: '1,234', change: '+8.2%' },
          { label: 'Open Rate', value: '34.2%', change: '+2.1%' },
          { label: 'Converted', value: '186', change: '+18.7%' },
        ].map((m, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-3">
            <div className="text-xs text-[#9CA3AF] mb-1">{m.label}</div>
            <div className="text-lg font-bold text-[#111827]">{m.value}</div>
            <div className="text-xs font-medium mt-1 text-[#059669]">{m.change}</div>
          </div>
        ))}
      </div>
      <div className="border border-[#F3F4F6] rounded-lg p-4">
        <div className="text-xs font-medium text-[#111827] mb-3">Performance Overview</div>
        <svg viewBox="0 0 600 120" className="w-full">
          <defs>
            <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 30, 60, 90].map(y => <line key={y} x1="0" y1={y + 5} x2="600" y2={y + 5} stroke="#F3F4F6" strokeWidth="1" />)}
          <path d="M0 95 L75 80 L150 85 L225 55 L300 60 L375 35 L450 40 L525 20 L600 25 L600 120 L0 120Z" fill="url(#mcGrad)" />
          <path d="M0 95 L75 80 L150 85 L225 55 L300 60 L375 35 L450 40 L525 20 L600 25" fill="none" stroke="#2563EB" strokeWidth="2" />
          <path d="M0 100 L75 95 L150 90 L225 80 L300 75 L375 70 L450 65 L525 55 L600 50" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
      </div>
    </div>
  )
}

function ScreenLeads() {
  const leads = [
    { name: 'Acme Technologies', email: 'info@acmetech.com', status: 'New', score: 92, location: 'Istanbul' },
    { name: 'Nova Digital', email: 'hello@novadigital.io', status: 'Contacted', score: 87, location: 'Ankara' },
    { name: 'Peak Solutions', email: 'contact@peaksol.com', status: 'Qualified', score: 78, location: 'Izmir' },
    { name: 'Vertex Labs', email: 'team@vertexlabs.co', status: 'New', score: 95, location: 'Istanbul' },
    { name: 'Blue Horizon', email: 'info@bluehorizon.io', status: 'Contacted', score: 71, location: 'Bursa' },
    { name: 'Spark Ventures', email: 'hi@sparkventures.co', status: 'New', score: 84, location: 'Antalya' },
  ]
  const statusColors = { New: '#2563EB', Contacted: '#F59E0B', Qualified: '#059669' }
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Leads <span className="text-xs font-normal text-[#9CA3AF] ml-1">2,847 total</span></div>
        <div className="flex gap-2">
          <div className="text-xs text-[#9CA3AF] border border-[#E5E7EB] rounded-md px-3 py-1.5">Filter</div>
          <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ Add Lead</div>
        </div>
      </div>
      <div className="border border-[#F3F4F6] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
              <th className="text-left py-2.5 px-3 font-medium text-[#6B7280]">Company</th>
              <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden md:table-cell">Email</th>
              <th className="text-left py-2.5 px-3 font-medium text-[#6B7280]">Status</th>
              <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden sm:table-cell">Score</th>
              <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden lg:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l, i) => (
              <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                <td className="py-2.5 px-3 font-medium text-[#111827]">{l.name}</td>
                <td className="py-2.5 px-3 text-[#6B7280] hidden md:table-cell">{l.email}</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: statusColors[l.status] + '14', color: statusColors[l.status] }}>{l.status}</span>
                </td>
                <td className="py-2.5 px-3 hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${l.score}%` }} /></div>
                    <span className="text-[#6B7280]">{l.score}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-[#6B7280] hidden lg:table-cell">{l.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScreenOutreach() {
  const steps = [
    { icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9', label: 'acmetech.com', sub: 'Domain entered', done: true },
    { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'AI Sector Analysis', sub: 'SaaS / B2B identified', done: true },
    { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: '3 Decision-Makers', sub: 'CEO, CTO, Sales Dir.', done: true },
    { icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'AI Composing Email', sub: '478 words, personalized', active: true },
    { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Send & Track', sub: 'Open tracking ready' },
  ]
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#111827]">Outreach Automation</div>
        <span className="text-[10px] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">1-Click Flow</span>
      </div>
      <div className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${s.active ? 'border-[#2563EB] bg-[#EFF6FF]' : s.done ? 'border-[#F3F4F6] bg-white' : 'border-[#F3F4F6] bg-[#F9FAFB] opacity-60'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-[#059669]' : s.active ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'}`}>
              {s.done ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#111827]">{s.label}</div>
              <div className="text-[10px] text-[#6B7280]">{s.sub}</div>
            </div>
            {s.active && <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin shrink-0" />}
          </div>
        ))}
      </div>
      <div className="border border-[#F3F4F6] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-medium text-[#6B7280]">AI-Generated Preview</div>
          <div className="flex gap-1">
            <span className="text-[10px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded">478 words</span>
            <span className="text-[10px] bg-[#ECFDF5] text-[#059669] px-1.5 py-0.5 rounded">Personalized</span>
          </div>
        </div>
        <div className="bg-[#F9FAFB] rounded-md p-2.5 text-[11px] text-[#374151] leading-relaxed">
          <div className="text-[10px] text-[#9CA3AF] mb-1.5">Subject: SaaS Growth Partnership - AcmeTech</div>
          <p>Dear Mehmet Bey,</p>
          <p className="mt-1.5 text-[#6B7280]">As a rapidly growing B2B SaaS company, AcmeTech's recent expansion into enterprise markets presents both exciting opportunities and operational challenges...</p>
        </div>
      </div>
    </div>
  )
}

function ScreenPipeline() {
  const columns = [
    { title: 'Discovered', color: '#6B7280', items: [{ name: 'CloudSync Inc.', value: '$12,000' }, { name: 'DataPulse', value: '$8,500' }] },
    { title: 'Contacted', color: '#2563EB', items: [{ name: 'NetScale Pro', value: '$15,000' }, { name: 'AppForge', value: '$6,200' }] },
    { title: 'Proposal', color: '#F59E0B', items: [{ name: 'VeloTech', value: '$22,000' }] },
    { title: 'Won', color: '#059669', items: [{ name: 'InnoLabs', value: '$18,500' }, { name: 'SwiftCode', value: '$9,800' }] },
  ]
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Sales Pipeline <span className="text-xs font-normal text-[#9CA3AF] ml-1">$92,000 total</span></div>
        <div className="text-xs text-[#9CA3AF] border border-[#E5E7EB] rounded-md px-3 py-1.5">This Quarter</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {columns.map((col, ci) => (
          <div key={ci}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-xs font-medium text-[#374151]">{col.title}</span>
              <span className="text-[10px] text-[#9CA3AF]">{col.items.length}</span>
            </div>
            <div className="space-y-2">
              {col.items.map((item, ii) => (
                <div key={ii} className="border border-[#F3F4F6] rounded-lg p-3 bg-white">
                  <div className="text-xs font-medium text-[#111827] mb-1">{item.name}</div>
                  <div className="text-xs text-[#6B7280]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenSEO() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">SEO Content Studio</div>
        <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ New Article</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-5">
        {['Trend Research', 'Topic Selection', 'Writing', 'Translation', 'SEO Score', 'Publish'].map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 4 ? 'bg-[#2563EB] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>{i + 1}</div>
            <span className={i < 4 ? 'text-[#111827] font-medium' : 'text-[#9CA3AF]'}>{step}</span>
          </div>
        ))}
      </div>
      <div className="border border-[#F3F4F6] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
            <th className="text-left py-2.5 px-3 font-medium text-[#6B7280]">Title</th>
            <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden sm:table-cell">SEO Score</th>
            <th className="text-left py-2.5 px-3 font-medium text-[#6B7280] hidden md:table-cell">Status</th>
          </tr></thead>
          <tbody>
            {[
              { title: '2026 SaaS Growth Strategies for Turkish Startups', score: 94, status: 'Published' },
              { title: 'How AI is Transforming B2B Sales Outreach', score: 88, status: 'In Review' },
              { title: 'Building a CRM Pipeline: Complete Guide', score: 91, status: 'Published' },
              { title: 'Email Marketing Best Practices for Startups', score: 0, status: 'Writing' },
            ].map((a, i) => (
              <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                <td className="py-2.5 px-3 font-medium text-[#111827]">{a.title}</td>
                <td className="py-2.5 px-3 hidden sm:table-cell">
                  {a.score > 0 ? (
                    <span className={`font-medium ${a.score >= 90 ? 'text-[#059669]' : 'text-[#F59E0B]'}`}>{a.score}/100</span>
                  ) : <span className="text-[#9CA3AF]">--</span>}
                </td>
                <td className="py-2.5 px-3 hidden md:table-cell">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                    background: a.status === 'Published' ? '#ECFDF5' : a.status === 'In Review' ? '#FEF3C7' : '#F3F4F6',
                    color: a.status === 'Published' ? '#059669' : a.status === 'In Review' ? '#D97706' : '#6B7280',
                  }}>{a.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScreenAnalytics() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Analytics</div>
        <div className="flex gap-2 text-xs">
          <div className="text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] rounded-md px-3 py-1.5 font-medium">Overview</div>
          <div className="text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5">Channels</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div className="border border-[#F3F4F6] rounded-lg p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-[#9CA3AF] mb-2">Email Performance</div>
          <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="#2563EB" strokeWidth="10" strokeDasharray="220 94" strokeLinecap="round" transform="rotate(-90 60 60)" />
            <text x="60" y="58" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">71%</text>
            <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#9CA3AF">Delivery</text>
          </svg>
        </div>
        <div className="border border-[#F3F4F6] rounded-lg p-4">
          <div className="text-xs text-[#9CA3AF] mb-2">Pipeline Stages</div>
          {[{ label: 'Discovery', w: '85%', c: '#93C5FD' }, { label: 'Contact', w: '62%', c: '#2563EB' }, { label: 'Proposal', w: '38%', c: '#1D4ED8' }, { label: 'Won', w: '24%', c: '#059669' }].map((s, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="flex justify-between text-[10px] mb-0.5"><span className="text-[#374151]">{s.label}</span><span className="text-[#9CA3AF]">{s.w}</span></div>
              <div className="h-1.5 bg-[#F3F4F6] rounded-full"><div className="h-full rounded-full" style={{ width: s.w, background: s.c }} /></div>
            </div>
          ))}
        </div>
        <div className="border border-[#F3F4F6] rounded-lg p-4">
          <div className="text-xs text-[#9CA3AF] mb-2">Content Output</div>
          <div className="space-y-3">
            {[{ label: 'SEO Articles', val: '24', trend: '+6' }, { label: 'Social Posts', val: '86', trend: '+12' }, { label: 'Newsletters', val: '8', trend: '+3' }].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-[#374151]">{s.label}</span>
                <div className="flex items-center gap-1.5"><span className="text-sm font-bold text-[#111827]">{s.val}</span><span className="text-[10px] text-[#059669]">{s.trend}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScreenEmailFinder() {
  const results = [
    { name: 'Mehmet Yilmaz', email: 'mehmet@acmetech.com', phone: '+90 532 *** **12', title: 'CEO', conf: 96, verified: true, revealed: true },
    { name: 'Ayse Kara', email: 'ayse.kara@acmetech.com', phone: '+90 541 *** **89', title: 'CTO', conf: 92, verified: true, revealed: true },
    { name: 'Can Demir', email: 'can.demir@acmetech.com', phone: '+90 505 *** **34', title: 'Head of Sales', conf: 78, verified: false, revealed: false },
    { name: 'Elif Ozturk', email: 'elif.o@acmetech.com', phone: '+90 553 *** **67', title: 'Marketing Dir.', conf: 88, verified: true, revealed: true },
  ]
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#111827]">People & Email Finder</div>
        <div className="flex gap-2">
          <div className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-2.5 py-1.5">CSV Export</div>
          <div className="text-xs text-white bg-[#2563EB] rounded-md px-2.5 py-1.5 font-medium">Reveal All</div>
        </div>
      </div>
      <div className="border border-[#F3F4F6] rounded-lg p-3 mb-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <span className="text-xs text-[#374151]">acmetech.com</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">4 people found</span>
          <span className="text-[10px] text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">MX Verified</span>
        </div>
      </div>
      <div className="border border-[#F3F4F6] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
            <th className="text-left py-2 px-3 font-medium text-[#6B7280]">Person</th>
            <th className="text-left py-2 px-3 font-medium text-[#6B7280] hidden sm:table-cell">Contact</th>
            <th className="text-left py-2 px-3 font-medium text-[#6B7280]">Status</th>
          </tr></thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                <td className="py-2 px-3">
                  <div className="font-medium text-[#111827]">{r.name}</div>
                  <div className="text-[10px] text-[#6B7280]">{r.title}</div>
                </td>
                <td className="py-2 px-3 hidden sm:table-cell">
                  <div className="text-[#2563EB]">{r.email}</div>
                  <div className="text-[10px] text-[#6B7280]">{r.phone}</div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium inline-block w-fit ${r.verified ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF3C7] text-[#D97706]'}`}>
                      {r.verified ? 'Verified' : 'Estimated'} {r.conf}%
                    </span>
                    {r.revealed && <span className="text-[10px] text-[#2563EB]">Revealed</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScreenSocial() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Social Media</div>
        <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ New Post</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { platform: 'LinkedIn', posts: 24, color: '#0A66C2' },
          { platform: 'Twitter/X', posts: 38, color: '#111827' },
          { platform: 'Instagram', posts: 16, color: '#E1306C' },
          { platform: 'Facebook', posts: 12, color: '#1877F2' },
        ].map((p, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-3 text-center">
            <div className="text-lg font-bold" style={{ color: p.color }}>{p.posts}</div>
            <div className="text-[10px] text-[#9CA3AF]">{p.platform}</div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { platform: 'LinkedIn', text: 'Excited to announce our new AI-powered outreach features...', status: 'Published', time: '2h ago' },
          { platform: 'Twitter/X', text: 'How startups can 3x their lead generation with smart tools...', status: 'Scheduled', time: 'Tomorrow' },
          { platform: 'Instagram', text: 'Behind the scenes: Building the future of B2B sales...', status: 'Draft', time: '--' },
        ].map((p, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-3 flex items-start gap-3">
            <div className="text-[10px] font-semibold text-[#6B7280] bg-[#F3F4F6] rounded px-1.5 py-0.5 shrink-0">{p.platform}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#374151] truncate">{p.text}</div>
              <div className="text-[10px] text-[#9CA3AF] mt-0.5">{p.time}</div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${p.status === 'Published' ? 'bg-[#ECFDF5] text-[#059669]' : p.status === 'Scheduled' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenNewsletter() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Newsletter <span className="text-xs font-normal text-[#9CA3AF] ml-1">3 campaigns</span></div>
        <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ New Newsletter</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'July Product Update', subscribers: 1420, openRate: '42%', status: 'Sent', date: 'Jul 8, 2026' },
          { title: 'Startup Growth Tips #12', subscribers: 1380, openRate: '38%', status: 'Sent', date: 'Jul 1, 2026' },
          { title: 'AI Features Launch', subscribers: 1450, openRate: '--', status: 'Draft', date: '--' },
        ].map((n, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[#111827]">{n.title}</div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${n.status === 'Sent' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>{n.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-sm font-bold text-[#111827]">{n.subscribers.toLocaleString()}</div><div className="text-[10px] text-[#9CA3AF]">Subscribers</div></div>
              <div><div className="text-sm font-bold text-[#2563EB]">{n.openRate}</div><div className="text-[10px] text-[#9CA3AF]">Open Rate</div></div>
              <div><div className="text-sm font-bold text-[#6B7280]">{n.date}</div><div className="text-[10px] text-[#9CA3AF]">Date</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenTemplates() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Templates</div>
        <div className="flex gap-2">
          {['All', 'Email', 'Social', 'SEO'].map((f, i) => (
            <div key={i} className={`text-xs px-2.5 py-1 rounded-md ${i === 0 ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' : 'text-[#6B7280] border border-[#E5E7EB]'}`}>{f}</div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { name: 'Cold Outreach - B2B', cat: 'Email', uses: 48 },
          { name: 'Follow-up Sequence', cat: 'Email', uses: 35 },
          { name: 'Product Launch Post', cat: 'Social', uses: 22 },
          { name: 'SEO Blog Template', cat: 'SEO', uses: 18 },
          { name: 'Weekly Newsletter', cat: 'Newsletter', uses: 12 },
          { name: 'Partnership Inquiry', cat: 'Email', uses: 29 },
        ].map((t, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-3">
            <div className="text-xs font-medium text-[#111827] mb-1">{t.name}</div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] rounded px-1.5 py-0.5">{t.cat}</span>
              <span className="text-[10px] text-[#9CA3AF]">{t.uses} uses</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenCalendar() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const events = { 2: { label: 'Blog Post', color: '#2563EB' }, 5: { label: 'Newsletter', color: '#7C3AED' }, 8: { label: 'Outreach', color: '#059669' }, 11: { label: 'Social Post', color: '#E1306C' }, 15: { label: 'SEO Article', color: '#2563EB' }, 18: { label: 'Webinar', color: '#F59E0B' }, 22: { label: 'Campaign', color: '#059669' }, 25: { label: 'Report', color: '#6B7280' } }
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Content Calendar <span className="text-xs font-normal text-[#9CA3AF] ml-1">July 2026</span></div>
        <div className="flex gap-2">
          <div className="text-xs text-[#6B7280] border border-[#E5E7EB] rounded-md px-3 py-1.5">Month</div>
          <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ Add Event</div>
        </div>
      </div>
      <div className="border border-[#F3F4F6] rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-[#F9FAFB] border-b border-[#F3F4F6]">
          {days.map(d => <div key={d} className="text-[10px] font-medium text-[#6B7280] text-center py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 28 }, (_, i) => {
            const day = i + 1
            const ev = events[day]
            return (
              <div key={i} className="border-b border-r border-[#F3F4F6] p-1.5 min-h-[48px]">
                <div className="text-[10px] text-[#9CA3AF] mb-0.5">{day}</div>
                {ev && <div className="text-[9px] font-medium rounded px-1 py-0.5 truncate" style={{ background: ev.color + '14', color: ev.color }}>{ev.label}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ScreenSimulator() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Financial Simulator</div>
        <div className="flex gap-1">
          {['Optimistic', 'Realistic', 'Pessimistic'].map((s, i) => (
            <div key={i} className={`text-xs px-2.5 py-1 rounded-md ${i === 1 ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' : 'text-[#9CA3AF]'}`}>{s}</div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Monthly Revenue', value: '$48,200', trend: '+22%' },
          { label: 'Monthly Cost', value: '$31,500', trend: '-5%' },
          { label: 'Net Profit', value: '$16,700', trend: '+38%' },
          { label: 'Break-even', value: 'Month 8', trend: '' },
        ].map((m, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-3">
            <div className="text-[10px] text-[#9CA3AF] mb-1">{m.label}</div>
            <div className="text-sm font-bold text-[#111827]">{m.value}</div>
            {m.trend && <div className={`text-[10px] font-medium mt-0.5 ${m.trend.startsWith('+') ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{m.trend}</div>}
          </div>
        ))}
      </div>
      <div className="border border-[#F3F4F6] rounded-lg p-4">
        <div className="text-xs font-medium text-[#111827] mb-3">12-Month Cash Flow Projection</div>
        <svg viewBox="0 0 600 100" className="w-full">
          {[0, 25, 50, 75].map(y => <line key={y} x1="0" y1={y + 5} x2="600" y2={y + 5} stroke="#F3F4F6" strokeWidth="1" />)}
          <path d="M0 90 L50 85 L100 80 L150 70 L200 65 L250 55 L300 45 L350 40 L400 35 L450 25 L500 20 L550 15 L600 10" fill="none" stroke="#059669" strokeWidth="2" />
          <path d="M0 70 L50 72 L100 68 L150 65 L200 60 L250 58 L300 55 L350 52 L400 50 L450 48 L500 45 L550 42 L600 40" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="570" y="8" fontSize="8" fill="#059669">Revenue</text>
          <text x="575" y="38" fontSize="8" fill="#DC2626">Cost</text>
        </svg>
      </div>
    </div>
  )
}

function ScreenBMC() {
  const sections = [
    { title: 'Key Partners', items: ['Cloud Providers', 'API Vendors'], col: 'col-span-1 row-span-2' },
    { title: 'Key Activities', items: ['AI Model Training', 'Platform Dev'], col: 'col-span-1' },
    { title: 'Value Propositions', items: ['All-in-one Growth', 'AI Automation', 'Cost Reduction'], col: 'col-span-1 row-span-2' },
    { title: 'Customer Relations', items: ['Self-service', 'Dedicated Support'], col: 'col-span-1' },
    { title: 'Customer Segments', items: ['B2B Startups', 'SMEs', 'Sales Teams'], col: 'col-span-1 row-span-2' },
    { title: 'Key Resources', items: ['AI Engine', 'Dev Team'], col: 'col-span-1' },
    { title: 'Channels', items: ['Direct Sales', 'Content Mkt'], col: 'col-span-1' },
    { title: 'Cost Structure', items: ['Infrastructure', 'API Costs', 'Payroll'], col: 'col-span-2' },
    { title: 'Revenue Streams', items: ['SaaS Subscriptions', 'Enterprise Plans'], col: 'col-span-3' },
  ]
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Business Model Canvas</div>
        <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">Export PDF</div>
      </div>
      <div className="grid grid-cols-5 gap-px bg-[#E5E7EB] border border-[#E5E7EB] rounded-lg overflow-hidden" style={{ fontSize: 10 }}>
        {sections.map((s, i) => (
          <div key={i} className={`bg-white p-2.5 ${s.col}`}>
            <div className="font-semibold text-[#2563EB] mb-1.5 uppercase" style={{ fontSize: 9, letterSpacing: '0.5px' }}>{s.title}</div>
            {s.items.map((item, j) => (
              <div key={j} className="text-[#374151] mb-1 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-[#93C5FD] shrink-0" />
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenCompetitors() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-semibold text-[#111827]">Competitor Analysis</div>
        <div className="text-xs text-white bg-[#2563EB] rounded-md px-3 py-1.5 font-medium">+ Analyze New</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'CompetitorA.io', strengths: ['Strong SEO', 'API Access'], weaknesses: ['No AI', 'High Price'], threat: 'Medium' },
          { name: 'RivalTech.com', strengths: ['Large User Base', 'Integrations'], weaknesses: ['Poor UX', 'No CRM'], threat: 'Low' },
        ].map((c, i) => (
          <div key={i} className="border border-[#F3F4F6] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-[#111827]">{c.name}</div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.threat === 'Medium' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#ECFDF5] text-[#059669]'}`}>{c.threat} Threat</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-medium text-[#059669] mb-1">Strengths</div>
                {c.strengths.map((s, j) => <div key={j} className="text-[10px] text-[#374151] flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#059669]" />{s}</div>)}
              </div>
              <div>
                <div className="text-[10px] font-medium text-[#DC2626] mb-1">Weaknesses</div>
                {c.weaknesses.map((w, j) => <div key={j} className="text-[10px] text-[#374151] flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#DC2626]" />{w}</div>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SCREEN_COMPONENTS = {
  dashboard: ScreenDashboard,
  leads: ScreenLeads,
  outreach: ScreenOutreach,
  emailfinder: ScreenEmailFinder,
  pipeline: ScreenPipeline,
  seo: ScreenSEO,
  social: ScreenSocial,
  newsletter: ScreenNewsletter,
  templates: ScreenTemplates,
  calendar: ScreenCalendar,
  analytics: ScreenAnalytics,
  simulator: ScreenSimulator,
  bmc: ScreenBMC,
  competitors: ScreenCompetitors,
}

function ProductShowcase({ isEn }) {
  const [active, setActive] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [zoom, setZoom] = useState(false)
  const timerRef = useRef(null)
  const INTERVAL = 3500

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTransitioning(true)
      setZoom(true)
      setTimeout(() => {
        setActive(prev => (prev + 1) % DEMO_SCREENS.length)
        setZoom(false)
        setTimeout(() => setTransitioning(false), 50)
      }, 400)
    }, INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [])

  function goTo(idx) {
    if (idx === active) return
    clearInterval(timerRef.current)
    setTransitioning(true)
    setZoom(true)
    setTimeout(() => {
      setActive(idx)
      setZoom(false)
      setTimeout(() => setTransitioning(false), 50)
      timerRef.current = setInterval(() => {
        setTransitioning(true)
        setZoom(true)
        setTimeout(() => {
          setActive(prev => (prev + 1) % DEMO_SCREENS.length)
          setZoom(false)
          setTimeout(() => setTransitioning(false), 50)
        }, 400)
      }, INTERVAL)
    }, 400)
  }

  const screen = DEMO_SCREENS[active]
  const ScreenComp = SCREEN_COMPONENTS[screen.id]

  return (
    <div className="relative mt-16 mx-auto" style={{ maxWidth: 920 }}>
      {/* Screen label tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 px-1 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {DEMO_SCREENS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0"
            style={{
              background: i === active ? '#EFF6FF' : 'transparent',
              color: i === active ? '#2563EB' : '#9CA3AF',
              border: i === active ? '1px solid #DBEAFE' : '1px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Browser frame */}
      <div
        className="rounded-xl overflow-hidden transition-all duration-500"
        style={{
          border: '1px solid #E5E7EB',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03)',
          transform: zoom ? 'scale(0.98)' : 'scale(1)',
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FCA5A5]" />
            <div className="w-3 h-3 rounded-full bg-[#FCD34D]" />
            <div className="w-3 h-3 rounded-full bg-[#6EE7B7]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-md px-4 py-1 text-xs text-[#9CA3AF]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              app.askdesk.app/{screen.route}
            </div>
          </div>
        </div>

        {/* App frame */}
        <div className="flex bg-white" style={{ minHeight: 380 }}>
          {/* Sidebar */}
          <div className="hidden md:block border-r border-[#F3F4F6] bg-[#FAFBFC]" style={{ width: 180 }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6">
                <img src="/assets/logo.svg" alt="" className="w-6 h-6" />
                <span className="text-sm font-semibold text-[#111827]">AskDesk</span>
              </div>
              {DEMO_SCREENS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs mb-0.5 text-left transition-colors"
                  style={{
                    background: i === active ? '#EFF6FF' : 'transparent',
                    color: i === active ? '#2563EB' : '#6B7280',
                    fontWeight: i === active ? 600 : 400,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.sidebarIcon} />
                  </svg>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screen content */}
          <div
            className="flex-1 overflow-hidden transition-all duration-400"
            style={{
              opacity: transitioning ? 0 : 1,
              transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
            }}
          >
            <ScreenComp />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex justify-center gap-1.5 mt-4">
        {DEMO_SCREENS.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full overflow-hidden transition-all"
            style={{ width: i === active ? 32 : 8, background: '#E5E7EB' }}
          >
            {i === active && (
              <div
                className="h-full bg-[#2563EB] rounded-full"
                style={{ animation: `progressFill ${INTERVAL}ms linear` }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const { t, lang, changeLang, languages } = useT()
  const isEn = lang !== 'tr'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-[#F3F4F6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/assets/logo.svg" alt="AskDesk" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-sm sm:text-base font-bold text-[#111827] tracking-tight">AskDesk</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            <a href="#features" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
              {isEn ? 'Features' : 'Özellikler'}
            </a>
            <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
              {isEn ? 'Pricing' : 'Fiyatlandırma'}
            </a>
            <select
              value={lang}
              onChange={e => changeLang(e.target.value)}
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md px-1.5 py-1.5 bg-white cursor-pointer focus:outline-none"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <Link to="/login" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
              {t('Giriş Yap')}
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg px-4 py-2 transition-colors"
            >
              {t('Ücretsiz Başla')}
            </Link>
          </div>

          {/* Mobile nav buttons */}
          <div className="flex md:hidden items-center gap-2">
            <select
              value={lang}
              onChange={e => changeLang(e.target.value)}
              className="text-xs font-medium text-[#6B7280] border border-[#E5E7EB] rounded-md px-1 py-1.5 bg-white cursor-pointer"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
              ))}
            </select>
            <Link
              to="/register"
              className="text-xs font-medium text-white bg-[#2563EB] rounded-lg px-3 py-1.5"
            >
              {t('Ücretsiz Başla')}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-[#6B7280] hover:text-[#111827]"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#F3F4F6] bg-white px-4 py-3 space-y-1">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#6B7280] hover:text-[#111827]"
            >
              {isEn ? 'Features' : 'Özellikler'}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#6B7280] hover:text-[#111827]"
            >
              {isEn ? 'Pricing' : 'Fiyatlandırma'}
            </a>
            <Link
              to="/login"
              className="block py-2 text-sm text-[#6B7280] hover:text-[#111827]"
            >
              {t('Giriş Yap')}
            </Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-20 bg-gradient-to-b from-[#F8FAFF] to-white relative overflow-hidden">
        {/* Left side - startup icons floating */}
        <div className="absolute left-4 xl:left-12 top-0 bottom-0 pointer-events-none hidden lg:flex flex-col items-center justify-center gap-10" style={{ width: 80 }}>
          {/* Rocket */}
          <div style={{ animation: 'float 6s ease-in-out infinite' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>
          </div>
          {/* Chart trending up */}
          <div style={{ animation: 'float 7s ease-in-out infinite 1s' }}>
            <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          </div>
          {/* Target / Bullseye */}
          <div style={{ animation: 'float 8s ease-in-out infinite 2s' }}>
            <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>
          </div>
          {/* Connecting dashed line */}
          <svg className="absolute top-1/4 left-1/2 -translate-x-1/2" width="2" height="50%" viewBox="0 0 2 300" opacity="0.15">
            <line x1="1" y1="0" x2="1" y2="300" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4 8" />
          </svg>
        </div>

        {/* Right side - startup icons floating */}
        <div className="absolute right-4 xl:right-12 top-0 bottom-0 pointer-events-none hidden lg:flex flex-col items-center justify-center gap-10" style={{ width: 80 }}>
          {/* Email / Outreach */}
          <div style={{ animation: 'float 7s ease-in-out infinite 0.5s' }}>
            <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>
          {/* Users / Leads */}
          <div style={{ animation: 'float 6s ease-in-out infinite 1.5s' }}>
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
          </div>
          {/* Lightning / AI */}
          <div style={{ animation: 'float 8s ease-in-out infinite 2.5s' }}>
            <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
          </div>
          {/* Connecting dashed line */}
          <svg className="absolute top-1/4 left-1/2 -translate-x-1/2" width="2" height="50%" viewBox="0 0 2 300" opacity="0.15">
            <line x1="1" y1="0" x2="1" y2="300" stroke="#DBEAFE" strokeWidth="1.5" strokeDasharray="4 8" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <a
            href="https://www.ataolai.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] rounded-full px-4 py-1.5 mb-6 hover:bg-[#DBEAFE] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Powered by ATAOL AI Techs
          </a>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2563EB] mb-5 leading-[1.15] tracking-tight">
            {isEn
              ? <>The Growth Platform<br />Built for Startups</>
              : <>Startup'lar İçin<br />Büyüme Platformu</>}
          </h1>
          <p className="text-base text-[#6B7280] mb-8 max-w-xl mx-auto leading-relaxed">
            {isEn
              ? 'Find customers, run outreach campaigns, manage your pipeline, and make data-driven decisions in one platform. Featuring fully automated AI outreach.'
              : 'Tek platformda müşteri bulun, outreach kampanyaları yürütün, pipeline yönetin ve veriye dayalı kararlar alın. Tam otomatik AI outreach dahil.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg px-6 py-2.5 transition-colors shadow-sm shadow-blue-500/20"
            >
              {isEn ? 'Start Free Trial' : '7 Gün Ücretsiz Deneyin'}
            </Link>
            <a
              href="#features"
              className="text-sm font-medium text-[#374151] border border-[#D1D5DB] hover:border-[#9CA3AF] rounded-lg px-6 py-2.5 transition-colors"
            >
              {isEn ? 'See Features' : 'Özellikleri Gör'}
            </a>
          </div>
        </div>
        <ProductShowcase isEn={isEn} />
      </section>

      {/* Trusted by / Stats */}
      <section className="px-6 py-14 border-y border-[#F3F4F6]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-extrabold text-[#111827] tracking-tight">{s.value}</div>
                <div className="text-sm text-[#9CA3AF] mt-1">{isEn ? s.labelEn : s.labelTr}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 relative overflow-hidden" id="features">
        {/* Left icon */}
        <div className="absolute left-4 xl:left-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 7s ease-in-out infinite' }}>
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
        </div>
        {/* Right icon */}
        <div className="absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 8s ease-in-out infinite 1s' }}>
          <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider mb-2">
              {isEn ? 'Features' : 'Özellikler'}
            </p>
            <h2 className="text-3xl font-extrabold text-[#2563EB] mb-3 tracking-tight">
              {isEn ? 'Everything you need to grow' : 'Büyümeniz için ihtiyacınız olan her şey'}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-lg mx-auto">
              {isEn
                ? 'From lead discovery to content creation, pipeline management to competitive analysis. One platform.'
                : 'Lead keşfinden içerik üretimine, pipeline yönetiminden rakip analizine kadar. Tek platform.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#F3F4F6] border border-[#F3F4F6] rounded-xl overflow-hidden">
            {FEATURES.map((f, i) => (
              <article key={i} className="bg-white p-6 hover:bg-[#FAFBFF] transition-colors">
                <div className="w-9 h-9 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-[18px] h-[18px] text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mb-1.5">{isEn ? f.titleEn : f.titleTr}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{isEn ? f.descEn : f.descTr}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-[#F9FAFB] relative overflow-hidden" id="how-it-works">
        {/* Left icon - settings/gear */}
        <div className="absolute left-4 xl:left-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'floatSlow 8s ease-in-out infinite' }}>
          <div className="w-11 h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
            </svg>
          </div>
        </div>
        {/* Right icon - play/start */}
        <div className="absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 7s ease-in-out infinite 1s' }}>
          <div className="w-11 h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider mb-2">
              {isEn ? 'How it works' : 'Nasıl çalışır'}
            </p>
            <h2 className="text-3xl font-extrabold text-[#2563EB] tracking-tight">
              {isEn ? 'Get started in minutes' : 'Dakikalar içinde başlayın'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-extrabold text-[#DBEAFE] mb-3">{s.num}</div>
                <h3 className="text-sm font-semibold text-[#111827] mb-1.5">{isEn ? s.titleEn : s.titleTr}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{isEn ? s.descEn : s.descTr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="px-6 py-20 relative overflow-hidden">
        {/* Left icon - brain/AI */}
        <div className="absolute left-4 xl:left-16 top-1/2 -translate-y-1/2 pointer-events-none hidden xl:block" style={{ animation: 'float 7s ease-in-out infinite' }}>
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
        </div>
        {/* Right icon - chart */}
        <div className="absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 pointer-events-none hidden xl:block" style={{ animation: 'float 8s ease-in-out infinite 1s' }}>
          <div className="w-12 h-12 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider mb-2">
                {isEn ? 'AI Technology' : 'AI Teknolojisi'}
              </p>
              <h2 className="text-3xl font-extrabold text-[#2563EB] mb-4 tracking-tight">
                {isEn ? 'AI at every step of your workflow' : 'İş akışınızın her adımında AI'}
              </h2>
              <p className="text-sm text-[#6B7280] mb-8 leading-relaxed">
                {isEn
                  ? 'From smart company profiling to personalized email drafting, SEO analysis to competitor research. AI accelerates every step.'
                  : 'Akıllı firma profilinden kişiselleştirilmiş email taslağına, SEO analizinden rakip araştırmasına. Her adımda AI hızlandırır.'}
              </p>
              <div className="space-y-4">
                {[
                  { titleTr: 'Akıllı Profil Oluşturma', titleEn: 'Smart Profiling', descTr: 'Web sitenizi analiz edip firma profilinizi otomatik doldurun.', descEn: 'Analyze your website and auto-fill your company profile.' },
                  { titleTr: 'İçerik Üretimi', titleEn: 'Content Generation', descTr: 'SEO makale, sosyal medya postu, newsletter. Markanıza özel.', descEn: 'SEO articles, social posts, newsletters. Tailored to your brand.' },
                  { titleTr: 'Stratejik Analiz', titleEn: 'Strategic Analysis', descTr: 'SWOT analizi, BMC önerileri, finansal projeksiyonlar.', descEn: 'SWOT analysis, BMC recommendations, financial projections.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#111827]">{isEn ? item.titleEn : item.titleTr}</div>
                      <div className="text-xs text-[#6B7280]">{isEn ? item.descEn : item.descTr}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI visual - abstract data flow */}
            <div className="relative">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <svg viewBox="0 0 400 300" className="w-full">
                  {/* Central AI node */}
                  <rect x="140" y="110" width="120" height="80" rx="12" fill="#2563EB" />
                  <text x="200" y="148" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">AI Engine</text>
                  <text x="200" y="166" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="Inter, system-ui, sans-serif">AskDesk Core</text>

                  {/* Input nodes */}
                  <rect x="10" y="20" width="100" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
                  <text x="60" y="40" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">Website Data</text>
                  <text x="60" y="52" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontFamily="Inter, system-ui, sans-serif">Auto-scraping</text>

                  <rect x="10" y="128" width="100" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
                  <text x="60" y="148" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">Lead Database</text>
                  <text x="60" y="160" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontFamily="Inter, system-ui, sans-serif">Google Maps</text>

                  <rect x="10" y="236" width="100" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
                  <text x="60" y="256" textAnchor="middle" fill="#374151" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">Market Trends</text>
                  <text x="60" y="268" textAnchor="middle" fill="#9CA3AF" fontSize="8" fontFamily="Inter, system-ui, sans-serif">SEO & Analytics</text>

                  {/* Output nodes */}
                  <rect x="290" y="20" width="100" height="44" rx="8" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="1" />
                  <text x="340" y="40" textAnchor="middle" fill="#1D4ED8" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">Email Campaigns</text>
                  <text x="340" y="52" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="Inter, system-ui, sans-serif">Personalized</text>

                  <rect x="290" y="128" width="100" height="44" rx="8" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="1" />
                  <text x="340" y="148" textAnchor="middle" fill="#1D4ED8" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">SEO Content</text>
                  <text x="340" y="160" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="Inter, system-ui, sans-serif">6-Step Process</text>

                  <rect x="290" y="236" width="100" height="44" rx="8" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="1" />
                  <text x="340" y="256" textAnchor="middle" fill="#1D4ED8" fontSize="9" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">Growth Reports</text>
                  <text x="340" y="268" textAnchor="middle" fill="#93C5FD" fontSize="8" fontFamily="Inter, system-ui, sans-serif">SWOT & BMC</text>

                  {/* Connection lines - inputs */}
                  <path d="M110 42 L140 130" stroke="#D1D5DB" strokeWidth="1" fill="none" />
                  <path d="M110 150 L140 150" stroke="#D1D5DB" strokeWidth="1" fill="none" />
                  <path d="M110 258 L140 170" stroke="#D1D5DB" strokeWidth="1" fill="none" />

                  {/* Connection lines - outputs */}
                  <path d="M260 130 L290 42" stroke="#93C5FD" strokeWidth="1.5" fill="none" />
                  <path d="M260 150 L290 150" stroke="#93C5FD" strokeWidth="1.5" fill="none" />
                  <path d="M260 170 L290 258" stroke="#93C5FD" strokeWidth="1.5" fill="none" />

                  {/* Small dots on connections */}
                  <circle cx="125" cy="86" r="2.5" fill="#D1D5DB" />
                  <circle cx="125" cy="150" r="2.5" fill="#D1D5DB" />
                  <circle cx="125" cy="214" r="2.5" fill="#D1D5DB" />
                  <circle cx="275" cy="86" r="2.5" fill="#93C5FD" />
                  <circle cx="275" cy="150" r="2.5" fill="#93C5FD" />
                  <circle cx="275" cy="214" r="2.5" fill="#93C5FD" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-20 bg-[#F9FAFB] relative overflow-hidden" id="pricing">
        {/* Left icon - shield/security */}
        <div className="absolute left-4 xl:left-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 8s ease-in-out infinite' }}>
          <div className="w-11 h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
        </div>
        {/* Right icon - credit card */}
        <div className="absolute right-4 xl:right-16 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'floatSlow 7s ease-in-out infinite 1s' }}>
          <div className="w-11 h-11 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider mb-2">
              {isEn ? 'Pricing' : 'Fiyatlandırma'}
            </p>
            <h2 className="text-3xl font-extrabold text-[#2563EB] mb-3 tracking-tight">
              {isEn ? 'Simple, transparent pricing' : 'Basit ve şeffaf fiyatlandırma'}
            </h2>
            <p className="text-sm text-[#6B7280] max-w-lg mx-auto">
              {isEn ? 'Start free, upgrade as you grow. No hidden fees.' : 'Ücretsiz başlayın, büyüdükçe yükseltin. Gizli ücret yok.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Free */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
              <div className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">{isEn ? 'Starter' : 'Başlangıç'}</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-[#111827]">$0</span>
              </div>
              <p className="text-xs text-[#F59E0B] font-medium mb-1">{isEn ? '7-day free trial' : '7 gün ücretsiz deneme'}</p>
              <p className="text-xs text-[#9CA3AF] mb-5">{isEn ? 'Credit card required' : 'Kredi kartı gerekli'}</p>
              <ul className="space-y-2 mb-6">
                {[isEn?'20 leads':'20 lead',isEn?'20 emails/month':'20 email/ay',isEn?'25 email reveals/month':'25 email reveal/ay',isEn?'2 SEO articles':'2 SEO makale','CRM Pipeline',isEn?'5 AI uses/day':'5 AI/gün',isEn?'1 user':'1 kullanıcı'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#374151]">
                    <svg className="w-3.5 h-3.5 text-[#2563EB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg py-2.5 hover:bg-[#EFF6FF] transition-colors">
                {isEn ? 'Start Trial' : 'Denemeye Başla'}
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white border-2 border-[#2563EB] rounded-xl p-6 relative shadow-sm shadow-blue-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white bg-[#2563EB] rounded-full px-3 py-0.5">
                {isEn ? 'Popular' : 'Popüler'}
              </div>
              <div className="text-xs font-medium text-[#2563EB] uppercase tracking-wider mb-3">Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-[#111827]">$25</span>
                <span className="text-sm text-[#9CA3AF]">/{isEn ? 'mo' : 'ay'}</span>
              </div>
              <p className="text-xs text-[#059669] font-medium mb-5">{isEn ? '$250/year (save $50)' : '$250/yıl ($50 tasarruf)'}</p>
              <ul className="space-y-2 mb-6">
                {[isEn?'500 leads':'500 lead',isEn?'200 emails/month':'200 email/ay',isEn?'300 email reveals/month':'300 email reveal/ay',isEn?'10 SEO articles':'10 SEO makale',isEn?'Unlimited AI':'Sınırsız AI','Email Finder',isEn?'Competitor Analysis':'Rakip Analizi'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#374151]">
                    <svg className="w-3.5 h-3.5 text-[#2563EB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg py-2.5 transition-colors">
                {isEn ? 'Get Started' : 'Başla'}
              </Link>
            </div>

            {/* Growth */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
              <div className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Growth</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-[#111827]">$40</span>
                <span className="text-sm text-[#9CA3AF]">/{isEn ? 'mo' : 'ay'}</span>
              </div>
              <p className="text-xs text-[#059669] font-medium mb-5">{isEn ? '$400/year (save $80)' : '$400/yıl ($80 tasarruf)'}</p>
              <ul className="space-y-2 mb-6">
                {[isEn?'Unlimited leads':'Sınırsız lead',isEn?'Unlimited emails':'Sınırsız email',isEn?'1,500 email reveals/month':'1.500 email reveal/ay',isEn?'Unlimited SEO':'Sınırsız SEO',isEn?'All Pro features':'Tüm Pro',isEn?'API access':'API erişimi',isEn?'Dedicated support':'Özel destek'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#374151]">
                    <svg className="w-3.5 h-3.5 text-[#2563EB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg py-2.5 hover:bg-[#EFF6FF] transition-colors">
                {isEn ? 'Get Started' : 'Başla'}
              </Link>
            </div>

            {/* Team */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
              <div className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Team</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-[#111827]">$35</span>
                <span className="text-sm text-[#9CA3AF]">/{isEn ? 'user/mo' : 'kullanıcı/ay'}</span>
              </div>
              <p className="text-xs text-[#059669] font-medium mb-5">{isEn ? 'Min. 3 users ($105/mo)' : 'Min. 3 kullanıcı ($105/ay)'}</p>
              <ul className="space-y-2 mb-6">
                {[isEn?'All Growth features':'Tüm Growth',isEn?'1,000 reveals/user/month':'1.000 reveal/kullanıcı/ay',isEn?'Team collaboration':'Ekip işbirliği',isEn?'Shared pipeline':'Ortak pipeline',isEn?'Role-based access':'Rol bazlı erişim',isEn?'Admin panel':'Yönetici paneli',isEn?'Account manager':'Hesap yöneticisi'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-[#374151]">
                    <svg className="w-3.5 h-3.5 text-[#2563EB] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg py-2.5 hover:bg-[#EFF6FF] transition-colors">
                {isEn ? 'Contact Sales' : 'Satışa Ulaşın'}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
            <svg className="w-4 h-4 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {isEn ? '256-bit SSL encryption. Payments by Lemon Squeezy.' : '256-bit SSL şifreleme. Ödemeler Lemon Squeezy ile.'}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 relative overflow-hidden">
        {/* Left icon - rocket */}
        <div className="absolute left-4 xl:left-20 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 7s ease-in-out infinite' }}>
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shadow-sm">
            <svg className="w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
        </div>
        {/* Right icon - arrow trending */}
        <div className="absolute right-4 xl:right-20 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block" style={{ animation: 'float 8s ease-in-out infinite 1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shadow-sm">
            <svg className="w-7 h-7 text-[#0284C7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-[#2563EB] mb-4 tracking-tight">
            {isEn ? 'Ready to grow your startup?' : "Startup'ınızı büyütmeye hazır mısınız?"}
          </h2>
          <p className="text-sm text-[#6B7280] mb-8">
            {isEn ? '7-day free trial. Corporate email required.' : '7 gün ücretsiz deneme. Kurumsal email gerekli.'}
          </p>
          <Link
            to="/register"
            className="inline-block text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg px-8 py-3 transition-colors shadow-sm shadow-blue-500/20"
          >
            {isEn ? 'Start Free Trial' : 'Ücretsiz Deneyin'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
                <span className="text-sm font-bold text-[#111827]">AskDesk</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {isEn
                  ? 'All-in-one growth platform for startups. Find customers, create campaigns, manage your pipeline.'
                  : "Startup'lar için hepsi bir arada büyüme platformu. Müşteri bulun, kampanya oluşturun, pipeline'ınızı yönetin."}
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-3">{isEn ? 'Product' : 'Ürün'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li><a href="#features" className="hover:text-[#111827] transition-colors">Outreach</a></li>
                <li><a href="#features" className="hover:text-[#111827] transition-colors">Lead Generation</a></li>
                <li><a href="#features" className="hover:text-[#111827] transition-colors">CRM Pipeline</a></li>
                <li><a href="#features" className="hover:text-[#111827] transition-colors">{isEn ? 'SEO Content' : 'SEO İçerik'}</a></li>
                <li><a href="#features" className="hover:text-[#111827] transition-colors">Analytics</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827] uppercase tracking-wider mb-3">{isEn ? 'Company' : 'Şirket'}</div>
              <ul className="space-y-2 text-xs text-[#6B7280]">
                <li>
                  <a href="https://www.ataolai.tech/" target="_blank" rel="noopener noreferrer" className="hover:text-[#111827] transition-colors">ATAOL AI Techs</a>
                </li>
                <li>
                  <a href="mailto:info@ataolai.tech" className="hover:text-[#111827] transition-colors">info@ataolai.tech</a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/company/ataol-ai-techs/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[#111827] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                </li>
                <li>{isEn ? 'ITU ARI Teknokent, Maslak/Istanbul' : 'İTÜ Arı Teknokent, Maslak/İstanbul'}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#E5E7EB] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-[#9CA3AF]">
              2026 AskDesk. Powered by <a href="https://www.ataolai.tech/" target="_blank" rel="noopener noreferrer" className="hover:text-[#6B7280] transition-colors">ATAOL AI Techs</a>
            </span>
            <span className="text-xs text-[#9CA3AF]">{isEn ? 'All rights reserved.' : 'Tüm hakları saklıdır.'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
