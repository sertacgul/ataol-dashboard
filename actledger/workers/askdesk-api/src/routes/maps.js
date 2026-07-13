import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { checkCredits, deductCredit } from '../lib/credits.js'

const maps = new Hono()
maps.use('*', authMiddleware)

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt, apiKey) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API hatası')
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

maps.post('/search', async (c) => {
  const { query, location } = await c.req.json()
  if (!query) return c.json({ error: 'query gerekli' }, 400)

  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return c.json({ error: 'GOOGLE_MAPS_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const params = new URLSearchParams({ query, key: apiKey })
  if (location) params.set('location', location)

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`)
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return c.json({ error: data.error_message || data.status }, 500)
  }

  const places = (data.results || []).map(p => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    types: p.types,
    location: p.geometry?.location,
  }))

  await deductCredit(c.env.DB, chk.userId, 1)
  return c.json({ places })
})

maps.post('/details', async (c) => {
  const { place_id } = await c.req.json()
  if (!place_id) return c.json({ error: 'place_id gerekli' }, 400)

  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return c.json({ error: 'GOOGLE_MAPS_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const fields = 'name,formatted_address,formatted_phone_number,website,reviews,rating,user_ratings_total'
  const params = new URLSearchParams({ place_id, fields, key: apiKey })

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
  const data = await res.json()

  if (data.status !== 'OK') {
    return c.json({ error: data.error_message || data.status }, 500)
  }

  const r = data.result
  await deductCredit(c.env.DB, chk.userId, 1)
  return c.json({
    name: r.name,
    address: r.formatted_address,
    phone: r.formatted_phone_number,
    website: r.website,
    rating: r.rating,
    user_ratings_total: r.user_ratings_total,
    reviews: (r.reviews || []).slice(0, 5).map(rv => ({
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      time: rv.relative_time_description,
    })),
  })
})

maps.post('/sentiment', async (c) => {
  const { reviews, company_name } = await c.req.json()
  if (!reviews || !reviews.length) return c.json({ error: 'reviews gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const reviewText = reviews.map((r, i) => `${i + 1}. (${r.rating}/5) ${r.text}`).join('\n')
  const prompt = `"${company_name || 'Firma'}" için Google yorumlarını analiz et ve kısa bir duygu analizi yap (Türkçe):

${reviewText}

Genel kanı pozitif mi, negatif mi, yoksa karışık mı? Satış perspektifinden bu firmaya yaklaşırken nelere dikkat edilmeli?`

  const result = await callGemini(prompt, apiKey)
  await deductCredit(c.env.DB, chk.userId, 1)
  return c.json({ result })
})

export default maps
