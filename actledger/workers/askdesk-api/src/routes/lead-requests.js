import { Hono } from 'hono'
import { sendEmail } from '../lib/mail.js'

// Public (no auth) capture endpoint for the concierge "done-for-you lead list"
// landing form. Stores the request and emails the team so they can fulfil it.
const leadRequests = new Hono()

const NOTIFY_TO = 'captsertacgul@gmail.com'

leadRequests.post('/', async (c) => {
  const b = await c.req.json().catch(() => ({}))

  // Honeypot: real users leave this hidden field empty; bots fill it.
  if (b.website) return c.json({ ok: true })

  const name = String(b.name || '').trim()
  const email = String(b.email || '').trim()
  if (!name || !email || !email.includes('@')) {
    return c.json({ error: 'Ad ve geçerli bir e-posta gerekli' }, 400)
  }

  const fields = {
    company: String(b.company || '').trim() || null,
    sector: String(b.sector || '').trim() || null,
    region: String(b.region || '').trim() || null,
    titles: String(b.titles || '').trim() || null,
    quantity: String(b.quantity || '').trim() || null,
    notes: String(b.notes || '').trim() || null,
  }

  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare(
      `INSERT INTO lead_requests (id, name, email, company, sector, region, titles, quantity, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, name, email, fields.company, fields.sector, fields.region, fields.titles, fields.quantity, fields.notes).run()
  } catch { /* table not migrated yet; still notify so no request is lost */ }

  const row = (label, value) => value
    ? `<tr><td style="padding:4px 12px 4px 0;color:#6B7280;font-size:13px;">${label}</td><td style="padding:4px 0;color:#111827;font-size:13px;">${value}</td></tr>`
    : ''
  await sendEmail(c.env, {
    to: NOTIFY_TO,
    subject: `Yeni lead listesi talebi: ${name}${fields.company ? ' · ' + fields.company : ''}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 12px;">Yeni concierge lead listesi talebi</p>
        <table style="border-collapse:collapse;">
          ${row('Ad', name)}
          ${row('E-posta', email)}
          ${row('Firma', fields.company)}
          ${row('Sektör', fields.sector)}
          ${row('Bölge', fields.region)}
          ${row('Hedef unvanlar', fields.titles)}
          ${row('Adet', fields.quantity)}
          ${row('Not', fields.notes)}
        </table>
      </div>
    `,
  })

  return c.json({ ok: true })
})

export default leadRequests
