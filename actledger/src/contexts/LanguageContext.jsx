import { createContext, useContext, useState, useCallback } from 'react'
import { en } from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('askdesk_lang') || 'tr' } catch { return 'tr' }
  })

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'tr' ? 'en' : 'tr'
      try { localStorage.setItem('askdesk_lang', next) } catch {}
      return next
    })
  }, [])

  const t = useCallback((key) => {
    if (lang === 'en') return en[key] || key
    return key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
