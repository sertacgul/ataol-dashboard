import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const pipeline = new Hono()
pipeline.use('*', authMiddleware)

const DEFAULT_STAGES = ['İletişim Kuruldu', 'Yanıt Geldi', 'Toplantı', 'Anlaşma']

pipeline.get('/', async (c) => {
  const userId = c.get('userId')

  let stages = await c.env.DB.prepare(
    'SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position ASC'
  ).bind(userId).all()

  if (!stages.results.length) {
    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const id = crypto.randomUUID()
      await c.env.DB.prepare(
        'INSERT INTO pipeline_stages (id, user_id, name, position) VALUES (?, ?, ?, ?)'
      ).bind(id, userId, DEFAULT_STAGES[i], i).run()
    }
    stages = await c.env.DB.prepare(
      'SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position ASC'
    ).bind(userId).all()
  }

  const items = await c.env.DB.prepare(
    `SELECT pi.*, c.name AS company_name, c.sector, c.country
     FROM pipeline_items pi
     JOIN companies c ON c.id = pi.company_id
     WHERE pi.user_id = ?
     ORDER BY pi.created_at DESC`
  ).bind(userId).all()

  return c.json({ stages: stages.results, items: items.results })
})

pipeline.post('/items', async (c) => {
  const userId = c.get('userId')
  const { company_id, stage_id, notes } = await c.req.json()
  if (!company_id || !stage_id) return c.json({ error: 'company_id ve stage_id gerekli' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO pipeline_items (id, user_id, company_id, stage_id, notes) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, userId, company_id, stage_id, notes || null).run()

  return c.json({ id }, 201)
})

pipeline.put('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { stage_id, notes } = await c.req.json()

  const item = await c.env.DB.prepare('SELECT user_id FROM pipeline_items WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Öğe bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    'UPDATE pipeline_items SET stage_id = ?, notes = ? WHERE id = ?'
  ).bind(stage_id, notes !== undefined ? notes : null, id).run()

  return c.json({ ok: true })
})

pipeline.delete('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const item = await c.env.DB.prepare('SELECT user_id FROM pipeline_items WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Öğe bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM pipeline_items WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default pipeline
