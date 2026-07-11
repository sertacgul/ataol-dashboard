import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const router = new Hono()
router.use('*', authMiddleware)

// ─── Constants ───────────────────────────────────────────────

const PLAN_LIMITS = { free: 25, pro: 300, growth: 1500, team: 1000 }
const CACHE_TTL_HOURS = 24
const SCRAPE_PAGES = ['/', '/contact', '/contact-us', '/iletisim', '/about', '/about-us', '/hakkimizda', '/team', '/ekibimiz']
const FALSE_POSITIVE_DOMAINS = ['example.com', 'sentry.io', 'webpack.js', 'w3.org', 'schema.org', 'googleapis.com', 'cloudflare.com', 'jsdelivr.net']
const CATCHALL_PROVIDERS = ['yandex', 'zoho', 'fastmail']

const SENIORITY_KEYWORDS = {
  'C-Level': ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'chief', 'founder', 'co-founder', 'kurucu', 'genel mudur'],
  'VP': ['vp', 'vice president', 'baskan yardimcisi'],
  'Director': ['director', 'direktor', 'mudur', 'head of'],
  'Manager': ['manager', 'yonetici', 'mudur yardimcisi', 'lead', 'supervisor'],
  'Staff': []
}

const DEPARTMENT_KEYWORDS = {
  'Engineering': ['engineering', 'developer', 'software', 'tech', 'yazilim', 'muhendis', 'devops', 'backend', 'frontend', 'full stack'],
  'Marketing': ['marketing', 'pazarlama', 'growth', 'brand', 'content', 'seo', 'social media'],
  'Sales': ['sales', 'satis', 'business development', 'account', 'revenue'],
  'HR': ['hr', 'human resources', 'insan kaynaklari', 'people', 'talent', 'recruitment'],
  'Finance': ['finance', 'finans', 'accounting', 'muhasebe', 'cfo'],
  'Operations': ['operations', 'operasyon', 'logistics', 'supply chain'],
  'Legal': ['legal', 'hukuk', 'compliance'],
  'Design': ['design', 'tasarim', 'ux', 'ui', 'creative'],
}

// ─── Gemini AI ───────────────────────────────────────────────

async function callGemini(prompt, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ─── Email Pattern Generation ────────────────────────────────

function generateEmailPatterns(personName, domain) {
  if (!personName || !domain) return []
  const parts = personName.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ? [`${parts[0]}@${domain}`] : []
  const first = parts[0], last = parts[parts.length - 1]
  const patterns = [
    `${first}.${last}@${domain}`, `${first}${last}@${domain}`,
    `${first[0]}.${last}@${domain}`, `${first}_${last}@${domain}`,
    `${first}.${last[0]}@${domain}`, `${first}@${domain}`, `${last}@${domain}`,
  ]
  return [...new Set(patterns)]
}

// ─── Domain Utilities ────────────────────────────────────────

function extractDomainFromUrl(url) {
  if (!url) return null
  try {
    let d = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
    return d || null
  } catch { return null }
}

async function checkMxRecords(domain) {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
      headers: { Accept: 'application/dns-json' }
    })
    const data = await res.json()
    const answers = data.Answer || []
    const mxHosts = answers.filter(a => a.type === 15).map(a => a.data?.split(' ')[1]?.replace(/\.$/, '') || '')
    return { hasMx: mxHosts.length > 0, mxHosts }
  } catch { return { hasMx: false, mxHosts: [] } }
}

function detectCatchAll(mxHosts) {
  const mxStr = mxHosts.join(' ').toLowerCase()
  return CATCHALL_PROVIDERS.some(p => mxStr.includes(p))
}

// ─── Web Scraping ────────────────────────────────────────────

async function fetchPageText(url) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AskDeskBot/1.0)' },
      redirect: 'follow'
    })
    clearTimeout(timeout)
    if (!res.ok) return ''
    let html = await res.text()
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ').trim()
    return html.slice(0, 15000)
  } catch { return '' }
}

function extractEmailsFromHtml(html) {
  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  return [...new Set(matches)].filter(e => {
    const domain = e.split('@')[1]?.toLowerCase() || ''
    return !FALSE_POSITIVE_DOMAINS.some(fp => domain.includes(fp))
      && !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e)
  })
}

async function scrapeWebsite(domain) {
  const fetches = SCRAPE_PAGES.map(p =>
    fetchPageText(`https://${domain}${p}`).then(text => ({ path: p, text }))
  )
  const results = await Promise.allSettled(fetches)
  let allText = '', allEmails = [], pagesScraped = []

  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value.text || r.value.text.length < 100) continue
    pagesScraped.push(r.value.path)
    allText += r.value.text + '\n'
    allEmails.push(...extractEmailsFromHtml(r.value.text))
  }

  return { text: allText.slice(0, 30000), emails: [...new Set(allEmails)], pagesScraped }
}

// ─── Masking ─────────────────────────────────────────────────

function maskName(name) {
  if (!name) return '***'
  const parts = name.split(' ')
  return parts.map(p => p[0] + '***').join(' ')
}

function maskEmail(email) {
  if (!email) return '***@***.com'
  const [local, domain] = email.split('@')
  return local[0] + '***@' + domain
}

// ─── Classification ─────────────────────────────────────────

function classifySeniority(title) {
  if (!title) return 'Staff'
  const lower = title.toLowerCase()
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (level === 'Staff') continue
    if (keywords.some(k => lower.includes(k))) return level
  }
  return 'Staff'
}

function classifyDepartment(title) {
  if (!title) return 'Other'
  const lower = title.toLowerCase()
  for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return dept
  }
  return 'Other'
}

// ─── Verification ────────────────────────────────────────────

function computeVerification(email, websiteEmails, hasMx, hasCatchAll) {
  const onWebsite = websiteEmails.some(we => we.toLowerCase() === email.toLowerCase())
  if (onWebsite) return { status: 'verified', confidence: 95, source: 'website' }
  if (!hasMx) return { status: 'unknown', confidence: 10, source: 'pattern' }
  if (hasCatchAll) return { status: 'risky', confidence: 40, source: 'pattern' }
  return { status: 'likely', confidence: 72, source: 'pattern' }
}

// ─── Credits ─────────────────────────────────────────────────

async function getOrCreateCredits(db, userId, plan) {
  let credits = await db.prepare('SELECT * FROM user_credits WHERE user_id = ?').bind(userId).first()
  if (!credits) {
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free
    const resetDate = getNextResetDate()
    await db.prepare('INSERT INTO user_credits (user_id, monthly_limit, used_this_month, reset_date) VALUES (?, ?, 0, ?)')
      .bind(userId, limit, resetDate).run()
    credits = { user_id: userId, monthly_limit: limit, used_this_month: 0, reset_date: resetDate }
  }
  // Check if we need to reset
  if (new Date(credits.reset_date) <= new Date()) {
    const newReset = getNextResetDate()
    const limit = PLAN_LIMITS[plan] || credits.monthly_limit
    await db.prepare('UPDATE user_credits SET used_this_month = 0, reset_date = ?, monthly_limit = ? WHERE user_id = ?')
      .bind(newReset, limit, userId).run()
    credits.used_this_month = 0
    credits.reset_date = newReset
    credits.monthly_limit = limit
  }
  return credits
}

function getNextResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().split('T')[0]
}

async function deductCredit(db, userId) {
  await db.prepare('UPDATE user_credits SET used_this_month = used_this_month + 1 WHERE user_id = ?')
    .bind(userId).run()
}

// ─── Domain Cache ────────────────────────────────────────────

async function getCachedDomain(db, domain) {
  const row = await db.prepare('SELECT * FROM domain_cache WHERE domain = ?').bind(domain).first()
  if (!row) return null
  const age = (Date.now() - new Date(row.scraped_at).getTime()) / (1000 * 60 * 60)
  if (age > CACHE_TTL_HOURS) return null
  return {
    company_info: JSON.parse(row.company_info || '{}'),
    people: JSON.parse(row.people || '[]'),
    emails_raw: JSON.parse(row.emails_raw || '[]'),
    has_catchall: !!row.has_catchall,
    mx_provider: row.mx_provider,
  }
}

async function setCachedDomain(db, domain, data) {
  await db.prepare(`INSERT OR REPLACE INTO domain_cache (domain, company_info, people, emails_raw, has_catchall, mx_provider, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
    .bind(domain, JSON.stringify(data.company_info), JSON.stringify(data.people),
      JSON.stringify(data.emails_raw), data.has_catchall ? 1 : 0, data.mx_provider || '')
    .run()
}

// ─── POST /search ── Find people at a company ───────────────

router.post('/search', async (c) => {
  const userId = c.get('userId')
  const { query, domain: inputDomain, company_id } = await c.req.json()

  // Resolve domain
  let domain = inputDomain
  if (!domain && company_id) {
    const company = await c.env.DB.prepare('SELECT website FROM companies WHERE id = ? AND user_id = ?')
      .bind(company_id, userId).first()
    domain = extractDomainFromUrl(company?.website)
  }
  if (!domain && query) {
    // Try to use query as domain if it looks like one
    if (query.includes('.') && !query.includes(' ')) domain = query.toLowerCase().replace(/^www\./, '')
  }
  if (!domain) return c.json({ error: 'Domain gerekli' }, 400)
  domain = domain.toLowerCase().replace(/^www\./, '')

  // Check cache first
  let cached = await getCachedDomain(c.env.DB, domain)
  if (cached) {
    // Check which emails user already revealed
    const revealed = await c.env.DB.prepare(
      'SELECT email, person_name, verification_status, confidence_score FROM email_reveals WHERE user_id = ? AND domain = ?'
    ).bind(userId, domain).all()
    const revealedMap = {}
    for (const r of (revealed.results || [])) revealedMap[r.email] = r

    const people = cached.people.map((p, i) => {
      const bestEmail = p.emails?.[0] || null
      const rev = bestEmail ? revealedMap[bestEmail] : null
      return {
        id: `${domain}-${i}`,
        masked_name: rev ? p.name : maskName(p.name),
        full_name: rev ? p.name : null,
        title: p.title,
        department: classifyDepartment(p.title),
        seniority: classifySeniority(p.title),
        masked_email: rev ? bestEmail : maskEmail(bestEmail),
        full_email: rev ? bestEmail : null,
        revealed: !!rev,
        verification_status: rev?.verification_status || null,
        confidence_score: rev?.confidence_score || null,
      }
    })

    return c.json({
      company: cached.company_info,
      people,
      total_count: people.length,
      has_catchall: cached.has_catchall,
      mx_provider: cached.mx_provider,
      from_cache: true,
    })
  }

  // Fresh scrape
  const [mx, scrapeResult] = await Promise.all([
    checkMxRecords(domain),
    scrapeWebsite(domain),
  ])

  const hasCatchAll = detectCatchAll(mx.mxHosts)

  // Extract company info + people via Gemini
  let companyInfo = { name: query || domain, domain, sector: '', location: '', employee_count: '' }
  let people = []

  if (scrapeResult.text.length > 200 && c.env.GEMINI_API_KEY) {
    try {
      const prompt = `Bu web sitesi iceriginden firma bilgileri ve calisanlari cikar.

KURALLAR:
- SADECE verilen icerikten bilgi cikar, uydurma
- Calisanlarin isim ve unvanlarini bul
- Her calisan icin departman tahmini yap

Icerik:
${scrapeResult.text.slice(0, 12000)}

JSON formatinda don:
{
  "company_name": "...",
  "description": "1-2 cumle",
  "sector": "...",
  "location": "...",
  "employee_count": "...",
  "people": [{"name": "Ad Soyad", "title": "Unvan"}]
}`
      const raw = await callGemini(prompt, c.env.GEMINI_API_KEY)
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        companyInfo = {
          name: parsed.company_name || companyInfo.name,
          domain,
          description: parsed.description || '',
          sector: parsed.sector || '',
          location: parsed.location || '',
          employee_count: parsed.employee_count || '',
          mx_valid: mx.hasMx,
        }
        if (Array.isArray(parsed.people)) {
          people = parsed.people.filter(p => p.name && p.name.length > 1)
        }
      }
    } catch (e) { /* Gemini failed, continue with scrape data */ }
  }

  // Generate emails for each person
  const websiteEmails = scrapeResult.emails
  const peopleWithEmails = people.map(p => {
    const patterns = generateEmailPatterns(p.name, domain)
    // Check if any pattern matches a website email
    const matchedWebsite = patterns.find(pat => websiteEmails.some(we => we.toLowerCase() === pat.toLowerCase()))
    const bestEmail = matchedWebsite || patterns[0] || null
    return { ...p, emails: bestEmail ? [bestEmail] : [], matchedWebsite: !!matchedWebsite }
  })

  // Also add website emails that don't belong to any found person
  const assignedEmails = new Set(peopleWithEmails.flatMap(p => p.emails.map(e => e.toLowerCase())))
  for (const we of websiteEmails) {
    if (!assignedEmails.has(we.toLowerCase())) {
      const localPart = we.split('@')[0].replace(/[._]/g, ' ')
      peopleWithEmails.push({ name: localPart, title: '', emails: [we], matchedWebsite: true })
    }
  }

  // Save to cache
  await setCachedDomain(c.env.DB, domain, {
    company_info: companyInfo,
    people: peopleWithEmails,
    emails_raw: websiteEmails,
    has_catchall: hasCatchAll,
    mx_provider: mx.mxHosts[0] || '',
  })

  // Check user's existing reveals
  const revealed = await c.env.DB.prepare(
    'SELECT email FROM email_reveals WHERE user_id = ? AND domain = ?'
  ).bind(userId, domain).all()
  const revealedSet = new Set((revealed.results || []).map(r => r.email))

  // Build masked response
  const maskedPeople = peopleWithEmails.map((p, i) => {
    const email = p.emails[0] || null
    const isRevealed = email && revealedSet.has(email)
    return {
      id: `${domain}-${i}`,
      masked_name: isRevealed ? p.name : maskName(p.name),
      full_name: isRevealed ? p.name : null,
      title: p.title,
      department: classifyDepartment(p.title),
      seniority: classifySeniority(p.title),
      masked_email: isRevealed ? email : maskEmail(email),
      full_email: isRevealed ? email : null,
      revealed: isRevealed,
      verification_status: null,
      confidence_score: null,
    }
  })

  return c.json({
    company: companyInfo,
    people: maskedPeople,
    total_count: maskedPeople.length,
    has_catchall: hasCatchAll,
    mx_provider: mx.mxHosts[0] || '',
    from_cache: false,
  })
})

export default router
