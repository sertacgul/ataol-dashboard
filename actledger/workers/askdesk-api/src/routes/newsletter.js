import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const newsletter = new Hono()
newsletter.use('*', authMiddleware)

// GET / — list newsletters
newsletter.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await c.env.DB.prepare(
    'SELECT * FROM newsletters WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  return c.json({ newsletters: result.results })
})

// POST / — create newsletter
newsletter.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO newsletters (id, user_id, title, body, poster_html, status, published_platforms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    body.title || null,
    body.body || null,
    body.poster_html || null,
    body.status || 'draft',
    body.published_platforms || null
  ).run()

  return c.json({ id }, 201)
})

// GET /:id — single newsletter
newsletter.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT * FROM newsletters WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Bülten bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ newsletter: item })
})

// PUT /:id — update newsletter
newsletter.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const item = await c.env.DB.prepare('SELECT user_id FROM newsletters WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Bülten bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    `UPDATE newsletters SET
      title = COALESCE(?, title),
      body = COALESCE(?, body),
      poster_html = COALESCE(?, poster_html),
      status = COALESCE(?, status),
      published_platforms = COALESCE(?, published_platforms),
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.title ?? null,
    body.body ?? null,
    body.poster_html ?? null,
    body.status ?? null,
    body.published_platforms ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// DELETE /:id — delete newsletter
newsletter.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT user_id FROM newsletters WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Bülten bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM newsletters WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
})

export default newsletter
