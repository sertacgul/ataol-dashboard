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
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API hatasi')
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

// Actually fetch a webpage and return its text content
async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AskDesk/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    // Strip HTML tags, scripts, styles - keep text content
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000) // limit to ~15k chars
  } catch {
    return ''
  }
}

// Extract emails from raw HTML using regex
function extractEmailsFromHtml(html) {
  if (!html) return []
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = html.match(emailRegex) || []
  // Filter out common false positives
  const filtered = matches.filter(e => {
    const lower = e.toLowerCase()
    if (lower.includes('example.com')) return false
    if (lower.includes('sentry.io')) return false
    if (lower.includes('webpack')) return false
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.svg')) return false
    if (lower.includes('wixpress') || lower.includes('w3.org')) return false
    if (lower.includes('schema.org') || lower.includes('googleapis')) return false
    if (lower.includes('cloudflare') || lower.includes('jsdelivr')) return false
    return true
  })
  return [...new Set(filtered)]
}

// Scrape multiple pages of a website
async function scrapeWebsite(domain) {
  const baseUrl = `https://${domain}`
  const paths = [
    '/',
    '/contact', '/contact-us', '/iletisim',
    '/about', '/about-us', '/hakkimizda',
    '/team', '/ekibimiz',
  ]

  // Fetch all pages in parallel
  const results = await Promise.allSettled(
    paths.map(p => fetchPageText(`${baseUrl}${p}`))
  )

  let allText = ''
  let allEmails = []
  const pagesScraped = []

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value.length > 100) {
      const pageText = results[i].value
      allText += '\n--- Page: ' + paths[i] + ' ---\n' + pageText
      pagesScraped.push(paths[i])

      // Also extract emails from the raw text
      const emails = extractEmailsFromHtml(pageText)
      allEmails.push(...emails)
    }
  }

  return {
    text: allText.slice(0, 30000), // limit total text
    emails: [...new Set(allEmails)],
    pagesScraped,
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

  // Step 1: Verify domain has MX records
  // Step 2: Actually scrape the website
  const [mxResult, scrapeResult] = await Promise.all([
    checkMxRecords(domain),
    scrapeWebsite(domain),
  ])

  const { hasMx, mxHosts } = mxResult
  const { text: websiteText, emails: scrapedEmails, pagesScraped } = scrapeResult

  // Step 3: Generate pattern-based emails (tahmini)
  const patternEmails = generateEmailPatterns(person_name, domain)

  // Step 4: Use Gemini to extract structured info from ACTUAL scraped content only
  let companyInfo = null
  let foundPeople = []
  const apiKey = c.env.GEMINI_API_KEY

  if (apiKey && websiteText.length > 200) {
    try {
      const prompt = `Asagida bir firmanin web sitesinden cekilen metin icerik var.

BU METINDEN ve SADECE BU METINDEN bilgi cikar. Metinde olmayan bilgiyi KESINLIKLE UYDURMA. Eger bir bilgi metinde yoksa null yaz.

Cikar:
1. Firma adi
2. Firma tanimi (1-2 cumle, sitede yazildigi gibi)
3. Sektor
4. Lokasyon/adres (metinde varsa)
5. Calisan sayisi (metinde varsa)
6. Metinde gecen kisi isimleri ve unvanlari (sadece metinde acikca yazanlar)

JSON formatinda don, markdown kullanma:
{
  "company_name": "...",
  "description": "..." veya null,
  "sector": "..." veya null,
  "location": "..." veya null,
  "employee_count": "..." veya null,
  "people": [{"name": "...", "title": "..."}]
}

KURALLAR:
- Sadece metinde acikca yazan bilgileri yaz
- Tahmin etme, varsayim yapma
- Metinde olmayan kisi ismi veya unvan uydurma
- "people" dizisine sadece metinde isim+unvan acikca gecen kisileri ekle
- Eger metinde hicbir kisi ismi gecmiyorsa bos dizi don: []

--- WEB SITESI ICERIGI ---
${websiteText}
--- ICERIK SONU ---`

      const text = await callGemini(prompt, apiKey)
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        companyInfo = {
          name: parsed.company_name || null,
          description: parsed.description || null,
          sector: parsed.sector || null,
          location: parsed.location || null,
          employee_count: parsed.employee_count || null,
        }
        foundPeople = (parsed.people || []).filter(p => p.name && p.name.trim())
      }
    } catch {
      // Gemini failed, continue without AI results
    }
  }

  // Step 5: Build unified email results
  const verifiedSet = new Set(scrapedEmails.map(e => e.toLowerCase()))

  const allEmails = []

  // Scraped emails first (dogrulanmis - actually found on the website)
  for (const email of scrapedEmails) {
    allEmails.push({
      email,
      status: 'verified',
      source: 'web sitesinden bulundu',
    })
  }

  // Pattern emails (tahmini - not found on site, just generated)
  if (hasMx) {
    for (const email of patternEmails) {
      if (!verifiedSet.has(email.toLowerCase())) {
        allEmails.push({
          email,
          status: 'estimated',
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
    JSON.stringify(scrapedEmails)
  ).run()

  return c.json({
    id,
    domain,
    has_mx: hasMx,
    mx_provider: mxHosts.length > 0 ? mxHosts[0] : null,
    pages_scraped: pagesScraped,
    company_info: companyInfo,
    emails: allEmails,
    found_people: foundPeople,
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
  if (!row) return c.json({ error: 'Bulunamadi' }, 404)
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
  if (!row) return c.json({ error: 'Bulunamadi' }, 404)

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
  const lines = ['ID,Domain,Kisi,Unvan,Bulunan Emailler,Dogrulama,Tarih']
  for (const r of rows) {
    const allArr = (() => { try { return JSON.parse(r.found_emails || '[]') } catch { return [] } })()
    const verifiedArr = allArr.filter(e => typeof e === 'object' ? e.status === 'verified' : false)
    const estimatedArr = allArr.filter(e => typeof e === 'object' ? e.status === 'estimated' : true)
    lines.push([
      r.id,
      r.domain || '',
      r.person_name || '',
      r.person_title || '',
      (typeof allArr[0] === 'object' ? allArr.map(e => e.email) : allArr).join('; '),
      `${verifiedArr.length} dogrulanmis, ${estimatedArr.length} tahmini`,
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
