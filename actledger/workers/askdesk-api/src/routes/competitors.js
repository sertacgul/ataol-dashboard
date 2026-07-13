import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { checkCredits, deductCredit } from '../lib/credits.js'
import { logActivity } from '../lib/activity.js'

const competitors = new Hono()
competitors.use('*', authMiddleware)

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function getProfileContext(db, userId) {
  const p = await db.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()
  if (!p) return ''
  return `Firma: ${p.company_name || ''}\nSektör: ${p.sector || ''}\nAçıklama: ${p.description || ''}\nDeğer Önerisi: ${p.value_proposition || ''}\nHedef Kitle: ${p.target_audience || ''}`
}

competitors.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await c.env.DB.prepare(
    'SELECT * FROM competitors WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()
  return c.json({ competitors: result.results })
})

competitors.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    `INSERT INTO competitors (id, user_id, name, website) VALUES (?, ?, ?, ?)`
  ).bind(id, userId, body.name || null, body.website || null).run()

  return c.json({ id }, 201)
})

competitors.post('/:id/analyze', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const competitor = await c.env.DB.prepare(
    'SELECT * FROM competitors WHERE id = ?'
  ).bind(id).first()
  if (!competitor) return c.json({ error: 'Rakip bulunamadı' }, 404)
  if (competitor.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 2)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const profileContext = await getProfileContext(c.env.DB, userId)

  const prompt = `${profileContext ? `KENDI FIRMAM:\n${profileContext}\n\n` : ''}Rakip firma "${competitor.name || ''}"${competitor.website ? ` (${competitor.website})` : ''} için detaylı rekabet analizi yap. Kendi firmam ile karşılaştır.

Aşağıdaki JSON formatında yanıt ver. Puanlar 0-4 arası tam sayı (0=çok zayıf, 4=mükemmel). Kendi firmam ("own") için ${profileContext ? 'firma bağlamıma göre puanla' : 'bilgi yoksa makul tahmin yap'}.

{
  "name": "Rakip firma adı",
  "sector": "Sektör",
  "description": "3-4 cümlelik detaylı açıklama",
  "target_market": "Hedef pazar",
  "strengths": ["Güçlü yön 1", "Güçlü yön 2", "Güçlü yön 3"],
  "weaknesses": ["Zayıf yön 1", "Zayıf yön 2"],
  "opportunities": ["Fırsat 1", "Fırsat 2"],
  "scores": {
    "competitor": { "product_quality": 0, "price_competitiveness": 0, "market_reach": 0, "brand_awareness": 0, "innovation": 0, "customer_experience": 0 },
    "own": { "product_quality": 0, "price_competitiveness": 0, "market_reach": 0, "brand_awareness": 0, "innovation": 0, "customer_experience": 0 }
  },
  "competitor_position": "Pazar Lideri | Meydan Okuyan | Takipçi | Niş Oyuncu",
  "own_position": "Pazar Lideri | Meydan Okuyan | Takipçi | Niş Oyuncu",
  "position_summary": "Kendi firmamın rakibe göre pazar konumu, 2-3 cümle",
  "improvement_areas": ["Aksiyon alınabilir gelişim alanı 1", "gelişim alanı 2", "gelişim alanı 3"]
}

Sadece JSON döndür, başka açıklama ekleme.`

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  const data = await res.json()
  if (!res.ok) return c.json({ error: data.error?.message || 'Analiz başarısız' }, 500)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  let analysis = null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) analysis = JSON.parse(match[0])
  } catch {
    // JSON parse başarısız
  }

  const analysisStr = analysis ? JSON.stringify(analysis) : text

  await c.env.DB.prepare(
    `UPDATE competitors SET analysis = ? WHERE id = ?`
  ).bind(analysisStr, id).run()

  await deductCredit(c.env.DB, chk.userId, 2)
  await logActivity(c.env.DB, userId, { module: 'competitors', action: 'analyze', title: competitor.name || 'Rakip', detail: analysis || analysisStr })
  return c.json({ analysis })
})

competitors.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const competitor = await c.env.DB.prepare(
    'SELECT user_id FROM competitors WHERE id = ?'
  ).bind(id).first()
  if (!competitor) return c.json({ error: 'Rakip bulunamadı' }, 404)
  if (competitor.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare('DELETE FROM competitors WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export default competitors
