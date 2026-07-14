import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then(async (data) => {
        setUser(data.user)
        if (data.user) {
          try {
            const profileData = await api.get('/profile')
            setProfile(profileData.profile)
          } catch {
            setProfile(null)
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    setUser(data)
    try {
      const profileData = await api.get('/profile')
      setProfile(profileData.profile)
    } catch {
      setProfile(null)
    }
    return data
  }

  async function register(email, password, name, company_name, discountCode, termsAccepted) {
    const data = await api.post('/auth/register', { email, password, name, company_name, discount_code: discountCode || undefined, terms_accepted: !!termsAccepted })
    setUser(data)
    setProfile(null)
    return data
  }

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, profile, setProfile, hasProfile: !!profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
