import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading, hasProfile } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!hasProfile && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />
  }

  return children
}
