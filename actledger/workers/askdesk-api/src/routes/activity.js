import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const activity = new Hono()
activity.use('*', authMiddleware)

activity.get('/', async (c) => {
  const userId = c.get('userId')
  const module = c.req.query('module') || null
  const action = c.req.query('action') || null
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)
  const offset = (page - 1) * limit

  let where = 'WHERE user_id = ?'
  const params = [userId]
  if (module) { where += ' AND module = ?'; params.push(module) }
  if (action) { where += ' AND action = ?'; params.push(action) }

  const rows = await c.env.DB.prepare(
    `SELECT id, module, action, title, created_at FROM activity_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM activity_log ${where}`
  ).bind(...params).all()

  return c.json({ items: rows.results || [], total: countRow.results?.[0]?.total || 0, page, limit })
})

activity.get('/:id', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare('SELECT * FROM activity_log WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId).first()
  if (!row) return c.json({ error: 'Kayıt bulunamadı' }, 404)
  let detail = row.detail
  try { detail = row.detail ? JSON.parse(row.detail) : null } catch { /* keep string */ }
  return c.json({ ...row, detail })
})

export default activity
