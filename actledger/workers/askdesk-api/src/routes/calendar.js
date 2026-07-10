import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const calendar = new Hono()
calendar.use('*', authMiddleware)

// GET /?month=YYYY-MM — list calendar items for month
calendar.get('/', async (c) => {
  const userId = c.get('userId')
  const month = c.req.query('month') || ''

  let result
  if (month) {
    result = await c.env.DB.prepare(
      `SELECT * FROM calendar_items WHERE user_id = ? AND scheduled_date LIKE ? ORDER BY scheduled_date ASC`
    ).bind(userId, `${month}%`).all()
  } else {
    result = await c.env.DB.prepare(
      `SELECT * FROM calendar_items WHERE user_id = ? ORDER BY scheduled_date ASC`
    ).bind(userId).all()
  }

  return c.json({ items: result.results })
})

// POST / — create calendar item
calendar.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO calendar_items (id, user_id, title, type, reference_id, scheduled_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    body.title || null,
    body.type || null,
    body.reference_id || null,
    body.scheduled_date || null,
    body.notes || null,
    body.status || 'planned'
  ).run()

  return c.json({ id }, 201)
})

// PUT /:id — update calendar item
calendar.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const item = await c.env.DB.prepare(
    'SELECT user_id FROM calendar_items WHERE id = ?'
  ).bind(id).first()
  if (!item) return c.json({ error: 'Kayıt bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    `UPDATE calendar_items SET
      title = COALESCE(?, title),
      scheduled_date = COALESCE(?, scheduled_date),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.title ?? null,
    body.scheduled_date ?? null,
    body.status ?? null,
    body.notes ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// DELETE /:id — delete calendar item
calendar.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare(
    'SELECT user_id FROM calendar_items WHERE id = ?'
  ).bind(id).first()
  if (!item) return c.json({ error: 'Kayıt bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM calendar_items WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
})

export default calendar
