import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import LeadList from './pages/leads/LeadList'
import LeadNew from './pages/leads/LeadNew'
import LeadDetail from './pages/leads/LeadDetail'
import LeadMaps from './pages/leads/LeadMaps'
import OutreachList from './pages/outreach/OutreachList'
import OutreachNew from './pages/outreach/OutreachNew'
import OutreachDetail from './pages/outreach/OutreachDetail'
import Pipeline from './pages/pipeline/Pipeline'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import SeoList from './pages/seo/SeoList'
import SeoNew from './pages/seo/SeoNew'
import SeoDetail from './pages/seo/SeoDetail'
import SocialList from './pages/social/SocialList'
import SocialNew from './pages/social/SocialNew'
import NewsletterList from './pages/newsletter/NewsletterList'
import NewsletterNew from './pages/newsletter/NewsletterNew'
import NewsletterDetail from './pages/newsletter/NewsletterDetail'
import TemplateList from './pages/templates/TemplateList'
import TemplateNew from './pages/templates/TemplateNew'
import Calendar from './pages/calendar/Calendar'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="outreach" element={<OutreachList />} />
        <Route path="outreach/new" element={<OutreachNew />} />
        <Route path="outreach/:id" element={<OutreachDetail />} />
        <Route path="leads" element={<LeadList />} />
        <Route path="leads/new" element={<LeadNew />} />
        <Route path="leads/maps" element={<LeadMaps />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="seo" element={<SeoList />} />
        <Route path="seo/new" element={<SeoNew />} />
        <Route path="seo/:id" element={<SeoDetail />} />
        <Route path="social" element={<SocialList />} />
        <Route path="social/new" element={<SocialNew />} />
        <Route path="newsletter" element={<NewsletterList />} />
        <Route path="newsletter/new" element={<NewsletterNew />} />
        <Route path="newsletter/:id" element={<NewsletterDetail />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="templates/new" element={<TemplateNew />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
        <Route path="onboarding" element={<Onboarding />} />
      </Route>
    </Routes>
  )
}

export default App
