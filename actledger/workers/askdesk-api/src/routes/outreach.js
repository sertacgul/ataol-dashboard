import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const outreach = new Hono()
outreach.use('*', authMiddleware)

outreach.get('/', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { status } = c.req.query()

  let sql = `
    SELECT e.*, co.name AS company_name, ct.name AS contact_name, ct.email AS contact_email
    FROM emails e
    LEFT JOIN companies co ON e.company_id = co.id
    LEFT JOIN contacts ct ON e.contact_id = ct.id
  `
  const conditions = []
  const params = []

  if (role !== 'superadmin') {
    conditions.push('e.user_id = ?')
    params.push(userId)
  }
  if (status) {
    conditions.push('e.status = ?')
    params.push(status)
  }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY e.created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ emails: result.results })
})

outreach.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const emailId = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO emails (id, user_id, company_id, contact_id, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    emailId,
    userId,
    body.company_id || null,
    body.contact_id || null,
    body.subject || '',
    body.body || '',
    body.status || 'draft'
  ).run()

  return c.json({ id: emailId }, 201)
})

outreach.get('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const email = await c.env.DB.prepare(`
    SELECT e.*, co.name AS company_name, ct.name AS contact_name, ct.email AS contact_email
    FROM emails e
    LEFT JOIN companies co ON e.company_id = co.id
    LEFT JOIN contacts ct ON e.contact_id = ct.id
    WHERE e.id = ?
  `).bind(id).first()

  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ email })
})

outreach.put('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')
  const body = await c.req.json()

  const email = await c.env.DB.prepare('SELECT user_id FROM emails WHERE id = ?').bind(id).first()
  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(`
    UPDATE emails SET
      subject = COALESCE(?, subject),
      body = COALESCE(?, body),
      status = COALESCE(?, status),
      quality_score = COALESCE(?, quality_score)
    WHERE id = ?
  `).bind(
    body.subject ?? null,
    body.body ?? null,
    body.status ?? null,
    body.quality_score ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// This product does not send email. Users compose and personalize here, then
// send from their own inbox (copy, "Open in Gmail", or CSV export). There is
// no send endpoint and no open tracking — we cannot track what we do not send.
// The "sent" status is set manually by the user via the normal status update.

export default outreach
