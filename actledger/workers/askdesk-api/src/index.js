import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import leadsRoutes from './routes/leads.js'
import outreachRoutes from './routes/outreach.js'
import aiRoutes from './routes/ai.js'
import pipelineRoutes from './routes/pipeline.js'
import mapsRoutes from './routes/maps.js'
import profileRoutes from './routes/profile.js'
import seoRoutes from './routes/seo.js'
import socialRoutes from './routes/social.js'
import newsletterRoutes from './routes/newsletter.js'
import templatesRoutes from './routes/templates.js'

const app = new Hono()

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return 'https://askdesk.app'
    if (origin.includes('askdesk') || origin.includes('localhost')) return origin
    return 'https://askdesk.app'
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.route('/auth', authRoutes)
app.route('/dashboard', dashboardRoutes)
app.route('/leads', leadsRoutes)
app.route('/outreach', outreachRoutes)
app.route('/ai', aiRoutes)
app.route('/pipeline', pipelineRoutes)
app.route('/maps', mapsRoutes)
app.route('/profile', profileRoutes)
app.route('/seo', seoRoutes)
app.route('/social', socialRoutes)
app.route('/newsletter', newsletterRoutes)
app.route('/templates', templatesRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
