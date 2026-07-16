import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const CreditsContext = createContext(null)

// Holds the user's live credit balance and keeps it in sync. The balance is
// loaded once on mount and then updated instantly whenever a credit-spending
// endpoint echoes a fresh `credits` snapshot (see api.onCredits). No page
// refresh, no per-caller wiring.
export function CreditsProvider({ children }) {
  const [credits, setCredits] = useState(null)

  const refreshCredits = useCallback(async () => {
    try {
      const data = await api.get('/email-finder/credits')
      setCredits(data)
    } catch {
      setCredits(null)
    }
  }, [])

  useEffect(() => {
    refreshCredits()
    api.onCredits(setCredits)
    return () => api.onCredits(null)
  }, [refreshCredits])

  return (
    <CreditsContext.Provider value={{ credits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  const ctx = useContext(CreditsContext)
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider')
  return ctx
}
