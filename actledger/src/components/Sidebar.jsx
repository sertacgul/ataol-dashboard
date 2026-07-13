import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useT } from '../contexts/LanguageContext'
import { api } from '../lib/api'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { to: '/app/outreach', label: 'Outreach', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { to: '/app/leads', label: 'Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/app/email-finder', label: 'Email Bulucu', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7' },
  { to: '/app/pipeline', label: 'Pipeline', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
]

const secondaryItems = [
  { to: '/app/leads/maps', label: 'Maps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/app/guide', label: 'Kılavuz', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
]

const settingsItem = { to: '/app/settings', label: 'Ayarlar', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }

const contentItems = [
  { to: '/app/seo', label: 'SEO İçerik', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/app/social', label: 'Sosyal Medya', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { to: '/app/newsletter', label: 'Newsletter', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
  { to: '/app/templates', label: 'Şablonlar', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/app/calendar', label: 'Takvim', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

const analyticsItems = [
  { to: '/app/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/app/simulator', label: 'Simülatör', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { to: '/app/bmc', label: 'BMC', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/app/competitors', label: 'Rakip Analizi', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
]

function NavIcon({ d }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function NavItem({ to, label, icon, t, onNavigate }) {
  return (
    <NavLink to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
          isActive ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
        }`
      }>
      <NavIcon d={icon} />
      {t ? t(label) : label}
    </NavLink>
  )
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, logout } = useAuth()
  const { t, lang, changeLang, languages } = useT()
  const navigate = useNavigate()
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    async function loadCredits() {
      try {
        const data = await api.get('/email-finder/credits')
        setCredits(data)
      } catch {
        setCredits(null)
      }
    }
    loadCredits()
  }, [])

  async function handleLogout() {
    onClose()
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`w-56 bg-[#FAFBFC] border-r border-[#E5E7EB] flex flex-col fixed md:static inset-y-0 left-0 z-50 h-screen md:h-auto md:min-h-screen transform transition-transform duration-300 ease-out md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="px-4 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
            <span className="text-sm font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </div>
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            className="text-[11px] font-medium pl-1.5 pr-1 py-1 rounded border border-[#E5E7EB] text-[#6B7280] bg-white hover:bg-[#F3F4F6] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-colors"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => <NavItem key={item.to} {...item} t={t} onNavigate={onClose} />)}
        <div className="my-3 border-t border-[#E5E7EB]" />
        {secondaryItems.map((item) => <NavItem key={item.to} {...item} t={t} onNavigate={onClose} />)}
        <div className="my-3 border-t border-[#E5E7EB]" />
        {contentItems.map((item) => <NavItem key={item.to} {...item} t={t} onNavigate={onClose} />)}
        <div className="my-3 border-t border-[#E5E7EB]" />
        {analyticsItems.map((item) => <NavItem key={item.to} {...item} t={t} onNavigate={onClose} />)}
        <div className="my-3 border-t border-[#E5E7EB]" />
        <NavItem {...settingsItem} t={t} onNavigate={onClose} />
      </nav>
      {credits && (
        <div className="px-3 py-2.5 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#6B7280]">{t('Kredi')}</span>
            <span className="text-[11px] text-[#9CA3AF]">{credits.remaining}/{credits.monthly_limit}</span>
          </div>
          <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.round((credits.used_this_month / credits.monthly_limit) * 100))}%`,
                background: (credits.used_this_month / credits.monthly_limit) > 0.9 ? '#DC2626' : (credits.used_this_month / credits.monthly_limit) > 0.7 ? '#D97706' : '#2563EB',
              }}
            />
          </div>
        </div>
      )}
      <div className="px-3 py-3 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center">
            <span className="text-xs font-semibold text-[#6B7280]">
              {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#111827] truncate">{user?.name}</div>
            <div className="text-xs text-[#9CA3AF]">
              {user?.role === 'superadmin' ? 'Super Admin' : user?.company_name || t('Kullanıcı')}
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#9CA3AF] hover:text-[#6B7280]" title={t('Çıkış')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
