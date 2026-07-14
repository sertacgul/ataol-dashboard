import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const outreach = new Hono()
outreach.use('*', authMiddleware)

outreach.get('/', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { status } = c.req.query()

  let sql = `
    SELECT e.*, co.name AS company_name, ct.name AS contact_name
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
    SELECT e.*, co.name AS company_name, ct.name AS contact_name
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

// Email sending is disabled until a real, domain-authenticated provider is wired.
// MailChannels' free Workers tier was discontinued (returns 401), so sending
// does not work. We must NOT pretend an email was sent.
const SENDING_ENABLED = false

outreach.post('/:id/send', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const email = await c.env.DB.prepare(`
    SELECT e.*, ct.email as contact_email, ct.name as contact_name
    FROM emails e
    LEFT JOIN contacts ct ON e.contact_id = ct.id
    WHERE e.id = ?
  `).bind(id).first()
  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  // Sending is under maintenance: never mark as sent, never fail silently.
  if (!SENDING_ENABLED) {
    return c.json({
      error: 'E-posta gönderimi şu anda bakımda. E-postanızı kopyalayabilir veya dışa aktarabilirsiniz.',
      maintenance: true,
    }, 503)
  }

  if (!email.contact_email) return c.json({ error: 'Alıcı email adresi bulunamadı. Lütfen iletişim kişisi ekleyin.' }, 400)

  const settings = await c.env.DB.prepare('SELECT * FROM email_settings WHERE user_id = ?').bind(userId).first()
  if (!settings) return c.json({ error: 'Email ayarları yapılandırılmamış. Ayarlar sayfasından SMTP bilgilerinizi girin.' }, 400)

  // Attempt to send. On ANY failure, mark 'failed' with the reason — never 'sent'.
  let sendError = null
  try {
    const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.contact_email, name: email.contact_name || '' }] }],
        from: { email: settings.from_email, name: settings.from_name || '' },
        subject: email.subject,
        content: [{ type: 'text/plain', value: email.body }],
      }),
    })
    if (!mailRes.ok) {
      sendError = `HTTP ${mailRes.status}: ${(await mailRes.text()).slice(0, 300)}`
    }
  } catch (e) {
    sendError = e?.message || 'E-posta servisine erişilemedi'
  }

  if (sendError) {
    await c.env.DB.prepare("UPDATE emails SET status = 'failed', error = ? WHERE id = ?").bind(sendError, id).run()
    return c.json({ error: 'E-posta gönderilemedi: ' + sendError }, 502)
  }

  await c.env.DB.prepare(
    "UPDATE emails SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?"
  ).bind(id).run()
  return c.json({ ok: true })
})

outreach.get('/:id/track', async (c) => {
  const id = c.req.param('id')

  await c.env.DB.prepare(
    'UPDATE emails SET opened = 1 WHERE id = ?'
  ).bind(id).run()

  const gif = new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])
  return new Response(gif, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
})

export default outreach
