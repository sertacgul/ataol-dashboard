import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const emailFinder = new Hono()
emailFinder.use('*', authMiddleware)

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

function generateEmailPatterns(personName, domain) {
  if (!personName || !domain) return []
  const parts = personName.trim().toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return []

  const first = parts[0]
  const last = parts[parts.length - 1]
  const fInitial = first[0] || ''
  const lInitial = last[0] || ''

  const patterns = []
  if (parts.length >= 2) {
    patterns.push(`${first}.${last}@${domain}`)
    patterns.push(`${first}${last}@${domain}`)
    patterns.push(`${fInitial}.${last}@${domain}`)
    patterns.push(`${first}_${last}@${domain}`)
    patterns.push(`${first}.${lInitial}@${domain}`)
  }
  patterns.push(`${first}@${domain}`)
  if (last && last !== first) patterns.push(`${last}@${domain}`)

  return [...new Set(patterns)]
}

function extractDomainFromUrl(url) {
  if (!url) return null
  try {
    const cleaned = url.startsWith('http') ? url : `https://${url}`
    const u = new URL(cleaned)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// POST /email-finder/search
emailFinder.post('/search', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const { company_id, domain: inputDomain, person_name, person_title } = body

  let domain = inputDomain || null

  // If no domain, try to get from company record
  if (!domain && company_id) {
    const company = await c.env.DB.prepare('SELECT website FROM companies WHERE id = ?').bind(company_id).first()
    if (company?.website) {
      domain = extractDomainFromUrl(company.website)
    }
  }

  if (!domain) {
    return c.json({ error: 'Domain veya firma web sitesi gerekli' }, 400)
  }

  const foundEmails = generateEmailPatterns(person_name, domain)

  // Call OperIQ (Gemini) to find publicly available emails on the domain
  let websiteEmails = []
  let foundNames = []
  const apiKey = c.env.GEMINI_API_KEY

  if (apiKey) {
    try {
      const prompt = `Analyze ${domain} website. Find all publicly available email addresses, contact forms, and employee names. Return JSON only, no markdown: {"website_emails": [], "found_names": [{"name": "", "title": ""}]}`
      const text = await callGemini(prompt, apiKey)
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        websiteEmails = parsed.website_emails || []
        foundNames = parsed.found_names || []
      }
    } catch {
      // Gemini failed, continue without AI results
    }
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO email_finder_results (id, user_id, company_id, domain, person_name, person_title, found_emails, website_emails, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`
  ).bind(
    id,
    userId,
    company_id || null,
    domain,
    person_name || null,
    person_title || null,
    JSON.stringify(foundEmails),
    JSON.stringify(websiteEmails)
  ).run()

  return c.json({ id, domain, found_emails: foundEmails, website_emails: websiteEmails, found_names: foundNames })
})

// GET /email-finder/
emailFinder.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await c.env.DB.prepare(
    'SELECT * FROM email_finder_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(userId).all()
  return c.json({ results: result.results })
})

// GET /email-finder/:id
emailFinder.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    'SELECT * FROM email_finder_results WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!row) return c.json({ error: 'Bulunamadı' }, 404)
  return c.json({ result: row })
})

// POST /email-finder/:id/save-contact
emailFinder.post('/:id/save-contact', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const { email, name, title } = body

  const row = await c.env.DB.prepare(
    'SELECT * FROM email_finder_results WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first()
  if (!row) return c.json({ error: 'Bulunamadı' }, 404)

  const contactId = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO contacts (id, company_id, user_id, name, email, title) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(contactId, row.company_id || null, userId, name || '', email, title || null).run()

  return c.json({ id: contactId }, 201)
})

// POST /email-finder/export
emailFinder.post('/export', async (c) => {
  const userId = c.get('userId')
  const result = await c.env.DB.prepare(
    'SELECT * FROM email_finder_results WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  const rows = result.results
  const lines = ['ID,Domain,Kisi,Unvan,Bulunan Emailler,Web Sitesi Emailleri,Tarih']
  for (const r of rows) {
    const foundArr = (() => { try { return JSON.parse(r.found_emails || '[]') } catch { return [] } })()
    const webArr = (() => { try { return JSON.parse(r.website_emails || '[]') } catch { return [] } })()
    lines.push([
      r.id,
      r.domain || '',
      r.person_name || '',
      r.person_title || '',
      foundArr.join('; '),
      webArr.join('; '),
      r.created_at || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="email-finder.csv"',
    },
  })
})

export default emailFinder
