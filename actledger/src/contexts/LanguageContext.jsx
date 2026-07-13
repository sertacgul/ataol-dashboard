import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { translations, LANGUAGES } from '../lib/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('askdesk_lang') || 'tr' } catch { return 'tr' }
  })

  // Keep <html lang> in sync so CSS text-transform: uppercase uses the right
  // locale casing (Turkish maps i->İ; every other language must give i->I).
  useEffect(() => {
    try { document.documentElement.lang = lang } catch {}
  }, [lang])

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
