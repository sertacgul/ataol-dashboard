import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { checkCredits, deductCredit } from '../lib/credits.js'
import { logActivity } from '../lib/activity.js'
import { cleanAiText } from '../lib/sanitize.js'

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
  const { query } = await c.req.json()
  if (!query) return c.json({ error: 'query gerekli' }, 400)

  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return c.json({ error: 'GOOGLE_MAPS_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 'outreach', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  // Places API (New) — Text Search
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location',
    },
    body: JSON.stringify({ textQuery: query }),
  })
  const data = await res.json()

  if (!res.ok) {
    return c.json({ error: data.error?.message || 'Places API hatası' }, 500)
  }

  const places = (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text,
    address: p.formattedAddress,
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : undefined,
  }))

  await deductCredit(c.env.DB, chk.userId, 'outreach', 1)
  await logActivity(c.env.DB, chk.userId, { module: 'maps', action: 'search', title: query, detail: { count: places.length } })
  return c.json({ places })
})

maps.post('/details', async (c) => {
  const { place_id } = await c.req.json()
  if (!place_id) return c.json({ error: 'place_id gerekli' }, 400)

  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return c.json({ error: 'GOOGLE_MAPS_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 'outreach', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  // Places API (New) — Place Details
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,reviews',
    },
  })
  const data = await res.json()

  if (!res.ok) {
    return c.json({ error: data.error?.message || 'Places API hatası' }, 500)
  }

  const r = data
  await deductCredit(c.env.DB, chk.userId, 'outreach', 1)
  return c.json({
    name: r.displayName?.text,
    address: r.formattedAddress,
    phone: r.nationalPhoneNumber || r.internationalPhoneNumber || null,
    website: r.websiteUri || null,
    rating: r.rating,
    user_ratings_total: r.userRatingCount,
    reviews: (r.reviews || []).slice(0, 5).map(rv => ({
      author: rv.authorAttribution?.displayName,
      rating: rv.rating,
      text: rv.text?.text,
      time: rv.relativePublishTimeDescription,
    })),
  })
})

maps.post('/sentiment', async (c) => {
  const { reviews, company_name } = await c.req.json()
  if (!reviews || !reviews.length) return c.json({ error: 'reviews gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 'outreach', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const reviewText = reviews.map((r, i) => `${i + 1}. (${r.rating}/5) ${r.text}`).join('\n')
  const prompt = `"${company_name || 'Firma'}" için Google yorumlarını analiz et ve kısa bir duygu analizi yap (Türkçe):

${reviewText}

Genel kanı pozitif mi, negatif mi, yoksa karışık mı? Satış perspektifinden bu firmaya yaklaşırken nelere dikkat edilmeli?`

  const result = await callGemini(prompt, apiKey)
  await deductCredit(c.env.DB, chk.userId, 'outreach', 1)
  return c.json({ result: cleanAiText(result) })
})

export default maps
