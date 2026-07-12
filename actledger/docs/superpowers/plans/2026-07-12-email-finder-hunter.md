# Email Finder — Hunter.io Entegrasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AskDesk mail bulucusunu Hunter.io birincil sağlayıcısıyla gerçek, doğrulanmış email döndüren bir motora çevirmek; ücretsiz scrape/LLM/pattern motorunu güçlendirilmiş bir fallback olarak korumak.

**Architecture:** Worker route'u (`routes/email-finder.js`) bir **enrichment orchestrator**'ı çağırır. Orchestrator, `HUNTER_API_KEY` secret'ı varsa Hunter'ı dener, hata/boş sonuçta ücretsiz motora (scrape + Gemini Google-Search grounding + öğrenilen pattern) düşer. Tüm sağlayıcılar normalize edilmiş `NormalizedPerson` şekli döner. Sağlayıcı adı kullanıcıya asla sızmaz.

**Tech Stack:** Cloudflare Workers, Hono, D1 (SQLite), Gemini API, Hunter.io API v2, Vitest (yeni, sadece saf-mantık birim testleri için).

Referans spec: `docs/superpowers/specs/2026-07-12-email-finder-hunter-design.md`

---

## Dosya Yapısı

Yeni:
- `workers/askdesk-api/src/lib/enrichment/normalize.js` — NormalizedPerson eşlemeleri (seniority/department/verification) + `mergePeople`.
- `workers/askdesk-api/src/lib/enrichment/patterns.js` — `nameParts`, `derivePattern`, `applyPattern`.
- `workers/askdesk-api/src/lib/enrichment/hunter.js` — `createHunterProvider` (Hunter API + normalize).
- `workers/askdesk-api/src/lib/enrichment/free.js` — `createFreeProvider` (scrape/Gemini/pattern; mevcut helper'lar buraya taşınır).
- `workers/askdesk-api/src/lib/enrichment/index.js` — `createEnrichment` orchestrator (waterfall).
- `workers/askdesk-api/src/lib/enrichment/*.test.js` — normalize/patterns/orchestrator birim testleri.
- `workers/askdesk-api/src/db/migration-email-finder-v3.sql` — `domain_patterns` tablosu + `domain_cache.provider` sütunu.

Değişecek:
- `workers/askdesk-api/package.json` — vitest devDep + `test` scripti.
- `workers/askdesk-api/src/routes/email-finder.js` — `/search`, `/reveal`, `/bulk-reveal`, `/verify` orchestrator'ı kullanacak şekilde refactor; helper'lar `free.js`'e taşınır.
- `src/pages/email-finder/EmailFinder.jsx` — Verify butonu `source !== 'hunter'` koşulu, "+5 kredi" metinleri kaldırılır.

---

## Task 1: Vitest kurulumu

**Files:**
- Modify: `workers/askdesk-api/package.json`

- [ ] **Step 1: devDependency + script ekle**

`package.json` içinde `scripts` ve `devDependencies` bloklarını şu hale getir:

```json
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "jose": "^6.0.0",
    "bcryptjs": "^3.0.0"
  },
  "devDependencies": {
    "wrangler": "^4.0.0",
    "vitest": "^2.1.0"
  }
```

- [ ] **Step 2: Kur**

Run: `cd workers/askdesk-api && npm install`
Expected: `vitest` node_modules'a eklenir, hata yok.

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/package.json workers/askdesk-api/package-lock.json
git commit -m "chore: add vitest for enrichment unit tests"
```

---

## Task 2: patterns.js — email kalıbı çıkarımı

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/patterns.js`
- Test: `workers/askdesk-api/src/lib/enrichment/patterns.test.js`

- [ ] **Step 1: Failing test yaz**

`patterns.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { nameParts, derivePattern, applyPattern } from './patterns.js'

describe('nameParts', () => {
  it('splits first/last and transliterates Turkish', () => {
    expect(nameParts('Şükrü Güneş')).toEqual({ first: 'sukru', last: 'gunes' })
  })
  it('returns null for single word', () => {
    expect(nameParts('Ahmet')).toBeNull()
  })
})

describe('derivePattern', () => {
  it('detects first.last', () => {
    expect(derivePattern('ahmet.yilmaz@acme.com', 'Ahmet Yilmaz')).toBe('first.last')
  })
  it('detects flast', () => {
    expect(derivePattern('ayilmaz@acme.com', 'Ahmet Yilmaz')).toBe('flast')
  })
  it('returns null when no pattern matches', () => {
    expect(derivePattern('info@acme.com', 'Ahmet Yilmaz')).toBeNull()
  })
})

describe('applyPattern', () => {
  it('builds email from learned pattern', () => {
    expect(applyPattern('f.last', 'Ahmet Yilmaz', 'acme.com')).toBe('a.yilmaz@acme.com')
  })
  it('returns null for unknown token', () => {
    expect(applyPattern('bogus', 'Ahmet Yilmaz', 'acme.com')).toBeNull()
  })
})
```

- [ ] **Step 2: Testi çalıştır, fail görsün**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/patterns.test.js`
Expected: FAIL — "Failed to resolve import './patterns.js'".

- [ ] **Step 3: patterns.js yaz**

```js
const TR = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u' }

function ascii(s) {
  return (s || '').split('').map(c => TR[c] || c).join('').toLowerCase().replace(/[^a-z\s]/g, '').trim()
}

export function nameParts(name) {
  const parts = ascii(name).split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  return { first: parts[0], last: parts[parts.length - 1] }
}

function patternMap(first, last) {
  const f = first[0], l = last[0]
  return {
    'first.last': `${first}.${last}`,
    'firstlast': `${first}${last}`,
    'first_last': `${first}_${last}`,
    'f.last': `${f}.${last}`,
    'flast': `${f}${last}`,
    'first.l': `${first}.${l}`,
    'first': first,
    'last': last,
    'last.first': `${last}.${first}`,
  }
}

export function derivePattern(email, name) {
  const np = nameParts(name)
  if (!np || !email) return null
  const local = email.split('@')[0].toLowerCase()
  const map = patternMap(np.first, np.last)
  for (const [token, val] of Object.entries(map)) {
    if (val === local) return token
  }
  return null
}

export function applyPattern(token, name, domain) {
  const np = nameParts(name)
  if (!np || !token || !domain) return null
  const local = patternMap(np.first, np.last)[token]
  return local ? `${local}@${domain}` : null
}
```

- [ ] **Step 4: Testi çalıştır, geçsin**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/patterns.test.js`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/patterns.js workers/askdesk-api/src/lib/enrichment/patterns.test.js
git commit -m "feat: email pattern derive/apply with Turkish transliteration"
```

---

## Task 3: normalize.js — Hunter alan eşlemeleri + merge

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/normalize.js`
- Test: `workers/askdesk-api/src/lib/enrichment/normalize.test.js`

- [ ] **Step 1: Failing test yaz**

`normalize.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mapSeniority, mapDepartment, mapVerification, mergePeople } from './normalize.js'

describe('mapSeniority', () => {
  it('prefers specific classified over Staff', () => {
    expect(mapSeniority('junior', 'Director')).toBe('Director')
  })
  it('maps Hunter executive when classified is Staff', () => {
    expect(mapSeniority('executive', 'Staff')).toBe('C-Level')
  })
})

describe('mapDepartment', () => {
  it('maps Hunter it to Engineering', () => {
    expect(mapDepartment('it', 'Other')).toBe('Engineering')
  })
  it('falls back to classified when unmapped', () => {
    expect(mapDepartment('', 'Sales')).toBe('Sales')
  })
})

describe('mapVerification', () => {
  it('valid status => verified', () => {
    expect(mapVerification('valid', 50)).toBe('verified')
  })
  it('accept_all => risky', () => {
    expect(mapVerification('accept_all', 95)).toBe('risky')
  })
  it('no status high confidence => verified', () => {
    expect(mapVerification(null, 92)).toBe('verified')
  })
  it('no status mid confidence => likely', () => {
    expect(mapVerification(null, 60)).toBe('likely')
  })
  it('no status low confidence => risky', () => {
    expect(mapVerification(null, 20)).toBe('risky')
  })
  it('no data => unknown', () => {
    expect(mapVerification(null, null)).toBe('unknown')
  })
})

describe('mergePeople', () => {
  it('dedupes by email, primary wins', () => {
    const primary = [{ name: 'A', email: 'a@x.com', source: 'hunter' }]
    const secondary = [{ name: 'A2', email: 'A@x.com', source: 'website' }, { name: 'B', email: 'b@x.com', source: 'website' }]
    const out = mergePeople(primary, secondary)
    expect(out).toHaveLength(2)
    expect(out[0].source).toBe('hunter')
    expect(out[1].email).toBe('b@x.com')
  })
  it('dedupes by name when email missing', () => {
    const primary = [{ name: 'Ahmet Yilmaz', email: null, source: 'hunter' }]
    const secondary = [{ name: 'ahmet  yilmaz', email: null, source: 'website' }]
    expect(mergePeople(primary, secondary)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Testi çalıştır, fail görsün**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/normalize.test.js`
Expected: FAIL — import çözülemedi.

- [ ] **Step 3: normalize.js yaz**

```js
const HUNTER_SENIORITY = { executive: 'C-Level', senior: 'Manager', junior: 'Staff' }

const HUNTER_DEPARTMENT = {
  executive: 'Other', it: 'Engineering', finance: 'Finance', management: 'Operations',
  sales: 'Sales', hr: 'HR', marketing: 'Marketing', operations: 'Operations',
  support: 'Operations', communication: 'Marketing', legal: 'Legal',
}

export function mapSeniority(hunterSeniority, classified) {
  if (classified && classified !== 'Staff') return classified
  return HUNTER_SENIORITY[hunterSeniority] || classified || 'Staff'
}

export function mapDepartment(hunterDepartment, classified) {
  if (HUNTER_DEPARTMENT[hunterDepartment]) return HUNTER_DEPARTMENT[hunterDepartment]
  return classified || 'Other'
}

export function mapVerification(status, confidence) {
  if (status === 'valid') return 'verified'
  if (status === 'accept_all' || status === 'disposable' || status === 'invalid') return 'risky'
  if (status === 'webmail') return 'likely'
  if (status === 'unknown' || status === 'pending') return 'unknown'
  if (typeof confidence !== 'number') return 'unknown'
  if (confidence >= 90) return 'verified'
  if (confidence >= 50) return 'likely'
  return 'risky'
}

const keyName = n => (n || '').toLowerCase().replace(/\s+/g, ' ').trim()

export function mergePeople(primary, secondary) {
  const byEmail = new Set()
  const byName = new Set()
  const out = []
  const add = p => {
    out.push(p)
    if (p.email) byEmail.add(p.email.toLowerCase())
    if (p.name) byName.add(keyName(p.name))
  }
  for (const p of primary) add(p)
  for (const p of secondary) {
    if (p.email && byEmail.has(p.email.toLowerCase())) continue
    if (p.name && byName.has(keyName(p.name))) continue
    add(p)
  }
  return out
}
```

- [ ] **Step 4: Testi çalıştır, geçsin**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/normalize.test.js`
Expected: PASS (11 test).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/normalize.js workers/askdesk-api/src/lib/enrichment/normalize.test.js
git commit -m "feat: Hunter field mappings + people merge/dedupe"
```

---

## Task 4: hunter.js — HunterProvider

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/hunter.js`
- Test: `workers/askdesk-api/src/lib/enrichment/hunter.test.js`

- [ ] **Step 1: Failing test yaz** (global fetch mock ile)

`hunter.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHunterProvider } from './hunter.js'

const helpers = {
  classifySeniority: () => 'Staff',
  classifyDepartment: () => 'Other',
}

afterEach(() => { vi.restoreAllMocks() })

function mockFetch(json, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok, status, json: async () => json,
  })
}

describe('HunterProvider.domainSearch', () => {
  it('maps Hunter emails to NormalizedPerson', async () => {
    mockFetch({ data: { organization: 'Acme', industry: 'Software', city: 'Istanbul', country: 'TR',
      emails: [{ value: 'ahmet.yilmaz@acme.com', type: 'personal', confidence: 95, first_name: 'Ahmet',
        last_name: 'Yilmaz', position: 'CTO', seniority: 'executive', department: 'it',
        phone_number: null, verification: { status: 'valid' } }] } })
    const p = createHunterProvider('key', helpers)
    const { company, people } = await p.domainSearch('acme.com')
    expect(company.name).toBe('Acme')
    expect(people[0].email).toBe('ahmet.yilmaz@acme.com')
    expect(people[0].seniority).toBe('C-Level')
    expect(people[0].department).toBe('Engineering')
    expect(people[0].verification_status).toBe('verified')
    expect(people[0].source).toBe('hunter')
  })
})

describe('HunterProvider.findEmail', () => {
  it('returns email + score', async () => {
    mockFetch({ data: { email: 'a@acme.com', score: 88 } })
    const p = createHunterProvider('key', helpers)
    expect(await p.findEmail('Ahmet', 'Yilmaz', 'acme.com')).toEqual({ email: 'a@acme.com', confidence: 88, source: 'hunter' })
  })
  it('returns null when no email', async () => {
    mockFetch({ data: { email: null } })
    const p = createHunterProvider('key', helpers)
    expect(await p.findEmail('X', 'Y', 'acme.com')).toBeNull()
  })
})

describe('HunterProvider errors', () => {
  it('throws with status on non-ok', async () => {
    mockFetch({}, false, 429)
    const p = createHunterProvider('key', helpers)
    await expect(p.domainSearch('acme.com')).rejects.toMatchObject({ status: 429 })
  })
})
```

- [ ] **Step 2: Testi çalıştır, fail görsün**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/hunter.test.js`
Expected: FAIL — import çözülemedi.

- [ ] **Step 3: hunter.js yaz**

```js
import { mapSeniority, mapDepartment, mapVerification } from './normalize.js'

const BASE = 'https://api.hunter.io/v2'

export function createHunterProvider(apiKey, { classifySeniority, classifyDepartment }) {
  async function call(path, params) {
    const url = new URL(`${BASE}${path}`)
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v)
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const err = new Error(`hunter ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }

  function mapEmail(e) {
    const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || (e.value?.split('@')[0] || '')
    return {
      first_name: e.first_name || '',
      last_name: e.last_name || '',
      name,
      title: e.position || '',
      department: mapDepartment(e.department, classifyDepartment(e.position)),
      seniority: mapSeniority(e.seniority, classifySeniority(e.position)),
      email: e.value || null,
      email_type: e.type || 'personal',
      confidence: typeof e.confidence === 'number' ? e.confidence : 0,
      phone: e.phone_number || null,
      linkedin: e.linkedin || null,
      sources: (e.sources || []).map(s => s.uri).filter(Boolean),
      verification_status: mapVerification(e.verification?.status, e.confidence),
      source: 'hunter',
    }
  }

  return {
    async domainSearch(domain, { limit = 100 } = {}) {
      const data = await call('/domain-search', { domain, limit })
      const d = data?.data || {}
      const people = (d.emails || []).map(mapEmail)
      const company = {
        name: d.organization || domain,
        domain,
        description: '',
        sector: d.industry || '',
        location: [d.city, d.country].filter(Boolean).join(', '),
        employee_count: '',
        company_phones: [],
        mx_valid: true,
      }
      return { company, people }
    },
    async findEmail(firstName, lastName, domain) {
      const data = await call('/email-finder', { domain, first_name: firstName, last_name: lastName })
      const d = data?.data
      if (!d || !d.email) return null
      return { email: d.email, confidence: typeof d.score === 'number' ? d.score : 0, source: 'hunter' }
    },
    async verifyEmail(email) {
      const data = await call('/email-verifier', { email })
      const d = data?.data || {}
      return { status: mapVerification(d.status, d.score), confidence: typeof d.score === 'number' ? d.score : 0, source: 'hunter' }
    },
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçsin**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/hunter.test.js`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/hunter.js workers/askdesk-api/src/lib/enrichment/hunter.test.js
git commit -m "feat: HunterProvider (domainSearch/findEmail/verifyEmail)"
```

---

## Task 5: free.js — mevcut motoru provider arayüzüne taşı

Amaç: `email-finder.js` içindeki saf helper'ları `free.js`'e taşıyıp export etmek ve provider arayüzüyle sarmak. Route dosyası bu export'ları import edecek (Task 8-10).

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/free.js`
- Modify: `workers/askdesk-api/src/routes/email-finder.js` (taşınan fonksiyonları buradan sil, import et)

- [ ] **Step 1: Helper'ları free.js'e taşı (birebir gövde, değiştirmeden)**

`email-finder.js`'ten şu fonksiyonları **kes** ve `free.js`'e yapıştır, hepsini `export` yap: `callGemini`, `cleanDomain`, `generateEmailPatterns`, `extractDomainFromUrl`, `checkMxRecords`, `detectCatchAll`, `fetchPageText`, `extractEmailsFromHtml`, `extractPhonesFromHtml`, `scrapeWebsite`, `maskName`, `maskEmail`, `maskPhone`, `classifySeniority`, `classifyDepartment`, `computeVerification`. Ayrıca sabitleri taşı: `SCRAPE_PAGES`, `FALSE_POSITIVE_DOMAINS`, `CATCHALL_PROVIDERS`, `SENIORITY_KEYWORDS`, `DEPARTMENT_KEYWORDS`.

`free.js` dosyasının başına ekle:

```js
import { applyPattern, nameParts } from './patterns.js'
```

- [ ] **Step 2: free.js'in sonuna provider factory ekle**

```js
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

    // website'te olup kimseye atanmamış emailler
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
```

Not: `getLearnedPattern`'i export ediyoruz; `saveLearnedPattern` Task 8'de eklenecek.

- [ ] **Step 3: route dosyasında import satırı ekle (üst kısım)**

`email-finder.js`'in en üstüne (mevcut import'ların altına):

```js
import {
  callGemini, cleanDomain, generateEmailPatterns, checkMxRecords, detectCatchAll,
  scrapeWebsite, maskName, maskEmail, maskPhone, classifySeniority, classifyDepartment,
  computeVerification, getLearnedPattern,
} from '../lib/enrichment/free.js'
```

- [ ] **Step 4: Sözdizimi kontrolü**

Run: `cd workers/askdesk-api && node --check src/lib/enrichment/free.js && node --check src/routes/email-finder.js`
Expected: çıktı yok (her iki dosya da geçerli).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/free.js workers/askdesk-api/src/routes/email-finder.js
git commit -m "refactor: move free-engine helpers into enrichment/free.js provider"
```

---

## Task 6: index.js — orchestrator (waterfall)

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/index.js`
- Test: `workers/askdesk-api/src/lib/enrichment/index.test.js`

- [ ] **Step 1: Failing test yaz** (provider'ları mock'la)

`index.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { createEnrichment } from './index.js'

vi.mock('./hunter.js', () => ({
  createHunterProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'H' }, people: [{ email: 'h@x.com', source: 'hunter' }] }),
    findEmail: vi.fn().mockResolvedValue({ email: 'h@x.com', confidence: 90, source: 'hunter' }),
    verifyEmail: vi.fn().mockResolvedValue({ status: 'verified', confidence: 95, source: 'hunter' }),
  }),
}))
vi.mock('./free.js', () => ({
  createFreeProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'F' }, people: [{ email: 'f@x.com', source: 'website' }] }),
    findEmail: vi.fn().mockResolvedValue({ email: 'f@x.com', confidence: 40, source: 'pattern' }),
    verifyEmail: vi.fn().mockResolvedValue({ status: 'likely', confidence: 72, source: 'pattern' }),
  }),
}))

const helpers = { classifySeniority: () => 'Staff', classifyDepartment: () => 'Other' }

describe('createEnrichment waterfall', () => {
  it('uses Hunter when key present and results non-empty', async () => {
    const e = createEnrichment({ HUNTER_API_KEY: 'k' }, helpers)
    const r = await e.domainSearch('x.com')
    expect(r.provider).toBe('hunter')
    expect(r.people[0].email).toBe('h@x.com')
  })
  it('uses Free when no key', async () => {
    const e = createEnrichment({}, helpers)
    const r = await e.domainSearch('x.com')
    expect(r.provider).toBe('free')
  })
})
```

- [ ] **Step 2: Testi çalıştır, fail görsün**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/index.test.js`
Expected: FAIL — import çözülemedi.

- [ ] **Step 3: index.js yaz**

```js
import { createHunterProvider } from './hunter.js'
import { createFreeProvider } from './free.js'

export function createEnrichment(env, helpers) {
  const free = createFreeProvider(env, helpers)
  const hunter = env.HUNTER_API_KEY ? createHunterProvider(env.HUNTER_API_KEY, helpers) : null

  return {
    async domainSearch(domain, opts) {
      if (hunter) {
        try {
          const r = await hunter.domainSearch(domain, opts)
          if (r.people && r.people.length) return { ...r, provider: 'hunter' }
        } catch { /* fall back */ }
      }
      const r = await free.domainSearch(domain, opts)
      return { ...r, provider: 'free' }
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
    async verifyEmail(email) {
      if (hunter) {
        try { return await hunter.verifyEmail(email) } catch { /* fall back */ }
      }
      return free.verifyEmail(email)
    },
  }
}
```

- [ ] **Step 4: Testi çalıştır, geçsin**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/`
Expected: PASS (tüm enrichment testleri — patterns/normalize/hunter/index).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/index.js workers/askdesk-api/src/lib/enrichment/index.test.js
git commit -m "feat: enrichment orchestrator with Hunter->Free waterfall"
```

---

## Task 7: DB migration v3

**Files:**
- Create: `workers/askdesk-api/src/db/migration-email-finder-v3.sql`

- [ ] **Step 1: Migration yaz**

```sql
-- Email Finder v3: learned patterns + provider tracking

CREATE TABLE IF NOT EXISTS domain_patterns (
  domain TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  sample_email TEXT,
  learned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE domain_cache ADD COLUMN provider TEXT DEFAULT 'free';
```

- [ ] **Step 2: Lokal D1'e uygula**

Run: `cd workers/askdesk-api && npx wrangler d1 execute askdesk-db --local --file=src/db/migration-email-finder-v3.sql`
Expected: "Executed ... commands" başarı çıktısı. (DB adı `wrangler.toml`'daki `d1_databases` binding adıyla eşleşmeli; farklıysa onu kullan.)

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/db/migration-email-finder-v3.sql
git commit -m "feat: v3 migration - domain_patterns table + domain_cache.provider"
```

---

## Task 8: /search refactor — orchestrator + merge + pattern öğren

**Files:**
- Modify: `workers/askdesk-api/src/routes/email-finder.js` (`router.post('/search'...)`)
- Modify: `workers/askdesk-api/src/lib/enrichment/free.js` (`saveLearnedPattern` ekle)

- [ ] **Step 1: free.js'e saveLearnedPattern ekle**

`free.js` sonuna:

```js
import { derivePattern } from './patterns.js'

export async function saveLearnedPattern(db, domain, people) {
  // ilk güvenilir personal email'den kalıp çıkar
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
```

Not: `import { derivePattern }`'i dosyanın en üstündeki `import { applyPattern, nameParts }` satırıyla birleştir: `import { applyPattern, nameParts, derivePattern } from './patterns.js'`.

- [ ] **Step 2: route import'una ekle**

Task 5'teki import bloğuna `saveLearnedPattern` ekle:

```js
import {
  callGemini, cleanDomain, generateEmailPatterns, checkMxRecords, detectCatchAll,
  scrapeWebsite, maskName, maskEmail, maskPhone, classifySeniority, classifyDepartment,
  computeVerification, getLearnedPattern, saveLearnedPattern,
} from '../lib/enrichment/free.js'
import { createEnrichment } from '../lib/enrichment/index.js'
```

- [ ] **Step 3: CACHE_TTL_HOURS'u 168 (7 gün) yap**

`email-finder.js` başındaki `const CACHE_TTL_HOURS = 24` → `const CACHE_TTL_HOURS = 168`.

- [ ] **Step 4: /search handler gövdesini değiştir**

Mevcut `/search` handler'ının domain çözümleme bloğunu (`router.post('/search', ...)` başından `if (!domain) return ...` satırına kadar) **koru**. Sonrasını şununla değiştir (cache okuma dahil):

```js
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

    // Öğren + cache
    await saveLearnedPattern(c.env.DB, domain, people).catch(() => {})
    await setCachedDomain(c.env.DB, domain, {
      company_info: companyInfo, people, emails_raw: people.filter(p => p.email).map(p => p.email),
      has_catchall: hasCatchAll, mx_provider: mxProvider, provider: result.provider,
    })
  }

  // Kullanıcının reveal'larını işaretle
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
```

Ayrıca `setCachedDomain` fonksiyonunu `provider` yazacak şekilde güncelle:

```js
async function setCachedDomain(db, domain, data) {
  await db.prepare(`INSERT OR REPLACE INTO domain_cache (domain, company_info, people, emails_raw, has_catchall, mx_provider, provider, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .bind(domain, JSON.stringify(data.company_info), JSON.stringify(data.people),
      JSON.stringify(data.emails_raw), data.has_catchall ? 1 : 0, data.mx_provider || '', data.provider || 'free')
    .run()
}
```

- [ ] **Step 5: Sözdizimi + manuel doğrulama**

Run: `cd workers/askdesk-api && node --check src/routes/email-finder.js`
Expected: çıktı yok.

Run (ayrı terminalde): `cd workers/askdesk-api && npx wrangler dev`
Sonra bir test kullanıcısıyla `/email-finder/search` POST `{ "query": "example.com" }` (mevcut auth cookie ile). Beklenen: `people[].source` alanı geliyor, maskeli email dönüyor, hata yok. (Hunter anahtarı yoksa `provider: free` yolundan gelir.)

- [ ] **Step 6: Commit**

```bash
git add workers/askdesk-api/src/routes/email-finder.js workers/askdesk-api/src/lib/enrichment/free.js
git commit -m "feat: /search uses enrichment orchestrator + pattern learning + 7d cache"
```

---

## Task 9: /reveal + /bulk-reveal — email yoksa findEmail, bulunamazsa kredi düşme

**Files:**
- Modify: `workers/askdesk-api/src/routes/email-finder.js`

- [ ] **Step 1: /reveal içinde email yoksa findEmail çağır**

`/reveal` handler'ında `const email = person.emails?.[0]` mantığı artık geçersiz — cache'teki kişi objeleri normalize (`person.email`). İlgili bloğu şu şekilde güncelle:

```js
  const person = cached.people[idx]
  if (!person) return c.json({ error: 'Kisi bulunamadi. Tekrar arama yapin.' }, 404)

  let email = person.email
  if (!email) {
    const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
    const found = await enrichment.findEmail(person.first_name || person.name?.split(' ')[0] || '', person.last_name || person.name?.split(' ').slice(-1)[0] || '', domain)
    if (!found?.email) return c.json({ error: 'Bu kisi icin email adresi bulunamadi' }, 404)
    email = found.email
    person.verification_status = person.verification_status || 'unknown'
    person.confidence = found.confidence
  }
```

Sonrasında mevcut "already revealed" + kredi kontrolü korunur. `computeVerification` çağrısını normalize alanla değiştir:

```js
  // Doğrulama durumu: normalize person'dan gelir (Hunter zaten doğrulamış)
  const vStatus = person.verification_status || 'unknown'
  const vConfidence = person.confidence ?? 0
```

Ve INSERT + response'ta `v.status`/`v.confidence` yerine `vStatus`/`vConfidence` kullan, `source` olarak `person.source || 'pattern'`:

```js
  await c.env.DB.prepare(
    `INSERT INTO email_reveals (id, user_id, domain, person_name, person_title, email, verification_status, confidence_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(revealId, userId, domain, person.name, person.title || '', email, vStatus, vConfidence, person.source || 'pattern').run()
  await deductCredit(c.env.DB, userId)

  return c.json({
    person_name: person.name, person_title: person.title, email, phone: person.phone || null,
    verification_status: vStatus, confidence_score: vConfidence, source: person.source || 'pattern',
    credits_remaining: credits.monthly_limit - credits.used_this_month - 1, already_revealed: false,
  })
```

- [ ] **Step 2: /bulk-reveal aynı normalize'a geç**

`/bulk-reveal` içindeki `person.emails?.[0]` → `person.email`; `computeVerification(...)` → `person.verification_status || 'unknown'` ve `person.confidence ?? 0`; INSERT'te `source` = `item.person.source || 'pattern'`. Emailsiz kişiler `toReveal`'a alınmaz (mevcut `if (!person || !person.email) continue`).

- [ ] **Step 3: Sözdizimi kontrolü**

Run: `cd workers/askdesk-api && node --check src/routes/email-finder.js`
Expected: çıktı yok.

- [ ] **Step 4: Manuel doğrulama**

`wrangler dev` ile bir kişiyi reveal et: dönen `verification_status` ve `source` alanları normalize person'la tutarlı olmalı; email zaten cache'te olan kişide ek Hunter çağrısı olmamalı.

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/routes/email-finder.js
git commit -m "feat: reveal/bulk-reveal use normalized person + findEmail fallback"
```

---

## Task 10: /verify — kaynağa göre + "+5 kredi" kaldır

**Files:**
- Modify: `workers/askdesk-api/src/routes/email-finder.js`

- [ ] **Step 1: /verify handler'ını sadeleştir**

Mevcut `/verify` gövdesini şununla değiştir (MX/catch-all + "+5 kredi" bloğu kalkar, orchestrator kullanılır):

```js
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
```

- [ ] **Step 2: Sözdizimi kontrolü**

Run: `cd workers/askdesk-api && node --check src/routes/email-finder.js`
Expected: çıktı yok.

- [ ] **Step 3: Tüm birim testleri yeşil mi**

Run: `cd workers/askdesk-api && npm test`
Expected: tüm enrichment testleri PASS.

- [ ] **Step 4: Commit**

```bash
git add workers/askdesk-api/src/routes/email-finder.js
git commit -m "feat: /verify via orchestrator, remove +5 credit reward"
```

---

## Task 10b: /auto-outreach — normalize cache uyumu

Task 8 sonrası `domain_cache` normalize şekil (`person.email`) tutar. `/auto-outreach` hâlâ eski `person.emails[]` bekliyor ve kendi scrape/gemini/cache bloğunu yazıyor (şekil çakışması → bozulma). Orchestrator'a geçirerek hem düzelt hem sadeleştir.

**Files:**
- Modify: `workers/askdesk-api/src/routes/email-finder.js` (`router.post('/auto-outreach'...)`)

- [ ] **Step 1: Firma+kişi elde etme bloğunu orchestrator ile değiştir**

`/auto-outreach` içinde domain çözümlendikten sonra gelen "Get company info + people (check cache first)" bloğunun tamamını (`let cached = await getCachedDomain(...)` satırından `bestPerson` seçimi öncesine kadar) şununla değiştir:

```js
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
```

- [ ] **Step 2: En iyi kişi seçimini normalize alanlara geçir**

Mevcut seçim bloğunu şu hale getir:

```js
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
```

- [ ] **Step 3: Sözdizimi kontrolü**

Run: `cd workers/askdesk-api && node --check src/routes/email-finder.js`
Expected: çıktı yok.

- [ ] **Step 4: Manuel doğrulama**

`wrangler dev` ile `/email-finder/auto-outreach` POST `{ "query": "example.com" }`. Beklenen: `contact.email` normalize kişiden gelir, email taslağı üretilir, cache şekli `/search` ile aynı (çakışma yok).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/routes/email-finder.js
git commit -m "refactor: /auto-outreach uses orchestrator + normalized cache shape"
```

---

## Task 11: Gemini Google-Search grounding (ücretsiz discovery kalitesi)

**Files:**
- Modify: `workers/askdesk-api/src/lib/enrichment/free.js` (`callGemini`)

- [ ] **Step 1: callGemini'ye grounding tool ekle**

`free.js` içindeki `callGemini`'yi güncelle:

```js
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
```

Not: grounding açıkken yanıt birden çok `parts` içerebilir; hepsini birleştiriyoruz.

- [ ] **Step 2: Sözdizimi + manuel doğrulama**

Run: `cd workers/askdesk-api && node --check src/lib/enrichment/free.js`
Expected: çıktı yok.

`wrangler dev` ile Hunter anahtarı OLMADAN bilinen bir firma domaini ara; dönen kişiler güncel/gerçek olmalı, JSON parse hatası olmamalı.

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/free.js
git commit -m "feat: enable Gemini Google Search grounding in free provider"
```

---

## Task 12: Frontend — Verify butonu kaynağa göre, "+5 kredi" metni kaldır

**Files:**
- Modify: `src/pages/email-finder/EmailFinder.jsx`

- [ ] **Step 1: Reveal sonrası source alanını sakla**

`handleReveal` ve `handleBulkReveal` içinde person güncellenirken `source` alanını da geçir. `handleReveal`'daki map'e ekle: `source: data.source,`. `handleBulkReveal`'daki map'e ekle: `source: revealedMap[p.id].source,`. (Backend bu alanı dönüyor — Task 9.)

- [ ] **Step 2: Verify butonu koşulunu güncelle**

Mevcut satır:

```jsx
                              {person.verification_status !== 'verified' && (
```

Şununla değiştir (sadece fallback kaynaklı emailler için doğrula butonu):

```jsx
                              {person.verification_status !== 'verified' && person.source && person.source !== 'hunter' && (
```

- [ ] **Step 3: "+5 kredi" metnini kaldır**

`title={t('Doğrula (+5 kredi)')}` → `title={t('Doğrula')}`.

`handleVerify` içindeki kredi güncelleme bloğunu kaldır (artık kredi dönmüyor):

```js
      setPeople(prev => prev.map(p => p.id === person.id ? {
        ...p,
        verification_status: data.status,
        confidence_score: data.confidence_score || p.confidence_score,
      } : p))
```

(Yani `if (data.verified && data.credits_remaining != null) { ... }` bloğunu sil.)

- [ ] **Step 4: Build kontrolü**

Run: `cd C:/Users/serta/actledger && node node_modules/vite/bin/vite.js build`
Expected: "built in ..." başarı, hata yok.

- [ ] **Step 5: Commit**

```bash
git add src/pages/email-finder/EmailFinder.jsx
git commit -m "feat: verify button only for fallback emails, drop +5 credit copy"
```

---

## Task 13: HUNTER_API_KEY secret + canlı uçtan uca doğrulama

**Files:**
- Modify: `workers/askdesk-api/README` veya deploy notu (varsa); yoksa bu adım sadece komut.

- [ ] **Step 1: Secret ekle (deploy öncesi)**

Run: `cd workers/askdesk-api && npx wrangler secret put HUNTER_API_KEY`
(İstenen değere Hunter API anahtarını yapıştır.)
Expected: "Success! Uploaded secret HUNTER_API_KEY".

- [ ] **Step 2: Lokal test için .dev.vars**

`workers/askdesk-api/.dev.vars` dosyasına ekle (gitignore'da olmalı):

```
HUNTER_API_KEY=<hunter-anahtarin>
```

Run: `cd workers/askdesk-api && git check-ignore .dev.vars`
Expected: `.dev.vars` (ignore ediliyor). Değilse `.gitignore`'a ekle.

- [ ] **Step 3: Canlı uçtan uca (wrangler dev)**

`wrangler dev` ile gerçek bir domain ara (ör. bilinen bir şirket). Beklenen:
- `people` gerçek isim/unvan/departman ile dolu, `confidence` ve `verification_status` mevcut.
- Bir kişiyi reveal et → gerçek email + doğrulama durumu anında.
- Yanıtların hiçbirinde "hunter"/"hunter.io" kelimesi kullanıcıya görünmüyor (sadece `source` alanı iç kullanım; UI onu göstermiyor).

- [ ] **Step 4: Regresyon — Free mod**

`.dev.vars`'tan HUNTER_API_KEY'i geçici kaldır, `wrangler dev` yeniden başlat, aynı aramayı yap. Beklenen: sistem çökmeden ücretsiz motorla sonuç döner (`from_cache` false ise `provider: free`).

- [ ] **Step 5: Commit (varsa not/README)**

```bash
git add -A
git commit -m "docs: HUNTER_API_KEY setup note" || echo "no doc changes"
```

---

## Self-Review Notları
- Spec bölüm 3 (provider arayüzü) → Task 4/5/6. Bölüm 4 (akışlar) → Task 8/9/10. Bölüm 5 (pattern+grounding) → Task 8/11. Bölüm 6 (eşlemeler) → Task 3. Bölüm 7 (DB) → Task 7. Bölüm 8/9 (config/maliyet) → Task 8 (7g cache), Task 13 (secret). Bölüm 10 (hata) → Task 6 (waterfall try/catch), Task 9 (findEmail kredi yok). Tümü kapsanıyor.
- Verifier 30 gün cache (spec 9): mevcut davranışta `/verify` yalnızca kullanıcı manuel basınca çalışır ve `verified` ise erken döner; ayrı zaman-bazlı cache eklenmedi çünkü verify manuel ve nadir. Bu bilinçli sadeleştirme — otomatik toplu re-verify yok.
