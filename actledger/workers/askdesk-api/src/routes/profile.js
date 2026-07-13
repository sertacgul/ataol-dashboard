import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { checkCredits, deductCredit } from '../lib/credits.js'

const profile = new Hono()
profile.use('*', authMiddleware)

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const PROFILE_FIELDS = [
  'company_name', 'website', 'sector', 'description',
  'value_proposition', 'target_audience', 'products_services',
  'competitors', 'usps', 'tone', 'sample_content',
]

profile.get('/', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare(
    'SELECT * FROM company_profiles WHERE user_id = ?'
  ).bind(userId).first()
  return c.json({ profile: row || null })
})

profile.post('/', async (c) => {
  const userId = c.get('userId')
  const existing = await c.env.DB.prepare(
    'SELECT id FROM company_profiles WHERE user_id = ?'
  ).bind(userId).first()
  if (existing) return c.json({ error: 'Profil zaten mevcut' }, 409)

  const body = await c.req.json()
  const id = crypto.randomUUID()

  const values = PROFILE_FIELDS.map(f => {
    const v = body[f]
    if (Array.isArray(v)) return JSON.stringify(v)
    return v ?? null
  })

  await c.env.DB.prepare(
    `INSERT INTO company_profiles (id, user_id, ${PROFILE_FIELDS.join(', ')})
     VALUES (?, ?, ${PROFILE_FIELDS.map(() => '?').join(', ')})`
  ).bind(id, userId, ...values).run()

  const row = await c.env.DB.prepare(
    'SELECT * FROM company_profiles WHERE id = ?'
  ).bind(id).first()
  return c.json({ profile: row }, 201)
})

profile.put('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  const setClauses = PROFILE_FIELDS.map(f => `${f} = ?`).join(', ')
  const values = PROFILE_FIELDS.map(f => {
    const v = body[f]
    if (Array.isArray(v)) return JSON.stringify(v)
    return v ?? null
  })

  await c.env.DB.prepare(
    `UPDATE company_profiles SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`
  ).bind(...values, userId).run()

  const row = await c.env.DB.prepare(
    'SELECT * FROM company_profiles WHERE user_id = ?'
  ).bind(userId).first()
  return c.json({ profile: row })
})

profile.post('/analyze', async (c) => {
  const { website } = await c.req.json()
  if (!website) return c.json({ error: 'website gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const prompt = `"${website}" web sitesini analiz et ve bu şirket için aşağıdaki JSON formatında bir firma profili taslağı oluştur:

{
  "company_name": "Şirket adı",
  "sector": "Sektör",
  "description": "Şirket hakkında 2-3 cümlelik açıklama",
  "value_proposition": "Değer önerisi",
  "target_audience": "Hedef kitle açıklaması",
  "products_services": ["Ürün/hizmet 1", "Ürün/hizmet 2"],
  "competitors": ["Rakip 1", "Rakip 2"],
  "usps": ["Ayırt edici özellik 1", "Ayırt edici özellik 2"],
  "tone": "formal"
}

tone alanı için yalnızca şu değerlerden birini kullan: formal, friendly, technical, casual.
Sadece JSON formatında yanıt ver, başka açıklama ekleme.`

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  const data = await res.json()
  if (!res.ok) return c.json({ error: data.error?.message || 'Analiz başarısız' }, 500)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  let draft = null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) draft = JSON.parse(match[0])
  } catch {
    // JSON parse başarısız
  }

  await deductCredit(c.env.DB, chk.userId, 1)
  return c.json({ draft, raw: text })
})

export default profile
