import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import {
  callGemini, cleanDomain, checkMxRecords, detectCatchAll,
  scrapeWebsite, maskName, maskEmail, maskPhone, classifySeniority, classifyDepartment,
  saveLearnedPattern,
} from '../lib/enrichment/free.js'
import { createEnrichment } from '../lib/enrichment/index.js'
import { PLAN_LIMITS, getOrCreateCredits, deductCredit, checkCredits, hasCredits, creditsSnapshot } from '../lib/credits.js'
import { logActivity } from '../lib/activity.js'
import { cleanAiText } from '../lib/sanitize.js'

const router = new Hono()
router.use('*', authMiddleware)

// ─── Constants ───────────────────────────────────────────────

const CACHE_TTL_HOURS = 168

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

  await logActivity(c.env.DB, userId, {
    module: 'email-finder', action: 'search',
    title: companyInfo?.name || domain,
    detail: { domain, company: companyInfo, people_count: maskedPeople.length,
      people: maskedPeople.map(p => ({ name: p.masked_name, title: p.title, department: p.department, email: p.masked_email })) },
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
  // A website-scraped email is already real. For anything else (a pattern
  // guess or a missing address) run pattern + verification to return the
  // real, confirmed email.
  if (!email || person.source !== 'website') {
    const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
    const found = await enrichment.findVerifiedEmail(person.name, domain, c.env.DB)
    if (found?.email) {
      email = found.email
      person.verification_status = found.verification_status || person.verification_status || 'unknown'
      person.confidence = found.confidence
      person.source = found.source
      if (found.verification_status === 'verified') {
        await saveLearnedPattern(c.env.DB, domain, [{
          email, name: person.name, email_type: 'personal',
          verification_status: 'verified', confidence: found.confidence,
        }]).catch(() => {})
      }
    }
    if (!email) return c.json({ error: 'Bu kisi icin email adresi bulunamadi' }, 404)
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
      credits_remaining: credits.limits.outreach - credits.outreach_used,
      already_revealed: true,
    })
  }

  // Credit check
  const credits = await getOrCreateCredits(c.env.DB, userId, plan)
  if (!hasCredits(credits, 'outreach', 1)) return c.json({ error: 'Aylik krediniz doldu. Paketinizi yukseltin.', credit_type: 'outreach' }, 402)

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
  await deductCredit(c.env.DB, userId, 'outreach', 1)

  await logActivity(c.env.DB, userId, {
    module: 'email-finder', action: 'reveal',
    title: `${person.name} · ${domain}`,
    detail: { email, person_name: person.name, title: person.title, phone: person.phone || null, domain },
  })

  return c.json({
    person_name: person.name,
    person_title: person.title,
    email,
    phone: person.phone || null,
    verification_status: vStatus,
    confidence_score: vConfidence,
    source: person.source || 'pattern',
    credits_remaining: credits.limits.outreach - credits.outreach_used - 1,
    credits: await creditsSnapshot(c.env.DB, userId),
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

  const available = credits.limits.outreach - credits.outreach_used
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
    await deductCredit(c.env.DB, userId, 'outreach', 1)
    revealed.push({
      person_id: `${domain}-${item.idx}`,
      person_name: item.person.name,
      person_title: item.person.title,
      email: item.email,
      phone: item.person.phone || null,
      verification_status: vStatus,
      confidence_score: vConfidence,
      source: item.person.source || 'pattern',
    })
  }

  return c.json({
    revealed,
    credits_used: revealed.length,
    credits_remaining: available - revealed.length,
    credits: await creditsSnapshot(c.env.DB, userId),
  })
})

// ─── GET /credits ────────────────────────────────────────────

router.get('/credits', async (c) => {
  return c.json(await creditsSnapshot(c.env.DB, c.get('userId')))
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
    const src = r.source === 'website' ? 'website' : 'directory'
    csv += `"${r.person_name}","${r.person_title || ''}","${r.email}","${r.phone || ''}","${r.domain}","${r.verification_status}",${r.confidence_score},"${src}","${r.created_at}"\n`
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

  const chk = await checkCredits(c, 'outreach', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

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
      await deductCredit(c.env.DB, chk.userId, 'outreach', 1)
      await logActivity(c.env.DB, userId, {
        module: 'outreach', action: 'compose',
        title: `${person_name || 'Yetkili'} · ${company_name || ''}`.trim(),
        detail: { subject: parsed.subject || '', email, company_name },
      })
      return c.json({ subject: cleanAiText(parsed.subject || ''), body: cleanAiText(parsed.body || ''), credits: await creditsSnapshot(c.env.DB, chk.userId) })
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

  const chk = await checkCredits(c, 'outreach', 1)
  if (!chk.ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)

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

  // Firma + kişiler (cache -> orchestrator)
  let companyInfo, peopleList
  const cached = await getCachedDomain(c.env.DB, domain)
  if (cached) {
    companyInfo = cached.company_info
    peopleList = cached.people
  } else {
    const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
    const result = await enrichment.domainSearch(domain)
    companyInfo = result.company
    peopleList = result.people
    const mx = await checkMxRecords(domain)
    companyInfo.mx_valid = mx.hasMx
    await saveLearnedPattern(c.env.DB, domain, peopleList).catch(() => {})
    await setCachedDomain(c.env.DB, domain, {
      company_info: companyInfo, people: peopleList,
      emails_raw: peopleList.filter(p => p.email).map(p => p.email),
      has_catchall: detectCatchAll(mx.mxHosts), mx_provider: mx.mxHosts[0] || '', provider: result.provider,
    })
  }

  const seniorityOrder = ['C-Level', 'VP', 'Director', 'Manager', 'Staff']
  let bestPerson = peopleList[0]
  let bestRank = 99
  for (const p of peopleList) {
    const rank = seniorityOrder.indexOf(p.seniority || classifySeniority(p.title))
    if (rank >= 0 && rank < bestRank) { bestRank = rank; bestPerson = p }
  }

  const contactEmail = bestPerson?.email || `info@${domain}`
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

EMAIL RULES:
- Body 60-120 words. Do not write longer; it will be read on mobile.
- Subject line 4-7 words; intriguing but not spammy.
- Open with a short, specific reference to the recipient company's actual business or a current situation in their sector. No generic praise, no trade chamber or association references.
- Identify ONE concrete challenge relevant to them and connect it to one thing the sender offers.
- Exactly one clear call to action (offer a short call, or to send a brief summary). Do not stack multiple asks.
- Do not use repeated template phrases; the email must not read like a form letter.
- Natural, human tone. No markdown, no # * symbols, no long dashes.
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
      const subject = cleanAiText(parsed.subject || '')
      const body = cleanAiText(parsed.body || '')

      // Save to outreach as draft
      const emailId = crypto.randomUUID()
      await c.env.DB.prepare(
        `INSERT INTO emails (id, user_id, subject, body, status) VALUES (?, ?, ?, ?, 'draft')`
      ).bind(emailId, userId, subject, body).run()

      await deductCredit(c.env.DB, chk.userId, 'outreach', 1)

      await logActivity(c.env.DB, userId, {
        module: 'outreach', action: 'compose',
        title: `${contactName || 'Yetkili'} · ${companyInfo?.name || domain}`,
        detail: { subject, contact_email: contactEmail, company: companyInfo?.name },
      })

      return c.json({
        company: companyInfo,
        contact: { name: contactName, title: contactTitle, email: contactEmail },
        people_count: peopleList.length,
        subject,
        body,
        value_proposition: cleanAiText(parsed.value_proposition || ''),
        outreach_id: emailId,
        credits: await creditsSnapshot(c.env.DB, chk.userId),
      })
    }
    return c.json({ error: 'Email olusturulamadi' }, 500)
  } catch {
    return c.json({ error: 'AI servisi hatasi' }, 500)
  }
})

export default router
