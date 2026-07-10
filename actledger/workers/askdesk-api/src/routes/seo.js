import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const seo = new Hono()
seo.use('*', authMiddleware)

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function getProfileContext(db, userId) {
  const p = await db.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()
  if (!p) return ''
  return `Firma: ${p.company_name || ''}\nSektör: ${p.sector || ''}\nAçıklama: ${p.description || ''}\nDeğer Önerisi: ${p.value_proposition || ''}\nHedef Kitle: ${p.target_audience || ''}\nTon: ${p.tone || 'formal'}`
}

async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API hatası')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// GET / — list articles
seo.get('/', async (c) => {
  const userId = c.get('userId')
  const { status } = c.req.query()

  let sql = 'SELECT * FROM seo_articles WHERE user_id = ?'
  const params = [userId]

  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }

  sql += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ articles: result.results })
})

// POST / — create article
seo.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json().catch(() => ({}))
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO seo_articles (id, user_id, title, topic, step, status)
     VALUES (?, ?, ?, ?, 1, 'draft')`
  ).bind(id, userId, body.title || null, body.topic || null).run()

  return c.json({ id }, 201)
})

// GET /:id — get single article
seo.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const article = await c.env.DB.prepare('SELECT * FROM seo_articles WHERE id = ?').bind(id).first()
  if (!article) return c.json({ error: 'Makale bulunamadı' }, 404)
  if (article.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ article })
})

// PUT /:id — update article
seo.put('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const article = await c.env.DB.prepare('SELECT user_id FROM seo_articles WHERE id = ?').bind(id).first()
  if (!article) return c.json({ error: 'Makale bulunamadı' }, 404)
  if (article.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    `UPDATE seo_articles SET
      title = COALESCE(?, title),
      topic = COALESCE(?, topic),
      body_tr = COALESCE(?, body_tr),
      body_en = COALESCE(?, body_en),
      meta_title = COALESCE(?, meta_title),
      meta_description = COALESCE(?, meta_description),
      keywords = COALESCE(?, keywords),
      keyword_density = COALESCE(?, keyword_density),
      seo_score = COALESCE(?, seo_score),
      step = COALESCE(?, step),
      status = COALESCE(?, status),
      updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.title ?? null,
    body.topic ?? null,
    body.body_tr ?? null,
    body.body_en ?? null,
    body.meta_title ?? null,
    body.meta_description ?? null,
    body.keywords ?? null,
    body.keyword_density ?? null,
    body.seo_score ?? null,
    body.step ?? null,
    body.status ?? null,
    id
  ).run()

  return c.json({ ok: true })
})

// DELETE /:id — delete article
seo.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const article = await c.env.DB.prepare('SELECT user_id FROM seo_articles WHERE id = ?').bind(id).first()
  if (!article) return c.json({ error: 'Makale bulunamadı' }, 404)
  if (article.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM seo_articles WHERE id = ?').bind(id).run()

  return c.json({ ok: true })
})

// POST /:id/translate — translate body_tr to body_en
seo.post('/:id/translate', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const article = await c.env.DB.prepare('SELECT * FROM seo_articles WHERE id = ?').bind(id).first()
  if (!article) return c.json({ error: 'Makale bulunamadı' }, 404)
  if (article.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)
  if (!article.body_tr) return c.json({ error: 'Türkçe içerik bulunamadı' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const profileContext = await getProfileContext(c.env.DB, userId)

  const prompt = `Aşağıdaki Türkçe blog yazısını İngilizce'ye çevir. Çeviri profesyonel, akıcı ve SEO uyumlu olsun. Başlık dahil tüm içeriği çevir. Markdown formatını koru.${profileContext ? `\n\nFirma Bağlamı:\n${profileContext}` : ''}\n\nÇevirilecek Türkçe İçerik:\n${article.body_tr}`

  const body_en = await callGemini(prompt, apiKey)

  await c.env.DB.prepare(
    `UPDATE seo_articles SET body_en = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(body_en, id).run()

  return c.json({ body_en })
})

// POST /:id/check — SEO analysis
seo.post('/:id/check', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const article = await c.env.DB.prepare('SELECT * FROM seo_articles WHERE id = ?').bind(id).first()
  if (!article) return c.json({ error: 'Makale bulunamadı' }, 404)
  if (article.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)
  if (!article.body_tr) return c.json({ error: 'Türkçe içerik bulunamadı' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const profileContext = await getProfileContext(c.env.DB, userId)

  const prompt = `Aşağıdaki blog yazısını SEO açısından analiz et.${article.keywords ? ` Hedef anahtar kelimeler: ${article.keywords}.` : ''}${profileContext ? `\n\nFirma Bağlamı:\n${profileContext}` : ''}

Blog Yazısı:
${article.body_tr}

Aşağıdaki JSON formatında yanıt ver:
{
  "score": 0-100 arası SEO skoru,
  "suggestions": [
    {
      "check": "Kontrol adı",
      "passed": true veya false,
      "note": "Açıklama veya öneri"
    }
  ]
}

Kontrol edilecek kriterler:
- H2 başlıklar var mı? (en az 3 H2 başlık)
- Soru içeren H2 başlıklar var mı? (FAQ formatı)
- Sayısal veriler var mı? (istatistik, yüzde, rakam)
- Doğrudan ve net cevaplar veriliyor mu?
- Okunabilirlik yüksek mi? (kısa paragraflar, liste kullanımı)
- Hedef anahtar kelimeler metinde geçiyor mu?
- Makale yeterli uzunlukta mı? (en az 1000 kelime)
- Meta başlık ve açıklama önerileri

Sadece JSON formatında yanıt ver.`

  const text = await callGemini(prompt, apiKey)

  let result = { score: 0, suggestions: [] }
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) result = JSON.parse(match[0])
  } catch {
    // JSON parse başarısız, default kullan
  }

  const seo_score = result.score || 0

  await c.env.DB.prepare(
    `UPDATE seo_articles SET seo_score = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(seo_score, id).run()

  return c.json({ score: seo_score, suggestions: result.suggestions || [] })
})

export default seo
