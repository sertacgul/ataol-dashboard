import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const bmc = new Hono()
bmc.use('*', authMiddleware)

bmc.get('/', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare(
    'SELECT * FROM bmc_items WHERE user_id = ?'
  ).bind(userId).first()
  return c.json({ bmc: row || null })
})

bmc.post('/', async (c) => {
  const userId = c.get('userId')
  const existing = await c.env.DB.prepare(
    'SELECT id FROM bmc_items WHERE user_id = ?'
  ).bind(userId).first()
  if (existing) return c.json({ error: 'BMC zaten mevcut' }, 409)

  const body = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO bmc_items (id, user_id, data) VALUES (?, ?, ?)`
  ).bind(id, userId, JSON.stringify(body.data)).run()

  return c.json({ id }, 201)
})

bmc.put('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  await c.env.DB.prepare(
    `UPDATE bmc_items SET data = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).bind(JSON.stringify(body.data), userId).run()

  return c.json({ ok: true })
})

export default bmc
