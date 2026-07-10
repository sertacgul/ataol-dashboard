import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<div className="text-sm text-[#6B7280]">Dashboard içeriği gelecek</div>} />
        <Route path="outreach" element={<div className="text-sm text-[#6B7280]">Outreach içeriği gelecek</div>} />
        <Route path="leads" element={<div className="text-sm text-[#6B7280]">Leads içeriği gelecek</div>} />
        <Route path="leads/new" element={<div>Yeni Lead</div>} />
        <Route path="leads/maps" element={<div>Maps</div>} />
        <Route path="leads/:id" element={<div>Lead Detay</div>} />
        <Route path="pipeline" element={<div className="text-sm text-[#6B7280]">Pipeline içeriği gelecek</div>} />
        <Route path="settings" element={<div className="text-sm text-[#6B7280]">Ayarlar içeriği gelecek</div>} />
        <Route path="outreach/new" element={<div>Yeni Outreach</div>} />
        <Route path="outreach/:id" element={<div>Outreach Detay</div>} />
      </Route>
    </Routes>
  )
}

export default App
