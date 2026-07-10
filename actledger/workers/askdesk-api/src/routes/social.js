import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const social = new Hono()
social.use('*', authMiddleware)

// GET / — list social_posts
social.get('/', async (c) => {
  const userId = c.get('userId')
  const { platform, status } = c.req.query()

  let sql = 'SELECT * FROM social_posts WHERE user_id = ?'
  const params = [userId]

  if (platform) {
    sql += ' AND platform = ?'
    params.push(platform)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  sql += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ posts: result.results })
})

// POST / — create post
social.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO social_posts (id, user_id, platform, content, hashtags, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userId,
    body.platform || null,
    body.content || null,
    body.hashtags || null,
    body.status || 'draft',
    body.scheduled_at || null
  ).run()

  return c.json({ id }, 201)
})

// GET /:id — single post
social.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const post = await c.env.DB.prepare('SELECT * FROM social_posts WHERE id = ?').bind(id).first()
  if (!post) return c.json({ error: 'Post bulunamadı' }, 404)
  if (post.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ post })
})

// PUT /:id — update post
social.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const post = await c.env.DB.prepare('SELECT user_id FROM social_posts WHERE id = ?').bind(id).first()
  if (!post) return c.json({ error: 'Post bulunamadı' }, 404)
  if (post.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    `UPDATE social_posts SET
      platform = COALESCE(?, platform),
      content = COALESCE(?, content),
      hashtags = COALESCE(?, hashtags),
      status = COALESCE(?, status),
      scheduled_at = COALESCE(?, scheduled_at),
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.platform ?? null,
    body.content ?? null,
    body.hashtags ?? null,
    body.status ?? null,
    body.scheduled_at ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// DELETE /:id — delete post
social.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const post = await c.env.DB.prepare('SELECT user_id FROM social_posts WHERE id = ?').bind(id).first()
  if (!post) return c.json({ error: 'Post bulunamadı' }, 404)
  if (post.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM social_posts WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
})

export default social
