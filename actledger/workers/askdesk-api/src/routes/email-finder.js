import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import {
  callGemini, cleanDomain, generateEmailPatterns, checkMxRecords, detectCatchAll,
  scrapeWebsite, maskName, maskEmail, maskPhone, classifySeniority, classifyDepartment,
  getLearnedPattern, saveLearnedPattern,
} from '../lib/enrichment/free.js'
import { createEnrichment } from '../lib/enrichment/index.js'

const router = new Hono()
router.use('*', authMiddleware)

// ─── Constants ───────────────────────────────────────────────

const PLAN_LIMITS = { free: 25, pro: 300, growth: 1500, team: 1000 }
const CACHE_TTL_HOURS = 168

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
  await db.prepare(`INSERT OR REPLACE INTO domain_cache (domain, company_info, people, emails_raw, has_catchall, mx_provider, provider, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .bind(domain, JSON.stringify(data.company_info), JSON.stringify(data.people),
      JSON.stringify(data.emails_raw), data.has_catchall ? 1 : 0, data.mx_provider || '', data.provider || 'free')
    .run()
}

// ─── POST /search ── Find people at a company ───────────────

router.post('/search', async (c) => {
  const userId = c.get('userId')
  const { query, domain: inputDomain, company_id } = await c.req.json()

  // Resolve domain
  let domain = cleanDomain(inputDomain)
  if (!domain && company_id) {
    const company = await c.env.DB.prepare('SELECT website FROM companies WHERE id = ? AND user_id = ?')
      .bind(company_id, userId).first()
    domain = cleanDomain(company?.website)
  }
  if (!domain && query) {
    const cleaned = cleanDomain(query)
    if (cleaned) {
      domain = cleaned
    } else if (c.env.GEMINI_API_KEY) {
      try {
        const domainPrompt = `"${query}" firmasinin web sitesi domain adresini bul. SADECE domain adresini yaz, baska hicbir sey yazma. Ornek: getir.com`
        const domainGuess = await callGemini(domainPrompt, c.env.GEMINI_API_KEY)
        domain = cleanDomain(domainGuess.split('\n')[0])
      } catch {}
    }
  }
  if (!domain) return c.json({ error: 'Domain bulunamadi. Lutfen domain adresini girin (ornek: firma.com)' }, 400)

  // Cache
  const cached = await getCachedDomain(c.env.DB, domain)
  const helpers = { classifySeniority, classifyDepartment }

  let people, companyInfo, hasCatchAll, mxProvider
  if (cached) {
    people = cached.people
    companyInfo = cached.company_info
    hasCatchAll = cached.has_catchall
    mxProvider = cached.mx_provider
  } else {
    const enrichment = createEnrichment(c.env, helpers)
    const result = await enrichment.domainSearch(domain)

    // Firma açıklaması için ücretsiz scrape ile tamamla (Hunter description vermez)
    const scrape = await scrapeWebsite(domain).catch(() => ({ emails: [], phones: [], text: '' }))
    if (!result.company.description && scrape.text.length > 200 && c.env.GEMINI_API_KEY) {
      try {
        const raw = await callGemini(
          `Bu firma hakkında 1-2 cümlelik kısa açıklama ve sektör bilgisi ver. Site: ${domain}\nİçerik: ${scrape.text.slice(0, 4000)}\nJSON: {"description":"...","sector":"..."}`,
          c.env.GEMINI_API_KEY
        )
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) { const j = JSON.parse(m[0]); result.company.description = j.description || ''; if (!result.company.sector) result.company.sector = j.sector || '' }
      } catch {}
    }

    people = result.people
    companyInfo = result.company
    const mx = await checkMxRecords(domain)
    hasCatchAll = detectCatchAll(mx.mxHosts)
    mxProvider = mx.mxHosts[0] || ''
    companyInfo.mx_valid = mx.hasMx

    await saveLearnedPattern(c.env.DB, domain, people).catch(() => {})
    await setCachedDomain(c.env.DB, domain, {
      company_info: companyInfo, people, emails_raw: people.filter(p => p.email).map(p => p.email),
      has_catchall: hasCatchAll, mx_provider: mxProvider, provider: result.provider,
    })
  }

  const revealed = await c.env.DB.prepare(
    'SELECT email, person_name, verification_status, confidence_score FROM email_reveals WHERE user_id = ? AND domain = ?'
  ).bind(userId, domain).all()
  const revealedMap = {}
  for (const r of (revealed.results || [])) revealedMap[r.email] = r

  const maskedPeople = people.map((p, i) => {
    const rev = p.email ? revealedMap[p.email] : null
    return {
      id: `${domain}-${i}`,
      masked_name: rev ? p.name : maskName(p.name),
      full_name: rev ? p.name : null,
      title: p.title,
      department: p.department,
      seniority: p.seniority,
      masked_email: rev ? p.email : maskEmail(p.email),
      full_email: rev ? p.email : null,
      masked_phone: p.phone ? (rev ? p.phone : maskPhone(p.phone)) : null,
      full_phone: rev ? (p.phone || null) : null,
      revealed: !!rev,
      verification_status: rev?.verification_status || p.verification_status || null,
      confidence_score: rev?.confidence_score ?? p.confidence ?? null,
      source: p.source,
    }
  })

  return c.json({
    company: companyInfo,
    people: maskedPeople,
    total_count: maskedPeople.length,
    has_catchall: hasCatchAll,
    mx_provider: mxProvider,
    from_cache: !!cached,
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
  let email = person.email
  if (!email) {
    const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
    const found = await enrichment.findEmail(person.first_name || person.name?.split(' ')[0] || '', person.last_name || person.name?.split(' ').slice(-1)[0] || '', domain)
    if (!found?.email) return c.json({ error: 'Bu kisi icin email adresi bulunamadi' }, 404)
    email = found.email
    person.verification_status = person.verification_status || 'unknown'
    person.confidence = found.confidence
  }

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
      phone: person.phone || null,
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
  const vStatus = person.verification_status || 'unknown'
  const vConfidence = person.confidence ?? 0

  // Save reveal
  const revealId = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO email_reveals (id, user_id, domain, person_name, person_title, email, verification_status, confidence_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(revealId, userId, domain, person.name, person.title || '', email, vStatus, vConfidence, person.source || 'pattern').run()

  // Deduct credit
  await deductCredit(c.env.DB, userId)

  return c.json({
    person_name: person.name,
    person_title: person.title,
    email,
    phone: person.phone || null,
    verification_status: vStatus,
    confidence_score: vConfidence,
    source: person.source || 'pattern',
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
    if (!person || !person.email) continue
    const existing = await c.env.DB.prepare('SELECT id FROM email_reveals WHERE user_id = ? AND email = ?')
      .bind(userId, person.email).first()
    if (!existing) toReveal.push({ idx, person, email: person.email })
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
    const vStatus = item.person.verification_status || 'unknown'
    const vConfidence = item.person.confidence ?? 0
    await c.env.DB.prepare(
      `INSERT INTO email_reveals (id, user_id, domain, person_name, person_title, email, verification_status, confidence_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, domain, item.person.name, item.person.title || '',
      item.email, vStatus, vConfidence, item.person.source || 'pattern').run()
    await deductCredit(c.env.DB, userId)
    revealed.push({
      person_id: `${domain}-${item.idx}`,
      person_name: item.person.name,
      person_title: item.person.title,
      email: item.email,
      phone: item.person.phone || null,
      verification_status: vStatus,
      confidence_score: vConfidence,
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

// ─── POST /verify ── Verify a revealed email and earn credits ─

router.post('/verify', async (c) => {
  const userId = c.get('userId')
  const { email } = await c.req.json()
  if (!email) return c.json({ error: 'Email gerekli' }, 400)

  const reveal = await c.env.DB.prepare('SELECT * FROM email_reveals WHERE user_id = ? AND email = ?')
    .bind(userId, email).first()
  if (!reveal) return c.json({ error: 'Bu email henuz reveal edilmemis' }, 404)
  if (reveal.verification_status === 'verified') return c.json({ status: 'verified', already_verified: true })

  const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
  const v = await enrichment.verifyEmail(email)

  await c.env.DB.prepare('UPDATE email_reveals SET verification_status = ?, confidence_score = ? WHERE user_id = ? AND email = ?')
    .bind(v.status, v.confidence, userId, email).run()

  return c.json({ status: v.status, confidence_score: v.confidence })
})

// ─── POST /export ── CSV export of reveals ───────────────────

router.post('/export', async (c) => {
  const userId = c.get('userId')
  const rows = await c.env.DB.prepare(
    'SELECT * FROM email_reveals WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all()

  const results = rows.results || []
  let csv = 'Name,Title,Email,Phone,Domain,Status,Confidence,Source,Date\n'
  for (const r of results) {
    csv += `"${r.person_name}","${r.person_title || ''}","${r.email}","${r.phone || ''}","${r.domain}","${r.verification_status}",${r.confidence_score},"${r.source}","${r.created_at}"\n`
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

// ─── POST /auto-outreach ── One-button: find company + pick contact + compose email ───

router.post('/auto-outreach', async (c) => {
  const userId = c.get('userId')
  const { query, sector, company_size, location, local_language } = await c.req.json()

  const apiKey = c.env.GEMINI_API_KEY
  if (!apiKey) return c.json({ error: 'AI servisi yapilandirilmamis' }, 500)

  // Get user's company profile
  const profile = await c.env.DB.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()

  const senderInfo = profile ? `
Gonderen Firma: ${profile.company_name || ''}
Sektor: ${profile.sector || ''}
Deger Onerisi: ${profile.value_proposition || ''}
Urunler/Hizmetler: ${profile.products_services || ''}
Hedef Kitle: ${profile.target_audience || ''}
Ton: ${profile.tone || 'professional'}` : ''

  const q = query?.trim() || ''
  const hasCriteria = sector || company_size || location

  if (!q && !hasCriteria) return c.json({ error: 'En az bir kriter girin (firma adi, sektor, buyukluk veya lokasyon)' }, 400)

  // Find company, analyze, and compose targeted email
  let domain = null

  if (q) {
    // User provided a company name or domain
    const cleaned = cleanDomain(q)
    if (cleaned) {
      domain = cleaned
    } else {
      try {
        const domainPrompt = `"${q}" firmasinin web sitesi domain adresini bul. SADECE domain adresini yaz, baska hicbir sey yazma. Ornek: getir.com`
        const domainGuess = await callGemini(domainPrompt, apiKey)
        domain = cleanDomain(domainGuess.split('\n')[0])
      } catch {}
    }
  } else {
    // No company name - discover a company from criteria
    const criteriaLines = []
    if (sector) criteriaLines.push(`Sector: ${sector}`)
    if (company_size) criteriaLines.push(`Company size: ${company_size} employees`)
    if (location) criteriaLines.push(`Location: ${location}`)
    try {
      const discoverPrompt = `Find a real, well-known, active company that matches these criteria:
${criteriaLines.join('\n')}

RULES:
- Choose a REAL, existing company. Do NOT invent or hallucinate.
- The company must be well-known in that sector and location.
- Reply with ONLY the company's website domain, nothing else.
- Format: just the domain like "company.com"

Examples of correct answers:
siemens.com
toyota.co.jp
emirates.com`
      const raw = await callGemini(discoverPrompt, apiKey)
      // Try to extract a valid domain from the response
      const lines = raw.trim().split('\n')
      for (const line of lines) {
        const d = cleanDomain(line.replace(/[`*"']/g, ''))
        if (d) { domain = d; break }
      }
    } catch {}
  }
  if (!domain) return c.json({ error: 'Kriterlere uygun firma bulunamadi. Firma adi veya domain girin.' }, 400)

  // Get company info + people (check cache first)
  let cached = await getCachedDomain(c.env.DB, domain)
  let companyInfo, peopleList

  if (cached) {
    companyInfo = cached.company_info
    peopleList = cached.people
  } else {
    const [mx, scrapeResult] = await Promise.all([checkMxRecords(domain), scrapeWebsite(domain)])
    companyInfo = { name: q || domain, domain, sector: '', location: '', employee_count: '', company_phones: [], mx_valid: mx.hasMx }
    peopleList = []
    const hasCatchAll = detectCatchAll(mx.mxHosts)

    if (scrapeResult.text.length > 200) {
      try {
        const prompt = `Extract company information and people from this website content AND your knowledge.

WEBSITE CONTENT:
${scrapeResult.text.slice(0, 12000)}

EMAILS FOUND: ${scrapeResult.emails.join(', ') || 'none'}
PHONES FOUND: ${scrapeResult.phones.join(', ') || 'none'}

INSTRUCTIONS:
1. Extract company info (name, sector, description, location, employee count)
2. List ALL real people found on the website AND publicly known executives/founders from your knowledge
3. Do NOT hallucinate. Only include people you are confident about.

Respond in JSON only:
{"company_name":"...","description":"1-2 sentences","sector":"...","location":"...","employee_count":"...","company_phones":["..."],"people":[{"name":"Full Name","title":"Title","phone":"phone or null"}]}`
        const raw = await callGemini(prompt, apiKey)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const companyPhones = [...new Set([...(parsed.company_phones || []), ...scrapeResult.phones])]
          companyInfo = { name: parsed.company_name || q || domain, domain, description: parsed.description || '', sector: parsed.sector || '', location: parsed.location || '', employee_count: parsed.employee_count || '', company_phones: companyPhones, mx_valid: mx.hasMx }
          if (Array.isArray(parsed.people)) peopleList = parsed.people.filter(p => p.name && p.name.length > 1)
        }
      } catch {}
    } else {
      try {
        const fallbackPrompt = `Provide information about the company "${q || domain}".

INSTRUCTIONS:
1. Provide company info (name, sector, description, location, employee count)
2. List ONLY people who are PUBLICLY KNOWN to work there (CEO, founders, board members, C-level)
3. Do NOT hallucinate. If unsure, leave people array empty.

Respond in JSON only:
{"company_name":"...","description":"1-2 sentences","sector":"...","location":"...","employee_count":"...","people":[{"name":"Full Name","title":"Title","phone":"phone or null"}]}`
        const raw = await callGemini(fallbackPrompt, apiKey)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          companyInfo = { name: parsed.company_name || q || domain, domain, description: parsed.description || '', sector: parsed.sector || '', location: parsed.location || '', employee_count: parsed.employee_count || '', company_phones: [], mx_valid: mx.hasMx }
          if (Array.isArray(parsed.people)) peopleList = parsed.people.filter(p => p.name && p.name.length > 1)
        }
      } catch {}
    }

    const websiteEmails = scrapeResult.emails
    peopleList = peopleList.map(p => {
      const patterns = generateEmailPatterns(p.name, domain)
      const matchedWebsite = patterns.find(pat => websiteEmails.some(we => we.toLowerCase() === pat.toLowerCase()))
      const bestEmail = matchedWebsite || patterns[0] || null
      return { ...p, emails: bestEmail ? [bestEmail] : [] }
    })

    // Add website emails that don't belong to any found person
    const assignedEmails = new Set(peopleList.flatMap(p => p.emails.map(e => e.toLowerCase())))
    for (const we of websiteEmails) {
      if (!assignedEmails.has(we.toLowerCase())) {
        const localPart = we.split('@')[0]
        // Skip generic prefixes like info@, skip if domain doesn't match
        const emailDomain = we.split('@')[1]?.toLowerCase()
        if (emailDomain && emailDomain === domain) {
          peopleList.push({ name: localPart.replace(/[._]/g, ' '), title: '', emails: [we] })
        }
      }
    }

    await setCachedDomain(c.env.DB, domain, {
      company_info: companyInfo, people: peopleList, emails_raw: websiteEmails || [],
      has_catchall: hasCatchAll, mx_provider: mx.mxHosts?.[0] || '',
    })
  }

  // Pick best contact - prefer real people, fallback to info@
  const seniorityOrder = ['C-Level', 'VP', 'Director', 'Manager', 'Staff']
  let bestPerson = peopleList[0]
  let bestRank = 99
  for (const p of peopleList) {
    const rank = seniorityOrder.indexOf(classifySeniority(p.title))
    if (rank >= 0 && rank < bestRank) { bestRank = rank; bestPerson = p }
  }

  const contactEmail = bestPerson?.emails?.[0] || `info@${domain}`
  const contactName = bestPerson?.name || 'Yetkili'
  const contactTitle = bestPerson?.title || ''

  // Build target info from form + scraped data
  const targetSector = sector || companyInfo.sector || ''
  const targetSize = company_size || companyInfo.employee_count || ''
  const targetLocation = location || companyInfo.location || ''

  // Determine email language based on company location
  const langInstruction = targetLocation
    ? `- Email'i su lokasyona uygun yerel dilde yaz: ${targetLocation} (ornegin Almanya icin Almanca, Japonya icin Japonca, BAE/Dubai icin Arapca, ABD/UK icin Ingilizce, Fransa icin Fransizca, Turkiye icin Turkce vb.)`
    : '- Email Turkce olsun'

  const composePrompt = `Write a professional B2B outreach email based on the following information.

RECIPIENT COMPANY:
- Name: ${companyInfo.name}
- Domain: ${domain}
- Sector: ${targetSector}
- Company Size: ${targetSize}
- Location: ${targetLocation}
- Description: ${companyInfo.description || 'N/A'}

SENDER COMPANY:
${senderInfo || '(No sender profile configured)'}

EMAIL FORMAT - FOLLOW THIS STRUCTURE EXACTLY:
1. Start with "Sayin Yoneticiler merhaba," (or equivalent formal greeting in the target language)
2. Reference the company's industry standing or trade chamber/association membership if relevant
3. Acknowledge the company's leadership and achievements in their sector - be specific to their actual business, not generic
4. Identify exactly 3 SPECIFIC operational challenges that companies in this EXACT sector face. Be very industry-specific (e.g., for steel: furnace efficiency, quality control in rolling, maintenance scheduling; for textiles: yarn waste optimization, dyeing consistency, supply chain visibility). Number them 1, 2, 3.
5. For each of the 3 challenges, propose a concrete solution from the sender's products/services. Format as bullet points with quantified benefits (e.g., "OEE %15 artis", "bakim maliyetlerinde %30 tasarruf", "%25 verimlilik artisi", "enerji tuketiminde %20 azalma")
6. End with a SOFT call-to-action: offer to send a 1-page flow chart or brief summary document. Do NOT request a meeting or phone call.
7. Sign off with "Saygilarimla," and sender company name
8. Do NOT use any markdown formatting (no #, *, ** symbols)
9. Email body should be 300-500 words - detailed and substantive, NOT a short cold email
${langInstruction}

Respond in JSON only:
{
  "subject": "Email subject line",
  "body": "Full email body text",
  "value_proposition": "1-2 sentence value proposition specific to this company"
}`

  try {
    const raw = await callGemini(composePrompt, apiKey)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const subject = parsed.subject || ''
      const body = parsed.body || ''

      // Save to outreach as draft
      const emailId = crypto.randomUUID()
      await c.env.DB.prepare(
        `INSERT INTO emails (id, user_id, subject, body, status) VALUES (?, ?, ?, ?, 'draft')`
      ).bind(emailId, userId, subject, body).run()

      return c.json({
        company: companyInfo,
        contact: { name: contactName, title: contactTitle, email: contactEmail },
        people_count: peopleList.length,
        subject,
        body,
        value_proposition: parsed.value_proposition || '',
        outreach_id: emailId,
      })
    }
    return c.json({ error: 'Email olusturulamadi' }, 500)
  } catch {
    return c.json({ error: 'AI servisi hatasi' }, 500)
  }
})

export default router
