import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { checkCredits, deductCredit } from '../lib/credits.js'
import { logActivity } from '../lib/activity.js'
import { cleanAiText } from '../lib/sanitize.js'

const ai = new Hono()
ai.use('*', authMiddleware)

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

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

ai.post('/generate', async (c) => {
  const body = await c.req.json()
  const { prompt, context } = body

  if (!prompt) return c.json({ error: 'prompt gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 'content', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt

  const text = await callGemini(fullPrompt, apiKey)
  await deductCredit(c.env.DB, chk.userId, 'content', 1)
  await logActivity(c.env.DB, chk.userId, { module: 'ai', action: 'generate', title: prompt.slice(0, 60), detail: { result: (text || '').slice(0, 500) } })
  return c.json({ text: cleanAiText(text) })
})

ai.post('/research', async (c) => {
  const body = await c.req.json()
  const { company_name, website } = body

  if (!company_name) return c.json({ error: 'company_name gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'GEMINI_API_KEY yapılandırılmamış' }, 500)

  const chk = await checkCredits(c, 'content', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

  const prompt = `"${company_name}"${website ? ` (${website})` : ''} şirketi hakkında araştırma yap ve aşağıdaki JSON formatında yanıt ver:

{
  "summary": "Şirket hakkında 2-3 cümlelik özet",
  "sector": "Sektör adı",
  "size": "Tahmini çalışan sayısı veya büyüklük (küçük/orta/büyük)",
  "needs": ["Olası ihtiyaç 1", "Olası ihtiyaç 2", "Olası ihtiyaç 3"]
}

Sadece JSON formatında yanıt ver, başka açıklama ekleme.`

  const rawText = await callGemini(prompt, apiKey)
  const text = cleanAiText(rawText)

  let research = null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) research = JSON.parse(match[0])
  } catch {
    // JSON parse başarısız olursa raw text döndür
  }

  await deductCredit(c.env.DB, chk.userId, 'content', 1)
  await logActivity(c.env.DB, chk.userId, { module: 'ai', action: 'research', title: company_name, detail: { result: (text || '').slice(0, 500) } })
  return c.json({ research, raw: text })
})

export default ai
