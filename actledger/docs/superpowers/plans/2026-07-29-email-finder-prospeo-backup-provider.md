# Email Finder — Prospeo Yedek Sağlayıcı (Faz 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hunter kotası bitince mail bulucu kalitesinin çökmemesi için, sağlayıcı waterfall'ına ikinci katman olarak Prospeo'yu (search-person + enrich-person) eklemek.

**Architecture:** `enrichment/prospeo.js` yeni sağlayıcı `hunter.js` desenini izler. Orchestrator (`index.js`) waterfall'ı `Hunter → Prospeo → free` olur ve reveal için yeni `revealProviderEmail` metodu ekler. Route (`email-finder.js`) `/reveal` ve `/bulk-reveal`'de Prospeo kişilerini `enrich-person` ile açar, başarısızsa mevcut pattern motoruna düşer. Cache şeması değişmez (`prospeo_person_id` mevcut people JSON'unda taşınır).

**Tech Stack:** Cloudflare Workers, Hono, D1 (SQLite), vitest. Prospeo REST API (`X-KEY` header, `POST` JSON).

**Referans spec:** `docs/superpowers/specs/2026-07-29-email-finder-prospeo-backup-provider-design.md`

---

## Dosya Yapısı

- **Create:** `workers/askdesk-api/src/lib/enrichment/prospeo.js` — Prospeo sağlayıcı (domainSearch, revealEmail, findEmail).
- **Create:** `workers/askdesk-api/src/lib/enrichment/prospeo.test.js` — birim testler.
- **Modify:** `workers/askdesk-api/src/lib/enrichment/index.js` — waterfall'a Prospeo katmanı + `revealProviderEmail`.
- **Modify:** `workers/askdesk-api/src/lib/enrichment/index.test.js` — orchestrator waterfall testleri.
- **Modify:** `workers/askdesk-api/src/routes/email-finder.js` — `/reveal` ve `/bulk-reveal` Prospeo reveal dalı.

Not: `normalize.js` DEĞİŞMEZ. Prospeo seniority/department haritalaması `prospeo.js` içinde yapılır ve `mapSeniority`/`mapDepartment`'a `classified` argümanı olarak geçirilir (mevcut fallback davranışı: `classified !== 'Staff'` ise onu döndürür).

---

## Task 1: Prospeo sağlayıcı (`prospeo.js`)

**Files:**
- Create: `workers/askdesk-api/src/lib/enrichment/prospeo.js`
- Test: `workers/askdesk-api/src/lib/enrichment/prospeo.test.js`

- [ ] **Step 1: Failing testleri yaz**

`workers/askdesk-api/src/lib/enrichment/prospeo.test.js`:

```javascript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createProspeoProvider } from './prospeo.js'

const helpers = {
  classifySeniority: (title) => (/cto|ceo|founder/i.test(title || '') ? 'C-Level' : 'Staff'),
  classifyDepartment: (title) => (/engineer|cto/i.test(title || '') ? 'Engineering' : 'Other'),
}

afterEach(() => { vi.restoreAllMocks() })

function mockFetch(json, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => json })
  return globalThis.fetch
}

describe('ProspeoProvider.domainSearch', () => {
  it('maps search-person results to people with no email + person_id', async () => {
    mockFetch({
      error: false,
      results: [{
        person: {
          person_id: 'p_123', first_name: 'Ahmet', last_name: 'Yilmaz', full_name: 'Ahmet Yilmaz',
          linkedin_url: 'https://linkedin.com/in/ahmet', current_job_title: 'CTO',
          job_history: [{ title: 'CTO', current: true, seniority: 'C-Suite', departments: ['Engineering'] }],
        },
        company: { name: 'Acme', website: 'https://acme.com', industry: 'Software' },
      }],
      pagination: { current_page: 1, per_page: 25, total_page: 1, total_count: 1 },
    })
    const p = createProspeoProvider('key', helpers)
    const { company, people } = await p.domainSearch('acme.com')
    expect(company.name).toBe('Acme')
    expect(people[0].email).toBeNull()
    expect(people[0].prospeo_person_id).toBe('p_123')
    expect(people[0].name).toBe('Ahmet Yilmaz')
    expect(people[0].seniority).toBe('C-Level')
    expect(people[0].source).toBe('prospeo')
  })

  it('returns empty people when no results', async () => {
    mockFetch({ error: false, results: [], pagination: {} })
    const p = createProspeoProvider('key', helpers)
    const { people } = await p.domainSearch('acme.com')
    expect(people).toEqual([])
  })
})

describe('ProspeoProvider.revealEmail', () => {
  it('returns verified email when status VERIFIED', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: true, email: 'ahmet@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' }))
      .toEqual({ email: 'ahmet@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' })
  })

  it('returns null when email UNAVAILABLE', async () => {
    mockFetch({ error: false, person: { email: { status: 'UNAVAILABLE', revealed: false, email: null } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' })).toBeNull()
  })

  it('returns null for masked email (no credit spent / privacy masked)', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: false, email: 'ahmet.****@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' })).toBeNull()
  })

  it('returns null when no person_id', async () => {
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({})).toBeNull()
  })
})

describe('ProspeoProvider.findEmail', () => {
  it('returns email + confidence via enrich-person', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: true, email: 'a@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.findEmail('Ahmet', 'Yilmaz', 'acme.com'))
      .toEqual({ email: 'a@acme.com', confidence: 90, source: 'prospeo' })
  })

  it('returns null when unavailable', async () => {
    mockFetch({ error: false, person: { email: { status: 'UNAVAILABLE', email: null } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.findEmail('X', 'Y', 'acme.com')).toBeNull()
  })
})

describe('ProspeoProvider errors', () => {
  it('throws with status on non-ok', async () => {
    mockFetch({}, false, 429)
    const p = createProspeoProvider('key', helpers)
    await expect(p.domainSearch('acme.com')).rejects.toMatchObject({ status: 429 })
  })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL gördüğünü doğrula**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/prospeo.test.js`
Expected: FAIL — "Failed to resolve import './prospeo.js'".

- [ ] **Step 3: `prospeo.js`'i yaz**

`workers/askdesk-api/src/lib/enrichment/prospeo.js`:

```javascript
import { mapSeniority, mapDepartment } from './normalize.js'

const BASE = 'https://api.prospeo.io'

// Prospeo job_history seniority -> AskDesk vocab (SENIORITY_RANK in index.js).
// Unmapped values fall through to classifySeniority(title).
const PROSPEO_SENIORITY = {
  'C-Suite': 'C-Level', 'Owner': 'C-Level', 'Partner': 'C-Level', 'Founder': 'C-Level',
  'VP': 'VP', 'Director': 'Director', 'Head': 'Director', 'Manager': 'Manager',
  'Senior': 'Staff', 'Entry': 'Staff', 'Intern': 'Staff', 'Training': 'Staff',
}

export function createProspeoProvider(apiKey, { classifySeniority, classifyDepartment }) {
  async function call(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-KEY': apiKey },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = new Error(`prospeo ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }

  // Pull the current (or first) job entry for title/seniority/department signals.
  function currentJob(person) {
    const jobs = person.job_history || []
    return jobs.find(j => j.current) || jobs[0] || {}
  }

  function mapPerson(entry) {
    const person = entry.person || {}
    const job = currentJob(person)
    const title = person.current_job_title || job.title || ''
    const name = person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ')
    const mappedSeniority = PROSPEO_SENIORITY[job.seniority] || classifySeniority(title)
    return {
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      name,
      title,
      department: mapDepartment((job.departments || [])[0], classifyDepartment(title)),
      seniority: mapSeniority(null, mappedSeniority),
      email: null,               // Prospeo search does not return emails
      email_type: 'personal',
      confidence: 0,
      phone: null,
      linkedin: person.linkedin_url || null,
      sources: [],
      verification_status: null,
      prospeo_person_id: person.person_id || null,
      source: 'prospeo',
    }
  }

  // enrich-person returns a masked email ("a.****@x.com") when no credit is
  // spent / privacy applies. Reject those: only a real, unmasked address counts.
  function extractEmail(data) {
    const em = data?.person?.email
    if (!em || em.status !== 'VERIFIED') return null
    const value = em.email
    if (!value || value.includes('*')) return null
    return value
  }

  return {
    async domainSearch(domain) {
      const data = await call('/search-person', {
        page: 1,
        filters: { company: { websites: { include: [domain] } } },
      })
      const results = data?.results || []
      const people = results.map(mapPerson)
      const firstCompany = results[0]?.company || {}
      const company = {
        name: firstCompany.name || domain,
        domain,
        description: '',
        sector: firstCompany.industry || '',
        location: [firstCompany.city, firstCompany.country].filter(Boolean).join(', '),
        employee_count: '',
        company_phones: [],
        mx_valid: true,
      }
      return { company, people }
    },

    async revealEmail(person) {
      if (!person?.prospeo_person_id) return null
      const data = await call('/enrich-person', {
        data: { person_id: person.prospeo_person_id },
        only_verified_email: true,
      })
      const email = extractEmail(data)
      if (!email) return null
      return { email, verification_status: 'verified', confidence: 90, source: 'prospeo' }
    },

    async findEmail(firstName, lastName, domain) {
      const data = await call('/enrich-person', {
        data: { first_name: firstName, last_name: lastName, company_website: domain },
        only_verified_email: true,
      })
      const email = extractEmail(data)
      if (!email) return null
      return { email, confidence: 90, source: 'prospeo' }
    },
  }
}
```

- [ ] **Step 4: Testi çalıştır, PASS gördüğünü doğrula**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/prospeo.test.js`
Expected: PASS (12 assertion, tüm describe blokları yeşil).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/prospeo.js workers/askdesk-api/src/lib/enrichment/prospeo.test.js
git commit -m "feat(email-finder): Prospeo provider (search-person + enrich-person)"
```

---

## Task 2: Orchestrator waterfall'ına Prospeo katmanı (`index.js`)

**Files:**
- Modify: `workers/askdesk-api/src/lib/enrichment/index.js`
- Test: `workers/askdesk-api/src/lib/enrichment/index.test.js`

- [ ] **Step 1a: Prospeo modül mock'unu ekle**

`index.test.js` mevcut sağlayıcıları **global fetch değil, `vi.mock` ile modül olarak** mock'lar. Aynı deseni izle: `vi.mock('./free.js', ...)` bloğunun HEMEN ALTINA (satır ~17) ekle:

```javascript
vi.mock('./prospeo.js', () => ({
  createProspeoProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'P' }, people: [{ prospeo_person_id: 'p1', name: 'Ali Veli', seniority: 'Manager', email: null, source: 'prospeo' }] }),
    revealEmail: vi.fn().mockResolvedValue({ email: 'ali@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' }),
    findEmail: vi.fn().mockResolvedValue({ email: 'p@x.com', confidence: 90, source: 'prospeo' }),
  }),
}))
```

- [ ] **Step 1b: Failing testleri dosyanın SONUNA ekle**

Hunter'ın throw etmesini simüle etmek modül-mock kurgusunda zahmetli; onun yerine Prospeo dalını Hunter YOKKEN (kota bitmiş / anahtar yok senaryosunun eşdeğeri) deterministik test ederiz. Hunter-önce davranışı mevcut testlerce zaten kanıtlı.

```javascript
describe('createEnrichment — Prospeo second tier', () => {
  const helpers = { classifySeniority: () => 'Staff', classifyDepartment: () => 'Other' }

  it('uses Prospeo (tagging provider) when Hunter is not configured', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    const r = await enrichment.domainSearch('acme.com')
    expect(r.provider).toBe('prospeo')
    expect(r.people[0].prospeo_person_id).toBe('p1')
  })

  it('findEmail uses Prospeo when Hunter is not configured', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    expect(await enrichment.findEmail('Ali', 'Veli', 'acme.com')).toMatchObject({ email: 'p@x.com', source: 'prospeo' })
  })

  it('revealProviderEmail routes prospeo persons to enrich-person', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    const found = await enrichment.revealProviderEmail({ source: 'prospeo', prospeo_person_id: 'p1' })
    expect(found).toEqual({ email: 'ali@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' })
  })

  it('revealProviderEmail returns null for non-prospeo persons', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    expect(await enrichment.revealProviderEmail({ source: 'hunter', email: 'x@y.com' })).toBeNull()
  })
})
```

Not: `vi` zaten satır 1'de import ediliyor (`import { describe, it, expect, vi } from 'vitest'`) — ek import gerekmez.

- [ ] **Step 2: Testi çalıştır, FAIL gördüğünü doğrula**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/index.test.js`
Expected: FAIL — `enrichment.revealProviderEmail is not a function` ve provider `'free'` (Prospeo henüz bağlı değil).

- [ ] **Step 3: `index.js`'i güncelle**

`import` bloğuna ekle (satır 1-4 civarı, `createFreeProvider` importundan sonra):

```javascript
import { createProspeoProvider } from './prospeo.js'
```

`createEnrichment` içinde provider tanımlarına ekle (mevcut `const hunter = ...` satırının hemen altına):

```javascript
  const prospeo = env.PROSPEO_API_KEY ? createProspeoProvider(env.PROSPEO_API_KEY, helpers) : null
```

`domainSearch` metodunu şununla değiştir:

```javascript
    async domainSearch(domain, opts) {
      if (hunter) {
        try {
          const r = await hunter.domainSearch(domain, opts)
          if (r.people && r.people.length) return { ...r, people: sortPeople(r.people), provider: 'hunter' }
        } catch { /* fall back */ }
      }
      if (prospeo) {
        try {
          const r = await prospeo.domainSearch(domain, opts)
          if (r.people && r.people.length) return { ...r, people: sortPeople(r.people), provider: 'prospeo' }
        } catch { /* fall back */ }
      }
      const r = await free.domainSearch(domain, opts)
      return { ...r, people: sortPeople(r.people), provider: 'free' }
    },
```

`findEmail` metodunu şununla değiştir:

```javascript
    async findEmail(first, last, domain) {
      if (hunter) {
        try {
          const r = await hunter.findEmail(first, last, domain)
          if (r && r.email) return r
        } catch { /* fall back */ }
      }
      if (prospeo) {
        try {
          const r = await prospeo.findEmail(first, last, domain)
          if (r && r.email) return r
        } catch { /* fall back */ }
      }
      return free.findEmail(first, last, domain)
    },
```

`findVerifiedEmail,` satırının hemen altına yeni metodu ekle:

```javascript
    async revealProviderEmail(person) {
      if (person?.source === 'prospeo' && prospeo && person.prospeo_person_id) {
        try { return await prospeo.revealEmail(person) } catch { /* fall back to patterns */ }
      }
      return null
    },
```

- [ ] **Step 4: Testleri çalıştır, PASS gördüğünü doğrula**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/index.test.js`
Expected: PASS (mevcut testler + 3 yeni test yeşil).

- [ ] **Step 5: Tüm enrichment testlerini çalıştır (regresyon)**

Run: `cd workers/askdesk-api && npx vitest run src/lib/enrichment/`
Expected: PASS — hunter, normalize, index, prospeo hepsi yeşil.

- [ ] **Step 6: Commit**

```bash
git add workers/askdesk-api/src/lib/enrichment/index.js workers/askdesk-api/src/lib/enrichment/index.test.js
git commit -m "feat(email-finder): wire Prospeo into waterfall + revealProviderEmail"
```

---

## Task 3: Reveal route'unda Prospeo dalı (`email-finder.js`)

**Files:**
- Modify: `workers/askdesk-api/src/routes/email-finder.js`

Route'lar Cloudflare Workers + D1 bağımlı olduğu için mevcut kod tabanında birim test edilmiyor; bu değişiklikler cerrahi düzenleme + Task 4 canlı probe ile doğrulanır.

- [ ] **Step 1: `/reveal` — `else if (!email)` dalını güncelle**

`workers/askdesk-api/src/routes/email-finder.js` içinde (mevcut satır ~188-205) şu blok:

```javascript
  } else if (!email) {
    // No address for this person: derive candidates from name patterns and
    // return the first deliverable one.
    const found = await enrichment.findVerifiedEmail(person.name, domain, c.env.DB)
    if (found?.email) {
```

şununla değiştir:

```javascript
  } else if (!email) {
    // No address for this person. If Prospeo sourced this record, reveal the
    // real verified address via enrich-person first; otherwise (or on failure)
    // derive candidates from name patterns and return the first deliverable one.
    let found = null
    if (person.source === 'prospeo') {
      found = await enrichment.revealProviderEmail(person).catch(() => null)
    }
    if (!found?.email) {
      found = await enrichment.findVerifiedEmail(person.name, domain, c.env.DB)
    }
    if (found?.email) {
```

(Blok içindeki geri kalan mantık — `email = found.email`, `person.source = found.source`, `saveLearnedPattern`, `if (!email) return 404` — aynen kalır.)

- [ ] **Step 2: `/bulk-reveal` — Prospeo kişilerini dahil et**

Mevcut `toReveal` toplama döngüsü (satır ~282-290):

```javascript
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
```

şununla değiştir (Prospeo kişileri mailsiz gelir; `enrich-person` ile burada açılır, açılan mail zaten reveal edilmişse atlanır):

```javascript
  // Collect persons to reveal. Persons that already carry a provider email use
  // it directly; Prospeo-sourced persons have no email yet, so resolve it now
  // via enrich-person (falling back to name patterns). Skip when resolution
  // fails or the resolved email was already revealed by this user.
  const enrichment = createEnrichment(c.env, { classifySeniority, classifyDepartment })
  const toReveal = []
  for (const pid of person_ids) {
    const idx = parseInt(pid.split('-').pop())
    const person = cached.people[idx]
    if (!person) continue
    let email = person.email
    if (!email && person.source === 'prospeo') {
      const found = await enrichment.revealProviderEmail(person).catch(() => null)
        || await enrichment.findVerifiedEmail(person.name, domain, c.env.DB).catch(() => null)
      if (found?.email) {
        email = found.email
        person.verification_status = found.verification_status || person.verification_status || 'unknown'
        person.confidence = found.confidence ?? person.confidence
        person.source = found.source || person.source
      }
    }
    if (!email) continue
    const existing = await c.env.DB.prepare('SELECT id FROM email_reveals WHERE user_id = ? AND email = ?')
      .bind(userId, email).first()
    if (!existing) toReveal.push({ idx, person, email })
  }
```

Not: `bulk-reveal` gövdesinin geri kalanı (kredi kontrolü `toReveal.length`, insert döngüsü, `deductCredit`) `item.email` kullandığı için değişmeden çalışır. Kredi yalnızca `toReveal`'a giren (maili başarıyla çözülen ve daha önce reveal edilmemiş) kişiler için düşer.

- [ ] **Step 3: Değişiklikleri gözle doğrula (syntax + import)**

Run: `cd workers/askdesk-api && npx wrangler deploy --dry-run --outdir /tmp/askdesk-dryrun 2>&1 | tail -15`
Expected: Build başarılı (bundle oluşur), syntax/import hatası yok. (Gerçek deploy Task 4'te.)

- [ ] **Step 4: Commit**

```bash
git add workers/askdesk-api/src/routes/email-finder.js
git commit -m "feat(email-finder): reveal + bulk-reveal resolve Prospeo emails"
```

---

## Task 4: Deploy + canlı probe

**Files:** yok (operasyonel adımlar). Sertac'tan Prospeo API anahtarı gerekir.

- [ ] **Step 1: Prospeo API anahtarını secret olarak ekle**

Run: `cd workers/askdesk-api && npx wrangler secret put PROSPEO_API_KEY`
(İstendiğinde Sertac'ın verdiği anahtar yapıştırılır.)
Expected: "Success! Uploaded secret PROSPEO_API_KEY".

- [ ] **Step 2: Worker'ı deploy et**

Run: `cd workers/askdesk-api && npx wrangler deploy`
Expected: Deploy başarılı, yeni version id döner.

- [ ] **Step 3: Canlı probe — search-person (bilinen bir domainde)**

Prospeo anahtarıyla doğrudan API'yi bir domainde dene (ör. `intercom.com`) ve şunları teyit et:
- `search-person` en az bir kişi (isim + `person_id`) döndürüyor mu.
- Bir `person_id` için `enrich-person` (`only_verified_email: true`) çağrısı **tam (maskesiz)** mail döndürüyor mu → `revealEmail` bunu geçirir; maskeliyse `null` döner ve pattern motoruna düşer.
- `only_verified_email: true` doğrulanmış mail yoksa `UNAVAILABLE` mı dönüyor (kredi yakmadan).

Run (probe scriptini scratchpad'e yaz, anahtarı env'den geç):
```bash
PROSPEO_API_KEY=<key> node -e '
const k=process.env.PROSPEO_API_KEY;
(async()=>{
  const s=await fetch("https://api.prospeo.io/search-person",{method:"POST",headers:{"Content-Type":"application/json","X-KEY":k},body:JSON.stringify({page:1,filters:{company:{websites:{include:["intercom.com"]}}}})}).then(r=>r.json());
  const pid=s.results?.[0]?.person?.person_id;
  console.log("people:",s.results?.length,"first_id:",pid);
  const e=await fetch("https://api.prospeo.io/enrich-person",{method:"POST",headers:{"Content-Type":"application/json","X-KEY":k},body:JSON.stringify({data:{person_id:pid},only_verified_email:true})}).then(r=>r.json());
  console.log("email:",JSON.stringify(e.person?.email));
})();'
```
Expected: `people:` > 0, `email:` içinde `status:"VERIFIED"` ve `*` içermeyen gerçek adres.

> Eğer mail maskeli geliyorsa: DEPLOY'u kullanıcıya doğrula; `revealEmail` zaten `null` döndürüp pattern motoruna düşer (güvenli), ama Prospeo'nun asıl değeri (gerçek mail) alınamıyor demektir — bu durumda spec Bölüm 8'deki ilk riske göre kullanıcıyla plan gözden geçirilir.

- [ ] **Step 4: Uçtan uca UI probe (opsiyonel ama önerilir)**

askdesk.app mail bulucuda Hunter'ın tanımadığı / kotanın bittiği bir domainde arama yap → kişi listesi Prospeo'dan geliyor mu (loglarda `provider:'prospeo'`), bir kişiyi reveal et → gerçek mail açılıyor ve 1 kredi düşüyor mu.

- [ ] **Step 5: (Opsiyonel) bayat cache flush**

Bug dönemi `provider='free'` kayıtları 7 gün TTL ile hâlâ servis edilebilir. Prospeo'nun yeniden doldurması için:
Run: `cd workers/askdesk-api && npx wrangler d1 execute askdesk-db --remote --command "DELETE FROM domain_cache WHERE provider='free'"`
Expected: Silinen satır sayısı raporlanır.

---

## Self-Review Notları (yazan tarafından)

- **Spec kapsamı:** search-person→domainSearch (Task 1+2), enrich-person→reveal (Task 1+3), bulk-reveal (Task 3), waterfall sırası (Task 2), cache şema-değişmez (person_id people JSON'unda), test (Task 1+2), deploy+probe (Task 4). Tüm spec bölümleri karşılandı.
- **Maskeli mail riski:** `extractEmail` `*` içeren adresi reddeder → reveal güvenle pattern'e düşer; probe (Task 4 Step 3) gerçek davranışı doğrular.
- **İsim tutarlılığı:** `createProspeoProvider`, `revealEmail`, `findEmail`, `revealProviderEmail`, `prospeo_person_id` tüm task'larda aynı. `normalize.js`'ten yalnızca `mapSeniority`/`mapDepartment` kullanılır (mevcut, değişmez).
