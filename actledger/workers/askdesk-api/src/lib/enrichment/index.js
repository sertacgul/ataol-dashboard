import { createHunterProvider } from './hunter.js'
import { createFreeProvider, generateEmailPatterns, getLearnedPattern } from './free.js'
import { createVerifierProvider } from './millionverifier.js'
import { applyPattern } from './patterns.js'

// How many candidate patterns to verify before giving up (keeps per-lookup
// verification cost to a few credits).
const MAX_VERIFY_CANDIDATES = 6

// Reachable decision-makers first. For cold B2B outreach the useful contact is a
// function head (Director / VP / Manager) who reads and can act on the email, not
// the CEO / board of a large company. So the "sweet spot" tiers rank above C-Level;
// C-Level stays visible just below (right target at small companies / startups),
// generic mailboxes (info@, contact@) sink to the bottom, no-email entries last.
// Sorting here — before results are cached — keeps the `${domain}-${index}` id
// mapping consistent across /search, /reveal and /bulk-reveal.
const SENIORITY_RANK = { 'Director': 0, 'VP': 1, 'Manager': 2, 'C-Level': 3, 'Staff': 4 }

export function sortPeople(people) {
  const groupOf = p => {
    if (p.email && p.email_type !== 'generic') return 0
    if (p.email) return 1
    return 2
  }
  return [...people].sort((a, b) => {
    const ga = groupOf(a), gb = groupOf(b)
    if (ga !== gb) return ga - gb
    const ra = SENIORITY_RANK[a.seniority] ?? 5
    const rb = SENIORITY_RANK[b.seniority] ?? 5
    if (ra !== rb) return ra - rb
    return (b.confidence || 0) - (a.confidence || 0)
  })
}

export function createEnrichment(env, helpers) {
  const free = createFreeProvider(env, helpers)
  const hunter = env.HUNTER_API_KEY ? createHunterProvider(env.HUNTER_API_KEY, helpers) : null
  const verifier = env.MILLIONVERIFIER_API_KEY ? createVerifierProvider(env.MILLIONVERIFIER_API_KEY) : null

  // Build the ordered candidate list: a previously learned pattern for this
  // domain first, then the common patterns.
  async function buildCandidates(name, domain, db) {
    const candidates = []
    if (db) {
      const learned = await getLearnedPattern(db, domain).catch(() => null)
      if (learned) {
        const e = applyPattern(learned.pattern, name, domain)
        if (e) candidates.push(e)
      }
    }
    for (const p of generateEmailPatterns(name, domain)) {
      if (!candidates.includes(p)) candidates.push(p)
    }
    return candidates
  }

  // Pattern + verification = a real email finder. Verify each candidate in
  // likelihood order and return the first deliverable one. On a catch-all
  // domain verification cannot decide, so return the best guess labelled
  // 'risky'. With no verifier configured, fall back to the best guess.
  async function findVerifiedEmail(name, domain, db) {
    const candidates = await buildCandidates(name, domain, db)
    if (!candidates.length) return null

    if (!verifier) {
      return { email: candidates[0], confidence: 40, source: 'pattern', verification_status: 'unknown' }
    }

    let sawCatchAll = false
    for (const email of candidates.slice(0, MAX_VERIFY_CANDIDATES)) {
      let v
      try { v = await verifier.verify(email) } catch { continue }
      if (v.result === 'ok') {
        return { email, confidence: v.confidence, source: 'verified', verification_status: 'verified' }
      }
      if (v.result === 'catch_all') { sawCatchAll = true; break }
      // invalid / unknown / disposable -> try the next candidate
    }

    if (sawCatchAll) {
      return { email: candidates[0], confidence: 50, source: 'pattern', verification_status: 'risky' }
    }
    return { email: candidates[0], confidence: 30, source: 'pattern', verification_status: 'unknown' }
  }

  return {
    async domainSearch(domain, opts) {
      if (hunter) {
        try {
          const r = await hunter.domainSearch(domain, opts)
          if (r.people && r.people.length) return { ...r, people: sortPeople(r.people), provider: 'hunter' }
        } catch { /* fall back */ }
      }
      const r = await free.domainSearch(domain, opts)
      return { ...r, people: sortPeople(r.people), provider: 'free' }
    },
    async findEmail(first, last, domain) {
      if (hunter) {
        try {
          const r = await hunter.findEmail(first, last, domain)
          if (r && r.email) return r
        } catch { /* fall back */ }
      }
      return free.findEmail(first, last, domain)
    },
    findVerifiedEmail,
    async verifyEmail(email) {
      if (verifier) {
        try {
          const v = await verifier.verify(email)
          return { status: v.status, confidence: v.confidence, source: 'millionverifier' }
        } catch { /* fall back */ }
      }
      if (hunter) {
        try { return await hunter.verifyEmail(email) } catch { /* fall back */ }
      }
      return free.verifyEmail(email)
    },
  }
}
