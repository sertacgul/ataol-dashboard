import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import LeadList from './pages/leads/LeadList'
import LeadNew from './pages/leads/LeadNew'
import LeadDetail from './pages/leads/LeadDetail'
import OutreachList from './pages/outreach/OutreachList'
import OutreachNew from './pages/outreach/OutreachNew'
import OutreachDetail from './pages/outreach/OutreachDetail'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="outreach" element={<OutreachList />} />
        <Route path="outreach/new" element={<OutreachNew />} />
        <Route path="outreach/:id" element={<OutreachDetail />} />
        <Route path="leads" element={<LeadList />} />
        <Route path="leads/new" element={<LeadNew />} />
        <Route path="leads/maps" element={<div className="text-sm text-[#6B7280]">Maps içeriği gelecek</div>} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<div className="text-sm text-[#6B7280]">Pipeline içeriği gelecek</div>} />
        <Route path="settings" element={<div className="text-sm text-[#6B7280]">Ayarlar içeriği gelecek</div>} />
      </Route>
    </Routes>
  )
}

export default App
