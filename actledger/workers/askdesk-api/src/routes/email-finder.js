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
    if (query.includes('.') && !query.includes(' ')) {
      domain = query.toLowerCase().replace(/^www\./, '')
    } else if (c.env.GEMINI_API_KEY) {
      // Use Gemini to find the company domain
      try {
        const domainPrompt = `"${query}" firmasinin web sitesi domain adresini bul. SADECE domain adresini yaz, baska hicbir sey yazma. Ornek: getir.com`
        const domainGuess = await callGemini(domainPrompt, c.env.GEMINI_API_KEY)
        const cleaned = domainGuess.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('\n')[0].trim()
        if (cleaned && cleaned.includes('.') && cleaned.length < 50) {
          domain = cleaned
        }
      } catch {}
    }
  }
  if (!domain) return c.json({ error: 'Domain bulunamadi. Lutfen domain adresini girin (ornek: firma.com)' }, 400)
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
  let companyInfo = { name: query || domain, domain, sector: '', location: '', employee_count: '', mx_valid: mx.hasMx }
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
  } else if (c.env.GEMINI_API_KEY) {
    // Website scraping failed/insufficient, ask Gemini about the company directly
    try {
      const fallbackPrompt = `"${query || domain}" firmasi hakkinda bilgi ver.

KURALLAR:
- Bildiklerini yaz, bilmiyorsan null yaz
- Tahmin etme

JSON formatinda don:
{
  "company_name": "...",
  "description": "1-2 cumle" veya null,
  "sector": "..." veya null,
  "location": "..." veya null,
  "employee_count": "..." veya null,
  "people": []
}`
      const raw = await callGemini(fallbackPrompt, c.env.GEMINI_API_KEY)
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
      }
    } catch {}
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

// ─── POST /reveal ── Reveal a single person ──────────────────

router.post('/reveal', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const plan = user?.plan || 'free'

  const { person_id, domain } = await c.req.json()
  if (!person_id || !domain) return c.json({ error: 'person_id ve domain gerekli' }, 400)

  // Check if already revealed
  const idx = parseInt(person_id.split('-').pop())
  const cached = await getCachedDomain(c.env.DB, domain)
  if (!cached || !cached.people[idx]) return c.json({ error: 'Kisi bulunamadi. Tekrar arama yapin.' }, 404)

  const person = cached.people[idx]
  const email = person.emails?.[0]
  if (!email) return c.json({ error: 'Bu kisi icin email adresi bulunamadi' }, 404)

  // Check if already revealed by this user
  const existing = await c.env.DB.prepare(
    'SELECT * FROM email_reveals WHERE user_id = ? AND email = ?'
  ).bind(userId, email).first()

  if (existing) {
    const credits = await getOrCreateCredits(c.env.DB, userId, plan)
    return c.json({
      person_name: existing.person_name,
      person_title: existing.person_title,
      email: existing.email,
      verification_status: existing.verification_status,
      confidence_score: existing.confidence_score,
      source: existing.source,
      credits_remaining: credits.monthly_limit - credits.used_this_month,
      already_revealed: true,
    })
  }

  // Credit check
  const credits = await getOrCreateCredits(c.env.DB, userId, plan)
  if (credits.used_this_month >= credits.monthly_limit) {
    return c.json({
      error: 'Aylik krediniz doldu. Paketinizi yukseltin.',
      credits_remaining: 0,
      monthly_limit: credits.monthly_limit,
    }, 403)
  }

  // Compute verification
  const v = computeVerification(email, cached.emails_raw, !!cached.mx_provider, cached.has_catchall)

  // Save reveal
  const revealId = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO email_reveals (id, user_id, domain, person_name, person_title, email, verification_status, confidence_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(revealId, userId, domain, person.name, person.title || '', email, v.status, v.confidence, v.source).run()

  // Deduct credit
  await deductCredit(c.env.DB, userId)

  return c.json({
    person_name: person.name,
    person_title: person.title,
    email,
    verification_status: v.status,
    confidence_score: v.confidence,
    source: v.source,
    credits_remaining: credits.monthly_limit - credits.used_this_month - 1,
    already_revealed: false,
  })
})

// ─── POST /bulk-reveal ── Reveal multiple people ─────────────

router.post('/bulk-reveal', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const plan = user?.plan || 'free'

  const { person_ids, domain } = await c.req.json()
  if (!Array.isArray(person_ids) || !domain) return c.json({ error: 'person_ids ve domain gerekli' }, 400)

  const cached = await getCachedDomain(c.env.DB, domain)
  if (!cached) return c.json({ error: 'Once arama yapin' }, 404)

  const credits = await getOrCreateCredits(c.env.DB, userId, plan)

  // Filter out already revealed and no-email persons
  const toReveal = []
  for (const pid of person_ids) {
    const idx = parseInt(pid.split('-').pop())
    const person = cached.people[idx]
    if (!person || !person.emails?.[0]) continue
    const existing = await c.env.DB.prepare('SELECT id FROM email_reveals WHERE user_id = ? AND email = ?')
      .bind(userId, person.emails[0]).first()
    if (!existing) toReveal.push({ idx, person, email: person.emails[0] })
  }

  const available = credits.monthly_limit - credits.used_this_month
  if (toReveal.length > available) {
    return c.json({
      error: `Yetersiz kredi. ${toReveal.length} reveal icin krediniz yok (kalan: ${available}).`,
      credits_remaining: available,
    }, 403)
  }

  const revealed = []
  for (const item of toReveal) {
    const v = computeVerification(item.email, cached.emails_raw, !!cached.mx_provider, cached.has_catchall)
    await c.env.DB.prepare(
      `INSERT INTO email_reveals (id, user_id, domain, person_name, person_title, email, verification_status, confidence_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, domain, item.person.name, item.person.title || '',
      item.email, v.status, v.confidence, v.source).run()
    await deductCredit(c.env.DB, userId)
    revealed.push({
      person_id: `${domain}-${item.idx}`,
      person_name: item.person.name,
      person_title: item.person.title,
      email: item.email,
      verification_status: v.status,
      confidence_score: v.confidence,
    })
  }

  return c.json({
    revealed,
    credits_used: revealed.length,
    credits_remaining: available - revealed.length,
  })
})

// ─── GET /credits ────────────────────────────────────────────

router.get('/credits', async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const credits = await getOrCreateCredits(c.env.DB, userId, user?.plan || 'free')
  return c.json({
    monthly_limit: credits.monthly_limit,
    used_this_month: credits.used_this_month,
    remaining: credits.monthly_limit - credits.used_this_month,
    reset_date: credits.reset_date,
    plan: user?.plan || 'free',
  })
})

// ─── GET /reveals ── User's reveal history ───────────────────

router.get('/reveals', async (c) => {
  const userId = c.get('userId')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '25')
  const domainFilter = c.req.query('domain') || null
  const offset = (page - 1) * limit

  let query = 'SELECT * FROM email_reveals WHERE user_id = ?'
  let countQuery = 'SELECT COUNT(*) as total FROM email_reveals WHERE user_id = ?'
  const params = [userId]

  if (domainFilter) {
    query += ' AND domain = ?'
    countQuery += ' AND domain = ?'
    params.push(domainFilter)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

  const [rows, countRow] = await Promise.all([
    c.env.DB.prepare(query).bind(...params, limit, offset).all(),
    c.env.DB.prepare(countQuery).bind(...params).all(),
  ])

  return c.json({
    reveals: rows.results || [],
    total: countRow.results?.[0]?.total || 0,
    page,
    limit,
  })
})

// ─── POST /export ── CSV export of reveals ───────────────────

router.post('/export', async (c) => {
  const userId = c.get('userId')
  const rows = await c.env.DB.prepare(
    'SELECT * FROM email_reveals WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  const results = rows.results || []
  let csv = 'Name,Title,Email,Domain,Status,Confidence,Source,Date\n'
  for (const r of results) {
    csv += `"${r.person_name}","${r.person_title || ''}","${r.email}","${r.domain}","${r.verification_status}",${r.confidence_score},"${r.source}","${r.created_at}"\n`
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="askdesk-email-reveals.csv"',
    },
  })
})

// ─── POST /compose ── Generate personalized outreach email ───

router.post('/compose', async (c) => {
  const userId = c.get('userId')
  const { person_name, person_title, email, company_name, company_domain, company_sector, company_description } = await c.req.json()

  if (!email || !company_name) return c.json({ error: 'Email ve firma adi gerekli' }, 400)

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'AI servisi yapilandirilmamis' }, 500)

  // Get user's company profile for value proposition
  const profile = await c.env.DB.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()

  const senderInfo = profile ? `
Gonderen Firma: ${profile.company_name || ''}
Sektor: ${profile.sector || ''}
Deger Onerisi: ${profile.value_proposition || ''}
Urunler/Hizmetler: ${profile.products_services || ''}
Hedef Kitle: ${profile.target_audience || ''}
Ton: ${profile.tone || 'professional'}` : ''

  const prompt = `Asagidaki bilgilere gore kisa, profesyonel ve kisisellestirilmis bir satis/outreach emaili yaz.

Alici:
- Isim: ${person_name || 'Yetkili'}
- Unvan: ${person_title || ''}
- Firma: ${company_name}
- Sektor: ${company_sector || ''}
- Firma Aciklamasi: ${company_description || ''}
${senderInfo}

KURALLAR:
- Email Turkce olsun
- Konu satiri + email govdesi yaz
- Alicinin firmasina ozel deger onerisi sun
- Kisa ve net ol (max 150 kelime govde)
- Satis jargonu kullanma, samimi ama profesyonel ol
- Kesinlikle markdown kullanma (# * ** gibi isaret kullanma)
- CTA olarak kisa bir gorusme talebi ekle

JSON formatinda don:
{
  "subject": "Konu satiri",
  "body": "Email govdesi"
}`

  try {
    const raw = await callGemini(prompt, apiKey)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return c.json({ subject: parsed.subject || '', body: parsed.body || '' })
    }
    return c.json({ error: 'Email olusturulamadi' }, 500)
  } catch {
    return c.json({ error: 'AI servisi hatasi' }, 500)
  }
})

export default router
