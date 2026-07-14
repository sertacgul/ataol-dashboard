import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { logActivity } from '../lib/activity.js'
import { cleanAiText } from '../lib/sanitize.js'

const ataol = new Hono()
ataol.use('*', authMiddleware)

// ─── Gate: only the ATAOL / StrategyThrust team (@strategythrust.com) ────────
ataol.use('*', async (c, next) => {
  const userId = c.get('userId')
  const u = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first()
  if (!u || !String(u.email).toLowerCase().endsWith('@strategythrust.com')) {
    return c.json({ error: 'Yetkisiz' }, 403)
  }
  c.set('userEmail', u.email)
  await next()
})

// ─── ATAOL AI Techs platforms (sender identity for outreach) ─────────────────
export const PLATFORMS = {
  strategythrust: {
    name: 'StrategyThrust',
    url: 'strategythrust.com',
    value: 'Kurumlara büyüme ve go-to-market strateji danışmanlığı, veri odaklı karar desteği ve operasyonel verimlilik sunar.',
  },
  actledger: {
    name: 'ActLedger',
    url: 'actledger.com',
    value: 'Saha operasyonları yönetim platformu: görev ve KPI takibi, IoT, envanter, İK ve yapay zeka içgörüleri.',
  },
  ataol_lab: {
    name: 'ATAOL AI Lab',
    url: 'ataolai.tech',
    value: 'Kurumlara özel yapay zeka çözümleri; POC aşamasından üretime AI ürün geliştirme ve entegrasyon.',
  },
  ataol_institute: {
    name: 'ATAOL AI Institute',
    url: 'ataolai.tech',
    value: 'Kurumsal yapay zeka eğitimleri ve AI dönüşüm programları.',
  },
}

ataol.get('/platforms', (c) => {
  return c.json({
    platforms: Object.entries(PLATFORMS).map(([key, p]) => ({ key, name: p.name, url: p.url })),
  })
})

// ─── POST /compose ── platform-specific outreach email, optional sentiment ────
ataol.post('/compose', async (c) => {
  const userId = c.get('userId')
  const { platform, target_company, target_sector, target_location, sentiment, language } = await c.req.json()

  const p = PLATFORMS[platform]
  if (!p) return c.json({ error: 'Geçersiz platform' }, 400)
  if (!target_company) return c.json({ error: 'Hedef firma gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'AI servisi yapılandırılmamış' }, 500)

  const langInstruction = language && language.trim()
    ? `- Write the email in the local language of this location: ${language}.`
    : '- Email Türkçe olsun.'

  const sentimentBlock = sentiment && sentiment.trim()
    ? `\nRECIPIENT'S GOOGLE REVIEWS SENTIMENT (use it to make the email specific and relevant, do not quote it verbatim):\n${sentiment.trim()}\n`
    : ''

  const prompt = `Write a short, personalized B2B outreach email.

SENDER (write as this company):
- Name: ${p.name}
- What we do: ${p.value}

RECIPIENT COMPANY:
- Name: ${target_company}
- Sector: ${target_sector || 'N/A'}
- Location: ${target_location || 'N/A'}
${sentimentBlock}
RULES:
- Body 60-120 words. Do not write longer; it will be read on mobile.
- Subject line 4-7 words; intriguing but not spammy.
- Open with a short, specific reference to the recipient's actual business or a current situation in their sector. No generic praise.
- Identify ONE concrete challenge relevant to them and connect it to one thing the sender offers.
- Exactly one clear call to action. Do not stack multiple asks.
- Do not use repeated template phrases; it must not read like a form letter.
- Natural, human tone. No markdown, no # * symbols, no long dashes.
${langInstruction}

Respond in JSON only:
{"subject": "...", "body": "..."}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    )
    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return c.json({ error: 'Email oluşturulamadı' }, 500)
    const parsed = JSON.parse(m[0])
    await logActivity(c.env.DB, userId, {
      module: 'ataol', action: 'compose',
      title: `${p.name} → ${target_company}`,
      detail: { platform, target_company },
    })
    return c.json({ subject: cleanAiText(parsed.subject || ''), body: cleanAiText(parsed.body || ''), sender: p.name })
  } catch {
    return c.json({ error: 'AI servisi hatası' }, 500)
  }
})

export default ataol
