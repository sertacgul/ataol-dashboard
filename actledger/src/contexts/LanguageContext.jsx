import { createContext, useContext, useState, useCallback } from 'react'
import { translations, LANGUAGES } from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('askdesk_lang') || 'tr' } catch { return 'tr' }
  })

  const changeLang = useCallback((newLang) => {
    setLang(newLang)
    try { localStorage.setItem('askdesk_lang', newLang) } catch {}
  }, [])

  const t = useCallback((key) => {
    if (lang === 'tr') return key
    return translations[lang]?.[key] || translations.en?.[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
