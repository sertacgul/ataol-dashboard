import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const dashboard = new Hono()
dashboard.use('*', authMiddleware)

dashboard.get('/stats', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const isSuper = role === 'superadmin'
  const where = isSuper ? '' : 'WHERE user_id = ?'
  const bind = isSuper ? [] : [userId]

  const [companies, emails, sent] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM companies ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where ? where + ' AND' : 'WHERE'} status = 'sent'`).bind(...bind).first(),
  ])

  const recentEmails = await c.env.DB.prepare(
    `SELECT e.id, e.subject, e.status, e.created_at, c.name as company_name
     FROM emails e LEFT JOIN companies c ON e.company_id = c.id
     ${where ? 'WHERE e.user_id = ?' : ''}
     ORDER BY e.created_at DESC LIMIT 5`
  ).bind(...bind).all()

  return c.json({
    total_leads: companies.count,
    total_emails: emails.count,
    total_sent: sent.count,
    recent_emails: recentEmails.results,
  })
})

export default dashboard
