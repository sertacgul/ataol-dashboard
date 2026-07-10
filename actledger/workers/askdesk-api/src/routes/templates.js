import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const templates = new Hono()
templates.use('*', authMiddleware)

// GET / — list templates
templates.get('/', async (c) => {
  const userId = c.get('userId')
  const { category, platform } = c.req.query()

  let sql = 'SELECT * FROM templates WHERE user_id = ?'
  const params = [userId]

  if (category) {
    sql += ' AND category = ?'
    params.push(category)
  }
  if (platform) {
    sql += ' AND platform = ?'
    params.push(platform)
  }

  sql += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ templates: result.results })
})

// POST / — create template
templates.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO templates (id, user_id, category, platform, name, content, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    body.category || null,
    body.platform || null,
    body.name || null,
    body.content || null,
    body.tags || null
  ).run()

  return c.json({ id }, 201)
})

// GET /:id — single template
templates.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Şablon bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ template: item })
})

// PUT /:id — update template
templates.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const item = await c.env.DB.prepare('SELECT user_id FROM templates WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Şablon bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    `UPDATE templates SET
      category = COALESCE(?, category),
      platform = COALESCE(?, platform),
      name = COALESCE(?, name),
      content = COALESCE(?, content),
      tags = COALESCE(?, tags),
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.category ?? null,
    body.platform ?? null,
    body.name ?? null,
    body.content ?? null,
    body.tags ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// DELETE /:id — delete template
templates.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT user_id FROM templates WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Şablon bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
})

export default templates
