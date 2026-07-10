import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const emailSettings = new Hono()
emailSettings.use('*', authMiddleware)

// GET / - get user's email settings (mask smtp_pass)
emailSettings.get('/', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare('SELECT * FROM email_settings WHERE user_id = ?').bind(userId).first()
  if (!row) return c.json({ settings: null })
  const masked = {
    ...row,
    smtp_pass: row.smtp_pass ? '****' + row.smtp_pass.slice(-4) : null,
  }
  return c.json({ settings: masked })
})

// POST / - create settings
emailSettings.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(`
    INSERT INTO email_settings (id, user_id, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    body.smtp_host || null,
    body.smtp_port || 587,
    body.smtp_user || null,
    body.smtp_pass || null,
    body.from_name || null,
    body.from_email || null
  ).run()

  return c.json({ ok: true }, 201)
})

// PUT / - update settings
emailSettings.put('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  const existing = await c.env.DB.prepare('SELECT id FROM email_settings WHERE user_id = ?').bind(userId).first()
  if (!existing) return c.json({ error: 'Ayarlar bulunamadi. Once POST ile olusturun.' }, 404)

  // Only update smtp_pass if a real value is provided (not masked)
  const passPart = body.smtp_pass && !body.smtp_pass.startsWith('****')
    ? ', smtp_pass = ?'
    : ''

  const params = [
    body.smtp_host || null,
    body.smtp_port || 587,
    body.smtp_user || null,
    body.from_name || null,
    body.from_email || null,
  ]
  if (passPart) params.push(body.smtp_pass)
  params.push(userId)

  await c.env.DB.prepare(`
    UPDATE email_settings SET
      smtp_host = ?,
      smtp_port = ?,
      smtp_user = ?,
      from_name = ?,
      from_email = ?
      ${passPart}
    WHERE user_id = ?
  `).bind(...params).run()

  return c.json({ ok: true })
})

// POST /test - send test email to user's own address
emailSettings.post('/test', async (c) => {
  const userId = c.get('userId')

  const settings = await c.env.DB.prepare('SELECT * FROM email_settings WHERE user_id = ?').bind(userId).first()
  if (!settings) return c.json({ error: 'Email ayarlari yapilandirilmamis.' }, 400)
  if (!settings.from_email) return c.json({ error: 'Gonderici email adresi eksik.' }, 400)

  // Attempt MailChannels (free for CF Workers, may require domain verification)
  // If MailChannels is unavailable, use Resend or any transactional API
  try {
    const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: settings.from_email, name: settings.from_name || '' }] }],
        from: { email: settings.from_email, name: settings.from_name || '' },
        subject: 'AskDesk - Test Emaili',
        content: [{ type: 'text/plain', value: 'Bu bir test emailidir. Email ayarlariniz basariyla yapilandirilmistir.' }],
      }),
    })

    if (!mailRes.ok) {
      const errText = await mailRes.text()
      return c.json({ error: 'Test email gonderilemedi: ' + errText }, 500)
    }

    return c.json({ ok: true, message: 'Test emaili gonderildi: ' + settings.from_email })
  } catch (err) {
    return c.json({ error: 'Email servisi hatasi: ' + err.message }, 500)
  }
})

export default emailSettings
