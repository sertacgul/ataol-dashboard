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

// ─── Routes will be added in next tasks ──────────────────────

export default router
