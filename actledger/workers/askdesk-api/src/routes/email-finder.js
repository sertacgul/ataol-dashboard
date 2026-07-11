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

// Check MX records via Cloudflare DoH
async function checkMxRecords(domain) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { 'Accept': 'application/dns-json' },
    })
    if (!res.ok) return { hasMx: false, mxHosts: [] }
    const data = await res.json()
    const mxRecords = (data.Answer || []).filter(r => r.type === 15)
    const mxHosts = mxRecords.map(r => {
      const parts = (r.data || '').split(' ')
      return parts.length >= 2 ? parts[1].replace(/\.$/, '') : r.data
    })
    return { hasMx: mxRecords.length > 0, mxHosts }
  } catch {
    return { hasMx: false, mxHosts: [] }
  }
}

// Detect catch-all domains (domains that accept any email)
async function detectCatchAll(mxHosts) {
  // Common catch-all indicators: Google Workspace, Microsoft 365
  const googleMx = mxHosts.some(h => h.includes('google') || h.includes('gmail'))
  const microsoftMx = mxHosts.some(h => h.includes('outlook') || h.includes('microsoft'))
  // Google/Microsoft usually don't have catch-all by default
  // Custom mail servers often do
  return !googleMx && !microsoftMx && mxHosts.length > 0
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

  // Step 1: Verify domain has MX records
  const { hasMx, mxHosts } = await checkMxRecords(domain)
  const isCatchAll = hasMx ? await detectCatchAll(mxHosts) : false

  // Step 2: Generate pattern-based emails (tahmini)
  const patternEmails = generateEmailPatterns(person_name, domain)

  // Step 3: Call OperIQ to find real, publicly available emails
  let websiteEmails = []
  let foundNames = []
  const apiKey = c.env.GEMINI_API_KEY

  if (apiKey) {
    try {
      const prompt = `You are an email research assistant. Your task is to find REAL, publicly available email addresses for the domain "${domain}".

Search for:
1. Email addresses listed on the website (contact pages, about pages, team pages, footer)
2. Email addresses in public directories, social media profiles, or press releases
3. Employee names and their roles/titles
${person_name ? `4. Specifically look for emails belonging to: ${person_name}${person_title ? ` (${person_title})` : ''}` : ''}

IMPORTANT: Only return email addresses that you are confident actually exist. Do NOT generate or guess email addresses.

Return JSON only, no markdown:
{
  "verified_emails": [{"email": "real@example.com", "source": "website contact page"}],
  "found_names": [{"name": "Full Name", "title": "Job Title"}]
}`
      const text = await callGemini(prompt, apiKey)
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        websiteEmails = (parsed.verified_emails || parsed.website_emails || []).map(e => {
          if (typeof e === 'string') return { email: e, source: 'web sitesi' }
          return { email: e.email, source: e.source || 'web sitesi' }
        })
        foundNames = parsed.found_names || []
      }
    } catch {
      // Gemini failed, continue without AI results
    }
  }

  // Step 4: Build unified results with verification status
  const verifiedSet = new Set(websiteEmails.map(e => e.email.toLowerCase()))

  const allEmails = []

  // Add website-found emails first (verified)
  for (const item of websiteEmails) {
    allEmails.push({
      email: item.email,
      status: 'verified',
      source: item.source || 'web sitesi',
    })
  }

  // Add pattern emails that aren't already in verified list (tahmini)
  if (hasMx) {
    for (const email of patternEmails) {
      if (!verifiedSet.has(email.toLowerCase())) {
        allEmails.push({
          email,
          status: isCatchAll ? 'catch_all' : 'estimated',
          source: 'email kalip tahmini',
        })
      }
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
    JSON.stringify(allEmails),
    JSON.stringify(websiteEmails.map(e => e.email))
  ).run()

  return c.json({
    id,
    domain,
    has_mx: hasMx,
    is_catch_all: isCatchAll,
    mx_provider: mxHosts.length > 0 ? mxHosts[0] : null,
    emails: allEmails,
    found_names: foundNames,
    // Legacy fields for backward compat
    found_emails: patternEmails,
    website_emails: websiteEmails.map(e => e.email),
  })
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
