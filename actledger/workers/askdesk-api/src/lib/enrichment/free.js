import { applyPattern, nameParts, derivePattern } from './patterns.js'

// ─── Constants ───────────────────────────────────────────────

const SCRAPE_PAGES = [
  '/', '/contact', '/contact-us', '/contactus', '/iletisim', '/tr/iletisim', '/en/contact',
  '/about', '/about-us', '/aboutus', '/hakkimizda', '/tr/hakkimizda', '/en/about',
  '/team', '/our-team', '/ekibimiz', '/yonetim', '/tr/yonetim', '/management',
  '/kurumsal', '/tr/kurumsal', '/impressum',
]
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

export async function callGemini(prompt, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  )
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || ''
}

// ─── Domain Cleaning ─────────────────────────────────────────

export function cleanDomain(raw) {
  if (!raw) return ''
  let d = raw.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]    // remove path
  d = d.split('?')[0]    // remove query
  d = d.split('#')[0]    // remove hash
  d = d.split(':')[0]    // remove port
  d = d.trim()
  // Validate it looks like a domain
  if (!d || !d.includes('.') || d.includes(' ') || d.length > 80) return ''
  return d
}

// ─── Email Pattern Generation ────────────────────────────────

export function generateEmailPatterns(personName, domain) {
  if (!personName || !domain) return []
  const clean = cleanDomain(domain)
  if (!clean) return []
  // Turkish char transliteration for email patterns
  const turkishMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' }
  const ascii = personName.split('').map(c => turkishMap[c] || c).join('')
  const parts = ascii.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)
  if (parts.length < 2) return parts[0] ? [`${parts[0]}@${clean}`] : []
  const first = parts[0], last = parts[parts.length - 1]
  const patterns = [
    `${first}.${last}@${clean}`, `${first}${last}@${clean}`,
    `${first[0]}.${last}@${clean}`, `${first}_${last}@${clean}`,
    `${first}.${last[0]}@${clean}`, `${first}@${clean}`, `${last}@${clean}`,
  ]
  return [...new Set(patterns)]
}

// ─── Domain Utilities ────────────────────────────────────────

export function extractDomainFromUrl(url) {
  if (!url) return null
  try {
    let d = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase()
    return d || null
  } catch { return null }
}

export async function checkMxRecords(domain) {
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

export function detectCatchAll(mxHosts) {
  const mxStr = mxHosts.join(' ').toLowerCase()
  return CATCHALL_PROVIDERS.some(p => mxStr.includes(p))
}

// ─── Web Scraping ────────────────────────────────────────────

export async function fetchPageText(url) {
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

export function extractEmailsFromHtml(html) {
  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
  return [...new Set(matches)].filter(e => {
    const local = e.split('@')[0] || ''
    const domain = e.split('@')[1]?.toLowerCase() || ''
    if (!domain || !domain.includes('.')) return false
    if (FALSE_POSITIVE_DOMAINS.some(fp => domain.includes(fp))) return false
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|json|xml|woff|ttf|eot)$/i.test(e)) return false
    if (domain.includes('://') || domain.includes('/')) return false
    if (local.length < 2 || local.length > 64) return false
    if (domain.length > 80) return false
    return true
  })
}

export function extractPhonesFromHtml(html) {
  // Match Turkish and international phone patterns
  const patterns = [
    /(?:\+90|0090)[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    /\(0?\d{3}\)\s?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
    /(?:\+\d{1,3})[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{2,4}/g,
    /0\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g,
  ]
  const phones = new Set()
  for (const pat of patterns) {
    const matches = html.match(pat) || []
    for (const m of matches) {
      const digits = m.replace(/[\s.()-]/g, '')
      if (digits.length >= 10 && digits.length <= 15) phones.add(m.trim())
    }
  }
  return [...phones]
}

export async function scrapeWebsite(domain) {
  const fetches = SCRAPE_PAGES.map(p =>
    fetchPageText(`https://${domain}${p}`).then(text => ({ path: p, text }))
  )
  const results = await Promise.allSettled(fetches)
  let allText = '', allEmails = [], allPhones = [], pagesScraped = []

  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value.text || r.value.text.length < 100) continue
    pagesScraped.push(r.value.path)
    allText += r.value.text + '\n'
    allEmails.push(...extractEmailsFromHtml(r.value.text))
    allPhones.push(...extractPhonesFromHtml(r.value.text))
  }

  return { text: allText.slice(0, 30000), emails: [...new Set(allEmails)], phones: [...new Set(allPhones)], pagesScraped }
}

// ─── Masking ─────────────────────────────────────────────────

export function maskName(name) {
  if (!name) return '***'
  const parts = name.split(' ')
  return parts.map(p => p[0] + '***').join(' ')
}

export function maskEmail(email) {
  if (!email) return '***@***.com'
  const [local, domain] = email.split('@')
  return local[0] + '***@' + domain
}

export function maskPhone(phone) {
  if (!phone) return null
  return phone.slice(0, 4) + '****'
}

// ─── Classification ─────────────────────────────────────────

// Short acronyms (<=3 chars like "cto", "vp", "ui") need word boundaries so
// "cto" inside "director" or "ui" inside "building" don't false-match. Longer
// keywords keep substring matching to stay lenient with Turkish suffixes
// (e.g. "mudur" in "muduru", "muhendis" in "muhendisi").
function keywordMatch(text, keywords) {
  return keywords.some(k => {
    if (k.length <= 3) {
      const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${esc}\\b`).test(text)
    }
    return text.includes(k)
  })
}

export function classifySeniority(title) {
  if (!title) return 'Staff'
  const lower = title.toLowerCase()
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (level === 'Staff') continue
    if (keywordMatch(lower, keywords)) return level
  }
  return 'Staff'
}

export function classifyDepartment(title) {
  if (!title) return 'Other'
  const lower = title.toLowerCase()
  for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    if (keywordMatch(lower, keywords)) return dept
  }
  return 'Other'
}

// ─── Verification ────────────────────────────────────────────

export function computeVerification(email, websiteEmails, hasMx, hasCatchAll) {
  const onWebsite = websiteEmails.some(we => we.toLowerCase() === email.toLowerCase())
  if (onWebsite) return { status: 'verified', confidence: 95, source: 'website' }
  if (!hasMx) return { status: 'unknown', confidence: 10, source: 'pattern' }
  if (hasCatchAll) return { status: 'risky', confidence: 40, source: 'pattern' }
  return { status: 'likely', confidence: 72, source: 'pattern' }
}

// ─── Free Provider ───────────────────────────────────────────

export function createFreeProvider(env, helpers) {
  const apiKey = env.GEMINI_API_KEY

  async function domainSearch(domain) {
    const [mx, scrape] = await Promise.all([checkMxRecords(domain), scrapeWebsite(domain)])
    const hasCatchAll = detectCatchAll(mx.mxHosts)
    let company = { name: domain, domain, description: '', sector: '', location: '', employee_count: '', company_phones: [], mx_valid: mx.hasMx }
    let rawPeople = []

    if (scrape.text.length > 200 && apiKey) {
      try {
        const prompt = buildExtractPrompt(scrape)
        const raw = await callGemini(prompt, apiKey)
        const parsed = parseJson(raw)
        if (parsed) {
          company = {
            name: parsed.company_name || domain, domain,
            description: parsed.description || '', sector: parsed.sector || '',
            location: parsed.location || '', employee_count: parsed.employee_count || '',
            company_phones: [...new Set([...(parsed.company_phones || []), ...scrape.phones])],
            mx_valid: mx.hasMx,
          }
          if (Array.isArray(parsed.people)) rawPeople = parsed.people.filter(p => p.name && p.name.length > 1)
        }
      } catch {}
    }

    const websiteEmails = scrape.emails
    const people = rawPeople.map(p => {
      const patterns = generateEmailPatterns(p.name, domain)
      const matched = patterns.find(pat => websiteEmails.some(we => we.toLowerCase() === pat.toLowerCase()))
      const email = matched || patterns[0] || null
      return {
        first_name: '', last_name: '', name: p.name, title: p.title || '',
        department: classifyDepartment(p.title), seniority: classifySeniority(p.title),
        email, email_type: 'personal',
        confidence: matched ? 90 : (mx.hasMx ? 60 : 20),
        phone: p.phone || null, linkedin: null, sources: [],
        verification_status: computeVerification(email || '', websiteEmails, mx.hasMx, hasCatchAll).status,
        source: matched ? 'website' : 'pattern',
      }
    })

    const assigned = new Set(people.map(p => (p.email || '').toLowerCase()))
    for (const we of websiteEmails) {
      if (assigned.has(we.toLowerCase())) continue
      if (we.split('@')[1]?.toLowerCase() !== domain) continue
      people.push({
        first_name: '', last_name: '', name: we.split('@')[0].replace(/[._]/g, ' '), title: '',
        department: 'Other', seniority: 'Staff', email: we, email_type: 'generic',
        confidence: 90, phone: null, linkedin: null, sources: [],
        verification_status: 'verified', source: 'website',
      })
    }

    return { company, people, _mx: mx, _hasCatchAll: hasCatchAll }
  }

  async function findEmail(firstName, lastName, domain) {
    const name = [firstName, lastName].filter(Boolean).join(' ')
    const learned = await getLearnedPattern(env.DB, domain)
    if (learned) {
      const email = applyPattern(learned.pattern, name, domain)
      if (email) return { email, confidence: learned.confidence, source: 'pattern' }
    }
    const patterns = generateEmailPatterns(name, domain)
    return patterns[0] ? { email: patterns[0], confidence: 40, source: 'pattern' } : null
  }

  async function verifyEmail(email) {
    const domain = email.split('@')[1]
    if (!domain) return { status: 'unknown', confidence: 0, source: 'pattern' }
    const mx = await checkMxRecords(domain)
    if (!mx.hasMx) return { status: 'unknown', confidence: 10, source: 'pattern' }
    const hasCatchAll = detectCatchAll(mx.mxHosts)
    if (hasCatchAll) return { status: 'risky', confidence: 40, source: 'pattern' }
    return { status: 'likely', confidence: 72, source: 'pattern' }
  }

  return { domainSearch, findEmail, verifyEmail }
}

function buildExtractPrompt(scrape) {
  return `Extract company information and people from this website content AND your knowledge.

WEBSITE CONTENT:
${scrape.text.slice(0, 12000)}

EMAILS FOUND ON WEBSITE: ${scrape.emails.join(', ') || 'none'}
PHONES FOUND ON WEBSITE: ${scrape.phones.join(', ') || 'none'}

INSTRUCTIONS:
1. Extract company info (name, sector, description, location, employee count)
2. List ALL real people found on the website with names, titles, phone if shown
3. ALSO add publicly known executives/founders/C-level of this company you are confident about
4. Do NOT hallucinate or invent people
5. Include company-level phones in company_phones

Respond in JSON only:
{"company_name":"...","description":"1-2 sentences","sector":"...","location":"...","employee_count":"...","company_phones":["..."],"people":[{"name":"Full Name","title":"Title","phone":"phone or null"}]}`
}

function parseJson(raw) {
  const m = raw && raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

export async function getLearnedPattern(db, domain) {
  const row = await db.prepare('SELECT pattern, confidence FROM domain_patterns WHERE domain = ?').bind(domain).first()
  return row || null
}

export async function saveLearnedPattern(db, domain, people) {
  for (const p of people) {
    if (!p.email || p.email_type === 'generic') continue
    if (p.verification_status !== 'verified' && p.confidence < 80) continue
    const token = derivePattern(p.email, p.name)
    if (token) {
      await db.prepare(
        `INSERT OR REPLACE INTO domain_patterns (domain, pattern, confidence, sample_email, learned_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(domain, token, p.confidence || 80, p.email).run()
      return token
    }
  }
  return null
}
