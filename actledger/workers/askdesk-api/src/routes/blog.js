import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const blog = new Hono()
blog.use('*', authMiddleware)

// GET / - get blog settings (mask api_password)
blog.get('/', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare('SELECT * FROM blog_settings WHERE user_id = ?').bind(userId).first()
  if (!row) return c.json({ settings: null })
  const masked = {
    ...row,
    api_password: row.api_password ? '****' + row.api_password.slice(-4) : null,
  }
  return c.json({ settings: masked })
})

// POST / - create blog settings
blog.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(`
    INSERT INTO blog_settings (id, user_id, platform, blog_url, api_username, api_password)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    body.platform || 'wordpress',
    body.blog_url || null,
    body.api_username || null,
    body.api_password || null
  ).run()

  return c.json({ ok: true }, 201)
})

// PUT / - update blog settings
blog.put('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  const existing = await c.env.DB.prepare('SELECT id FROM blog_settings WHERE user_id = ?').bind(userId).first()
  if (!existing) return c.json({ error: 'Ayarlar bulunamadi. Once POST ile olusturun.' }, 404)

  // Only update api_password if a real value is provided (not masked)
  const passPart = body.api_password && !body.api_password.startsWith('****')
    ? ', api_password = ?'
    : ''

  const params = [
    body.platform || 'wordpress',
    body.blog_url || null,
    body.api_username || null,
  ]
  if (passPart) params.push(body.api_password)
  params.push(userId)

  await c.env.DB.prepare(`
    UPDATE blog_settings SET
      platform = ?,
      blog_url = ?,
      api_username = ?
      ${passPart}
    WHERE user_id = ?
  `).bind(...params).run()

  return c.json({ ok: true })
})

// POST /publish - publish SEO article to WordPress
blog.post('/publish', async (c) => {
  const userId = c.get('userId')
  const { article_id } = await c.req.json()

  const settings = await c.env.DB.prepare('SELECT * FROM blog_settings WHERE user_id = ?').bind(userId).first()
  if (!settings) return c.json({ error: 'Blog ayarlari yapilandirilmamis. Ayarlar sayfasindan blog bilgilerinizi girin.' }, 400)
  if (!settings.blog_url) return c.json({ error: 'Blog URL eksik.' }, 400)

  const article = await c.env.DB.prepare('SELECT * FROM seo_articles WHERE id = ? AND user_id = ?').bind(article_id, userId).first()
  if (!article) return c.json({ error: 'Makale bulunamadi.' }, 404)
  if (!article.body_tr) return c.json({ error: 'Makalede Turkce icerik bulunamadi.' }, 400)

  // WordPress REST API publish
  const wpUrl = settings.blog_url.replace(/\/$/, '') + '/wp-json/wp/v2/posts'
  const auth = btoa(settings.api_username + ':' + settings.api_password)

  const res = await fetch(wpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + auth,
    },
    body: JSON.stringify({
      title: article.title || article.topic,
      content: article.body_tr,
      status: 'publish',
      meta: {
        _yoast_wpseo_title: article.meta_title || '',
        _yoast_wpseo_metadesc: article.meta_description || '',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return c.json({ error: 'WordPress yayin hatasi: ' + err }, 502)
  }

  const post = await res.json()
  return c.json({ ok: true, url: post.link, id: post.id })
})

export default blog
