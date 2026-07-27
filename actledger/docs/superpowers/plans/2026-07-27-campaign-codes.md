# Kampanya Kodları Modülü — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Super-admin'in yönettiği çok kodlu kampanya sistemi kur: yüzde/tutar indirimleri (LemonSqueezy'ye otomatik senkron) ve LAUNCH100 tarzı "1 ay ücretsiz" voucher'ları (dahili, biriktir-sonra-aktive et).

**Architecture:** Yeni `campaign_codes` + `campaign_redemptions` tabloları. Doğrulama/redemption mantığı saf fonksiyonlar + ince DB sarmalayıcı olarak `lib/campaigns.js`'te. Percent/amount kodlar `lib/lemonsqueezy-discounts.js` ile LS'de otomatik oluşturulur; checkout kullanıcının kodunu LS'ye geçer. free_month tamamen dahili grant (`users.plan_expires_at`/`plan_source` + 15 dk cron ile free'ye dönüş). Super-admin CRUD `admin.js`'te, UI `Admin.jsx`'te.

**Tech Stack:** Cloudflare Workers + Hono, D1 (SQLite), Vitest, React (Vite) frontend, LemonSqueezy REST API.

**Spec:** `docs/superpowers/specs/2026-07-27-campaign-codes-design.md`

**Referans mount noktaları:** auth=`/auth`, billing=`/payments`, admin=`/admin`. Cron: `src/index.js:70` `scheduled`. Testler: `vitest` (`workers/askdesk-api`'de `.\node_modules\.bin\vitest.cmd run`). Windows PowerShell: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"`.

---

## Task 1: DB migration (tablolar + kolonlar + seed)

**Files:**
- Create: `workers/askdesk-api/src/db/migration-campaigns-v1.sql`

- [ ] **Step 1: Migration dosyasını yaz**

```sql
-- Campaign codes module (2026-07-27)

CREATE TABLE IF NOT EXISTS campaign_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,                     -- 'percent' | 'amount' | 'free_month'
  percent INTEGER,
  amount_cents INTEGER,
  duration TEXT NOT NULL DEFAULT 'once',  -- 'once' | 'forever'
  free_months INTEGER,
  redeem_window_days INTEGER,
  eligible_plans TEXT NOT NULL DEFAULT 'all',
  starts_at TEXT,
  ends_at TEXT,
  max_redemptions INTEGER,
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  ls_discount_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL,
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'redeemed',  -- 'redeemed' | 'activated' | 'expired'
  redeem_expires_at TEXT,
  activated_at TEXT,
  plan_granted TEXT,
  free_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_user ON campaign_redemptions(user_id);

ALTER TABLE users ADD COLUMN plan_expires_at TEXT;
ALTER TABLE users ADD COLUMN plan_source TEXT;

-- Seed: LAUNCH100 (1 ay ucretsiz voucher, 90 gun aktivasyon penceresi)
INSERT OR IGNORE INTO campaign_codes (id, code, type, free_months, redeem_window_days, eligible_plans, active)
VALUES ('seed-launch100', 'LAUNCH100', 'free_month', 1, 90, 'all', 1);

-- Seed: LAUNCH50 (mevcut %50 launch indirimi; LS discount id 1058288)
INSERT OR IGNORE INTO campaign_codes (id, code, type, percent, duration, eligible_plans, ls_discount_id, active)
VALUES ('seed-launch50', 'LAUNCH50', 'percent', 50, 'once', 'all', '1058288', 1);
```

- [ ] **Step 2: Migration'ı yerel D1'e uygula**

Run (PowerShell, `workers/askdesk-api` içinde):
```
$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\wrangler.cmd d1 execute askdesk-db --local --file src/db/migration-campaigns-v1.sql
```
Expected: `Executed ... commands`, hata yok. (`ALTER TABLE ADD COLUMN` kolon zaten varsa hata verir; ilk çalıştırmada temiz olmalı.)

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/db/migration-campaigns-v1.sql
git commit -m "feat(campaigns): add campaign_codes + redemptions schema and seed"
```

---

## Task 2: `lib/campaigns.js` — saf doğrulama fonksiyonları + testleri

**Files:**
- Create: `workers/askdesk-api/src/lib/campaigns.js`
- Test: `workers/askdesk-api/src/lib/campaigns.test.js`

- [ ] **Step 1: Saf fonksiyonlar için failing test yaz**

`campaigns.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { normalizeCode, isCodeUsable, eligiblePlans, isPlanEligible } from './campaigns.js'

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode('  launch100 ')).toBe('LAUNCH100')
  })
  it('returns empty string for nullish', () => {
    expect(normalizeCode(null)).toBe('')
    expect(normalizeCode(undefined)).toBe('')
  })
})

describe('isCodeUsable', () => {
  const now = Date.parse('2026-07-27T12:00:00Z')
  const base = { active: 1, starts_at: null, ends_at: null, max_redemptions: null, redemptions_count: 0 }
  it('accepts an active, in-window, non-exhausted code', () => {
    expect(isCodeUsable(base, now)).toBe(true)
  })
  it('rejects inactive', () => {
    expect(isCodeUsable({ ...base, active: 0 }, now)).toBe(false)
  })
  it('rejects before starts_at', () => {
    expect(isCodeUsable({ ...base, starts_at: '2026-08-01T00:00:00Z' }, now)).toBe(false)
  })
  it('rejects after ends_at', () => {
    expect(isCodeUsable({ ...base, ends_at: '2026-07-01T00:00:00Z' }, now)).toBe(false)
  })
  it('rejects when max_redemptions reached', () => {
    expect(isCodeUsable({ ...base, max_redemptions: 5, redemptions_count: 5 }, now)).toBe(false)
  })
})

describe('eligiblePlans / isPlanEligible', () => {
  it("returns all paid plans for 'all'", () => {
    expect(eligiblePlans({ eligible_plans: 'all' })).toEqual(['pro', 'growth', 'team'])
  })
  it('parses a JSON array', () => {
    expect(eligiblePlans({ eligible_plans: '["pro","growth"]' })).toEqual(['pro', 'growth'])
  })
  it('checks membership', () => {
    expect(isPlanEligible({ eligible_plans: '["pro"]' }, 'pro')).toBe(true)
    expect(isPlanEligible({ eligible_plans: '["pro"]' }, 'growth')).toBe(false)
  })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaigns.test.js`
Expected: FAIL — "Failed to resolve import './campaigns.js'".

- [ ] **Step 3: Saf fonksiyonları yaz**

`campaigns.js` (bu adımda sadece saf fonksiyonlar; DB fonksiyonları Task 3'te eklenecek):
```js
const PAID_PLANS = ['pro', 'growth', 'team']

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function isCodeUsable(row, nowMs) {
  if (!row || !row.active) return false
  if (row.starts_at && Date.parse(row.starts_at) > nowMs) return false
  if (row.ends_at && Date.parse(row.ends_at) < nowMs) return false
  if (row.max_redemptions != null && row.redemptions_count >= row.max_redemptions) return false
  return true
}

export function eligiblePlans(row) {
  if (!row || row.eligible_plans === 'all' || row.eligible_plans == null) return [...PAID_PLANS]
  try {
    const arr = JSON.parse(row.eligible_plans)
    return Array.isArray(arr) ? arr : [...PAID_PLANS]
  } catch {
    return [...PAID_PLANS]
  }
}

export function isPlanEligible(row, plan) {
  return eligiblePlans(row).includes(plan)
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaigns.test.js`
Expected: PASS (11 test).

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/campaigns.js workers/askdesk-api/src/lib/campaigns.test.js
git commit -m "feat(campaigns): pure code-validation helpers + tests"
```

---

## Task 3: `lib/campaigns.js` — DB orkestrasyon fonksiyonları + testleri

**Files:**
- Modify: `workers/askdesk-api/src/lib/campaigns.js`
- Modify: `workers/askdesk-api/src/lib/campaigns.test.js`

Bu görev `getActiveCode`, `redeemForUser`, `activateVoucher` ekler. Testler için minimal sahte D1 kullanılır.

- [ ] **Step 1: Sahte D1 + orkestrasyon testleri yaz**

`campaigns.test.js` dosyasının SONUNA ekle:
```js
import { getActiveCode, redeemForUser, activateVoucher } from './campaigns.js'

// Minimal in-memory D1 fake. Supports the exact queries campaigns.js issues.
function fakeDb(seed = {}) {
  const state = {
    codes: seed.codes || {},            // code -> row
    codesById: {},
    redemptions: [],                    // rows
    users: seed.users || {},            // id -> row
    credits: {},
  }
  for (const c of Object.values(state.codes)) state.codesById[c.id] = c
  const prepare = (sql) => {
    const q = sql.replace(/\s+/g, ' ').trim()
    return {
      _args: [],
      bind(...a) { this._args = a; return this },
      async first() {
        if (q.startsWith('SELECT * FROM campaign_codes WHERE code =')) {
          return state.codes[this._args[0]] || null
        }
        if (q.startsWith('SELECT * FROM campaign_redemptions WHERE user_id =') && q.includes("type = 'free_month'")) {
          return state.redemptions.find(r => r.user_id === this._args[0] && r.type === 'free_month' && r.status === 'redeemed') || null
        }
        if (q.startsWith('SELECT * FROM campaign_redemptions WHERE code_id =')) {
          return state.redemptions.find(r => r.code_id === this._args[0] && r.user_id === this._args[1]) || null
        }
        if (q.startsWith('SELECT plan FROM users WHERE id =')) {
          return state.users[this._args[0]] || null
        }
        return null
      },
      async run() {
        if (q.startsWith('INSERT INTO campaign_redemptions')) {
          const [id, code_id, code, user_id, type, status, redeem_expires_at] = this._args
          state.redemptions.push({ id, code_id, code, user_id, type, status, redeem_expires_at, activated_at: null, plan_granted: null, free_until: null })
        } else if (q.startsWith('UPDATE campaign_codes SET redemptions_count')) {
          const c = state.codesById[this._args[0]]; if (c) c.redemptions_count = (c.redemptions_count || 0) + 1
        } else if (q.startsWith('UPDATE users SET discount_percent')) {
          const [percent, expires, code, id] = this._args
          if (state.users[id]) Object.assign(state.users[id], { discount_percent: percent, discount_expires_at: expires, discount_code: code })
        } else if (q.startsWith('UPDATE users SET plan =')) {
          const [plan, plan_expires_at, id] = this._args
          if (state.users[id]) Object.assign(state.users[id], { plan, plan_expires_at, plan_source: 'campaign' })
        } else if (q.startsWith('UPDATE user_credits SET')) {
          // no-op for these tests
        } else if (q.startsWith('INSERT INTO user_credits')) {
          // no-op
        } else if (q.startsWith('UPDATE campaign_redemptions SET status')) {
          const [status, activated_at, plan_granted, free_until, id] = this._args
          const r = state.redemptions.find(x => x.id === id)
          if (r) Object.assign(r, { status, activated_at, plan_granted, free_until })
        }
        return { success: true }
      },
    }
  }
  return { prepare, _state: state }
}

describe('getActiveCode', () => {
  const now = Date.parse('2026-07-27T12:00:00Z')
  it('returns a usable code', async () => {
    const db = fakeDb({ codes: { LAUNCH100: { id: 'x', code: 'LAUNCH100', type: 'free_month', active: 1, redemptions_count: 0, eligible_plans: 'all', redeem_window_days: 90 } } })
    const row = await getActiveCode(db, ' launch100 ', now)
    expect(row?.code).toBe('LAUNCH100')
  })
  it('returns null for unknown code', async () => {
    const db = fakeDb()
    expect(await getActiveCode(db, 'NOPE', now)).toBeNull()
  })
  it('returns null for an expired code', async () => {
    const db = fakeDb({ codes: { OLD: { id: 'o', code: 'OLD', active: 1, redemptions_count: 0, ends_at: '2026-01-01T00:00:00Z' } } })
    expect(await getActiveCode(db, 'OLD', now)).toBeNull()
  })
})

describe('redeemForUser', () => {
  const nowIso = '2026-07-27T12:00:00Z'
  it('banks a free_month voucher with a redeem window', async () => {
    const db = fakeDb({ codes: { L: { id: 'c1', code: 'LAUNCH100', type: 'free_month', redeem_window_days: 90 } } })
    const res = await redeemForUser(db, db._state.codes.L, 'u1', nowIso)
    expect(res.type).toBe('free_month')
    const r = db._state.redemptions[0]
    expect(r.status).toBe('redeemed')
    expect(r.redeem_expires_at).toBe('2026-10-25T12:00:00.000Z')
    expect(db._state.codes.L.redemptions_count).toBe(1)
  })
  it('writes discount columns for a percent code', async () => {
    const db = fakeDb({
      codes: { P: { id: 'c2', code: 'SAVE30', type: 'percent', percent: 30, ends_at: null } },
      users: { u2: { id: 'u2' } },
    })
    await redeemForUser(db, db._state.codes.P, 'u2', nowIso)
    expect(db._state.users.u2.discount_percent).toBe(30)
    expect(db._state.users.u2.discount_code).toBe('SAVE30')
  })
  it('rejects a second redemption by the same user', async () => {
    const db = fakeDb({ codes: { L: { id: 'c1', code: 'LAUNCH100', type: 'free_month', redeem_window_days: 90 } } })
    await redeemForUser(db, db._state.codes.L, 'u1', nowIso)
    await expect(redeemForUser(db, db._state.codes.L, 'u1', nowIso)).rejects.toThrow(/zaten/i)
  })
})

describe('activateVoucher', () => {
  const nowIso = '2026-07-27T12:00:00Z'
  it('grants the chosen plan for one month', async () => {
    const db = fakeDb({ users: { u1: { id: 'u1', plan: 'free' } } })
    db._state.redemptions.push({ id: 'r1', code_id: 'c1', code: 'LAUNCH100', user_id: 'u1', type: 'free_month', status: 'redeemed', redeem_expires_at: '2026-10-25T12:00:00.000Z', free_months: 1 })
    // getActiveVoucher reads code row for free_months; stub it
    db._state.codes.LAUNCH100 = { id: 'c1', code: 'LAUNCH100', type: 'free_month', free_months: 1, eligible_plans: 'all' }
    const res = await activateVoucher(db, 'u1', 'growth', nowIso)
    expect(res.plan).toBe('growth')
    expect(res.free_until).toBe('2026-08-27T12:00:00.000Z')
    expect(db._state.users.u1.plan).toBe('growth')
    expect(db._state.users.u1.plan_source).toBe('campaign')
  })
  it('rejects an ineligible plan', async () => {
    const db = fakeDb({ users: { u1: { id: 'u1', plan: 'free' } } })
    db._state.redemptions.push({ id: 'r1', code_id: 'c1', code: 'L', user_id: 'u1', type: 'free_month', status: 'redeemed', redeem_expires_at: '2026-10-25T12:00:00.000Z' })
    db._state.codes.L = { id: 'c1', code: 'L', type: 'free_month', free_months: 1, eligible_plans: '["pro"]' }
    await expect(activateVoucher(db, 'u1', 'growth', nowIso)).rejects.toThrow(/uygun/i)
  })
  it('rejects when there is no banked voucher', async () => {
    const db = fakeDb({ users: { u1: { id: 'u1', plan: 'free' } } })
    await expect(activateVoucher(db, 'u1', 'growth', nowIso)).rejects.toThrow(/voucher/i)
  })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaigns.test.js`
Expected: FAIL — `getActiveCode is not a function` (henüz export yok).

- [ ] **Step 3: DB fonksiyonlarını `campaigns.js`'e ekle**

`campaigns.js` dosyasının SONUNA ekle. `addMonths`/`addDays` UTC güvenli tarih yardımcılarıyla. `activateVoucher`, kredileri sıfırlamak için `setPlanAndReset`'i çağırır (import).

```js
import { setPlanAndReset } from './credits.js'

function addDays(iso, days) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function addMonths(iso, months) {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString()
}

// Look up a code by string and return the row only if currently usable.
export async function getActiveCode(db, rawCode, nowMs = Date.now()) {
  const code = normalizeCode(rawCode)
  if (!code) return null
  const row = await db.prepare('SELECT * FROM campaign_codes WHERE code = ?').bind(code).first()
  if (!row) return null
  return isCodeUsable(row, nowMs) ? row : null
}

// Record a redemption for a user. For percent/amount, also writes the user's
// discount columns so checkout passes the real LS code. Throws if already used.
export async function redeemForUser(db, codeRow, userId, nowIso = new Date().toISOString()) {
  const existing = await db.prepare('SELECT * FROM campaign_redemptions WHERE code_id = ? AND user_id = ?')
    .bind(codeRow.id, userId).first()
  if (existing) throw new Error('Bu kodu zaten kullandınız')

  const id = crypto.randomUUID()
  let redeemExpires = null
  if (codeRow.type === 'free_month') {
    redeemExpires = addDays(nowIso, codeRow.redeem_window_days || 90)
  }
  await db.prepare(
    `INSERT INTO campaign_redemptions (id, code_id, code, user_id, type, status, redeem_expires_at)
     VALUES (?, ?, ?, ?, ?, 'redeemed', ?)`
  ).bind(id, codeRow.id, codeRow.code, userId, codeRow.type, redeemExpires).run()

  await db.prepare('UPDATE campaign_codes SET redemptions_count = redemptions_count + 1 WHERE id = ?')
    .bind(codeRow.id).run()

  if (codeRow.type === 'percent' || codeRow.type === 'amount') {
    // Gate checkout: expires when the campaign ends, else 1 year out.
    const discExpires = codeRow.ends_at || addMonths(nowIso, 12)
    await db.prepare('UPDATE users SET discount_percent = ?, discount_expires_at = ?, discount_code = ? WHERE id = ?')
      .bind(codeRow.percent || 0, discExpires, codeRow.code, userId).run()
  }

  return { type: codeRow.type, code: codeRow.code, redeem_expires_at: redeemExpires }
}

// Activate a banked free_month voucher: grant the chosen plan for free_months,
// internally (no LemonSqueezy). Reverts to free via cron at free_until.
export async function activateVoucher(db, userId, plan, nowIso = new Date().toISOString()) {
  const voucher = await db.prepare(
    "SELECT * FROM campaign_redemptions WHERE user_id = ? AND type = 'free_month' AND status = 'redeemed' ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first()
  if (!voucher) throw new Error('Aktifleştirilecek bir voucher bulunamadı')
  if (voucher.redeem_expires_at && Date.parse(voucher.redeem_expires_at) < Date.parse(nowIso)) {
    throw new Error('Voucher süresi doldu')
  }
  const codeRow = await db.prepare('SELECT * FROM campaign_codes WHERE code = ?').bind(voucher.code).first()
  if (!isPlanEligible(codeRow || { eligible_plans: 'all' }, plan)) {
    throw new Error('Bu voucher seçtiğiniz pakette geçerli değil')
  }
  const freeUntil = addMonths(nowIso, (codeRow?.free_months) || 1)

  await setPlanAndReset(db, userId, plan)
  await db.prepare('UPDATE users SET plan_expires_at = ?, plan_source = ? WHERE id = ?')
    .bind(freeUntil, 'campaign', userId).run()
  await db.prepare("UPDATE campaign_redemptions SET status = 'activated', activated_at = ?, plan_granted = ?, free_until = ? WHERE id = ?")
    .bind(nowIso, plan, freeUntil, voucher.id).run()

  return { plan, free_until: freeUntil }
}
```

Not: `setPlanAndReset` (`credits.js:112`) `users.plan`'i günceller ve krediyi resetler. Ancak bizim `activateVoucher` testindeki sahte DB `UPDATE users SET plan =` sorgusunu bekliyor; `setPlanAndReset` bu sorguyu `UPDATE users SET plan = ? WHERE id = ?` biçiminde yapıyor (2 arg: plan, id). Sahte DB'nin `UPDATE users SET plan =` dalı 3 arg (plan, plan_expires_at, id) bekliyordu; testte plan_expires_at ayrı `UPDATE users SET plan_expires_at` ile yazılıyor. **Sahte DB'yi `setPlanAndReset`'in gerçek sorgularıyla uyumlu tut:** `credits.js`'te `UPDATE users SET plan = ? WHERE id = ?` ve `UPDATE user_credits ...`. Test sahte DB'sindeki `UPDATE users SET plan =` dalını `const [plan, id] = this._args` olacak şekilde düzelt ve ayrı `UPDATE users SET plan_expires_at = ?, plan_source = ?` dalı ekle.

- [ ] **Step 4: Sahte DB'yi gerçek sorgularla hizala**

`campaigns.test.js` içindeki `fakeDb`'de `run()` dallarını `setPlanAndReset`'in sorgularına göre güncelle:
```js
} else if (q.startsWith('UPDATE users SET plan = ?')) {
  const [plan, id] = this._args
  if (state.users[id]) state.users[id].plan = plan
} else if (q.startsWith('UPDATE users SET plan_expires_at')) {
  const [plan_expires_at, plan_source, id] = this._args
  if (state.users[id]) Object.assign(state.users[id], { plan_expires_at, plan_source })
```
Ve `SELECT * FROM campaign_codes WHERE code =` ile `SELECT * FROM campaign_redemptions ... ORDER BY created_at DESC LIMIT 1` için `first()` dallarını ekle (voucher ve codeRow dönüşleri).

- [ ] **Step 5: Testin geçtiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaigns.test.js`
Expected: PASS (tüm campaigns testleri).

- [ ] **Step 6: Commit**

```bash
git add workers/askdesk-api/src/lib/campaigns.js workers/askdesk-api/src/lib/campaigns.test.js
git commit -m "feat(campaigns): DB redemption + voucher activation logic + tests"
```

---

## Task 4: `lib/lemonsqueezy-discounts.js` — LS discount API + testleri

**Files:**
- Create: `workers/askdesk-api/src/lib/lemonsqueezy-discounts.js`
- Test: `workers/askdesk-api/src/lib/lemonsqueezy-discounts.test.js`

- [ ] **Step 1: Failing test yaz**

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildDiscountPayload, createDiscount } from './lemonsqueezy-discounts.js'

afterEach(() => vi.restoreAllMocks())

describe('buildDiscountPayload', () => {
  it('builds a percent discount', () => {
    const p = buildDiscountPayload({ code: 'SAVE30', type: 'percent', percent: 30, duration: 'once' }, false)
    expect(p.data.attributes.amount_type).toBe('percent')
    expect(p.data.attributes.amount).toBe(30)
    expect(p.data.attributes.code).toBe('SAVE30')
    expect(p.data.attributes.duration).toBe('once')
    expect(p.data.attributes.test_mode).toBe(true)
  })
  it('builds a fixed discount in cents', () => {
    const p = buildDiscountPayload({ code: 'OFF50', type: 'amount', amount_cents: 5000, duration: 'forever' }, true)
    expect(p.data.attributes.amount_type).toBe('fixed')
    expect(p.data.attributes.amount).toBe(5000)
    expect(p.data.attributes.test_mode).toBe(false)
  })
  it('sets redemption limit when provided', () => {
    const p = buildDiscountPayload({ code: 'X', type: 'percent', percent: 10, max_redemptions: 100 }, false)
    expect(p.data.attributes.is_limited_redemptions).toBe(true)
    expect(p.data.attributes.max_redemptions).toBe(100)
  })
})

describe('createDiscount', () => {
  it('POSTs and returns the LS discount id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: '999' } }) })
    const id = await createDiscount({ LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_LIVE: 'true' },
      { code: 'SAVE30', type: 'percent', percent: 30 })
    expect(id).toBe('999')
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('throws on non-ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ errors: [{ detail: 'bad' }] }) })
    await expect(createDiscount({ LEMONSQUEEZY_API_KEY: 'k' }, { code: 'X', type: 'percent', percent: 5 }))
      .rejects.toThrow(/bad/)
  })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/lemonsqueezy-discounts.test.js`
Expected: FAIL — import çözülemedi.

- [ ] **Step 3: `lemonsqueezy-discounts.js`'i yaz**

```js
import { LS_API, LS_STORE_ID } from './billing-config.js'

// Note: the LS discount is created store-wide (is_limited_to_products: false).
// eligible_plans is enforced by us for free_month vouchers; percent/amount
// discount codes apply to any plan at checkout. See "open risks" below.
export function buildDiscountPayload(code, testMode) {
  const attrs = {
    name: code.code,
    code: code.code,
    amount: code.type === 'amount' ? code.amount_cents : code.percent,
    amount_type: code.type === 'amount' ? 'fixed' : 'percent',
    duration: code.duration || 'once',
    is_limited_to_products: false,
    is_limited_redemptions: code.max_redemptions != null,
    test_mode: testMode,
  }
  if (code.max_redemptions != null) attrs.max_redemptions = code.max_redemptions
  if (code.starts_at) attrs.starts_at = code.starts_at
  if (code.ends_at) attrs.expires_at = code.ends_at
  return {
    data: {
      type: 'discounts',
      attributes: attrs,
      relationships: { store: { data: { type: 'stores', id: String(LS_STORE_ID) } } },
    },
  }
}

export async function createDiscount(env, code) {
  const testMode = env.LEMONSQUEEZY_LIVE !== 'true'
  const payload = buildDiscountPayload(code, testMode)
  const res = await fetch(`${LS_API}/discounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.errors?.[0]?.detail || 'LS indirim oluşturulamadı')
  return data.data?.id || null
}

export async function deactivateDiscount(env, lsDiscountId) {
  if (!lsDiscountId) return
  await fetch(`${LS_API}/discounts/${lsDiscountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`, Accept: 'application/vnd.api+json' },
  }).catch(() => {})
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/lemonsqueezy-discounts.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/lib/lemonsqueezy-discounts.js workers/askdesk-api/src/lib/lemonsqueezy-discounts.test.js
git commit -m "feat(campaigns): LemonSqueezy discount API wrapper + tests"
```

---

## Task 5: `auth.js` — gömülü DISCOUNT_CODES yerine DB-driven redeem

**Files:**
- Modify: `workers/askdesk-api/src/routes/auth.js:8-17` (DISCOUNT_CODES + computeDiscount kaldır)
- Modify: `workers/askdesk-api/src/routes/auth.js:55-101` (`/register`)
- Modify: `workers/askdesk-api/src/routes/auth.js:152-178` (`/redeem-code`)
- Modify: `workers/askdesk-api/src/routes/auth.js:127-150` (`/me`)

- [ ] **Step 1: Import ekle, DISCOUNT_CODES + computeDiscount sil**

`auth.js` başındaki importlara ekle:
```js
import { getActiveCode, redeemForUser } from '../lib/campaigns.js'
```
Sil (satır 8-17): `const DISCOUNT_CODES = ...` ve `function computeDiscount(...) { ... }` bloğunun tamamı.

- [ ] **Step 2: `/register`'ı DB-driven redeem'e çevir**

`/register` içinde şu bloğu (mevcut satır 82-83):
```js
  const disc = discount_code ? computeDiscount(discount_code) : null
  if (discount_code && !disc) return c.json({ error: 'Geçersiz indirim kodu' }, 400)
```
ŞUNunla değiştir (kod doğrulaması kayıttan önce; redemption kullanıcı oluşturulduktan sonra):
```js
  let codeRow = null
  if (discount_code) {
    codeRow = await getActiveCode(c.env.DB, discount_code)
    if (!codeRow) return c.json({ error: 'Geçersiz veya süresi dolmuş kampanya kodu' }, 400)
  }
```
INSERT INTO users satırındaki `discount_percent, discount_expires_at, discount_code` değerlerini artık redeem üstünden yazacağız; INSERT'te bu üç kolonu `0, NULL, NULL` ver (redeem sonra günceller). INSERT bind'ini şu şekilde değiştir (mevcut satır 90-91):
```js
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, company_name, role, email_domain, plan, trial_expires_at, discount_percent, discount_expires_at, discount_code, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, company_name || null, 'member', domain, 'free', trialExpires, 0, null, null, new Date().toISOString()).run()

  if (codeRow) {
    try { await redeemForUser(c.env.DB, codeRow, id) } catch { /* code raced/invalid; account still created */ }
  }
```
`return c.json(...)` satırını (mevcut 100) sadeleştir — discount alanlarını kullanıcıdan tekrar okumaya gerek yok:
```js
  return c.json({ id, email, name, company_name, role: 'member', plan: 'free', trial_expires_at: trialExpires, campaign_code: codeRow?.code || null }, 201)
```

- [ ] **Step 3: `/redeem-code`'u DB-driven yap**

`/redeem-code` gövdesindeki mevcut mantığı (satır 169-177) şununla değiştir:
```js
  const { code } = await c.req.json()
  const codeRow = await getActiveCode(c.env.DB, code)
  if (!codeRow) return c.json({ error: 'Geçersiz veya süresi dolmuş kampanya kodu' }, 400)
  try {
    const res = await redeemForUser(c.env.DB, codeRow, userId)
    if (res.type === 'free_month') {
      return c.json({ type: 'free_month', code: res.code, redeem_expires_at: res.redeem_expires_at })
    }
    return c.json({ type: codeRow.type, code: res.code, discount_percent: codeRow.percent || 0, discount_amount_cents: codeRow.amount_cents || 0 })
  } catch (err) {
    return c.json({ error: err.message || 'Kod kullanılamadı' }, 409)
  }
```

- [ ] **Step 4: `/me`'ye voucher + kampanya planı durumu ekle**

`/me` içindeki SELECT'e `plan_expires_at, plan_source` ekle ve aktif voucher'ı sorgula. SELECT satırını (137) değiştir:
```js
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, company_name, role, plan, trial_expires_at, created_at, discount_percent, discount_expires_at, discount_code, plan_expires_at, plan_source FROM users WHERE id = ?'
    ).bind(payload.sub).first()
    let voucher = null
    if (user) {
      voucher = await c.env.DB.prepare(
        "SELECT code, redeem_expires_at FROM campaign_redemptions WHERE user_id = ? AND type = 'free_month' AND status = 'redeemed' ORDER BY created_at DESC LIMIT 1"
      ).bind(payload.sub).first()
    }
    return c.json({
      user: user ? {
        ...user,
        discount_percent: user.discount_percent || 0,
        discount_expires_at: user.discount_expires_at || null,
        discount_code: user.discount_code || null,
        plan_expires_at: user.plan_expires_at || null,
        plan_source: user.plan_source || null,
        pending_voucher: voucher || null,
      } : null,
    })
```

- [ ] **Step 5: Mevcut testleri çalıştır (regresyon)**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run`
Expected: PASS (mevcut 36 + yeni campaign/LS testleri).

- [ ] **Step 6: Commit**

```bash
git add workers/askdesk-api/src/routes/auth.js
git commit -m "feat(campaigns): DB-driven code redemption in register/redeem-code/me"
```

---

## Task 6: `payments` (billing.js) — checkout kullanıcının kodunu geçsin + activate-voucher

**Files:**
- Modify: `workers/askdesk-api/src/routes/billing.js:18-25` (checkout discount)
- Modify: `workers/askdesk-api/src/routes/billing.js` (yeni endpoint)

- [ ] **Step 1: Checkout'ta sabit kod yerine kullanıcının kodunu geç**

`billing.js:22-25` bloğunu:
```js
  // Apply the launch discount if the user redeemed it and it hasn't expired.
  if (user?.discount_percent && user.discount_expires_at && new Date(user.discount_expires_at) > new Date()) {
    checkoutData.discount_code = LS_DISCOUNT_CODE
  }
```
ŞUNunla değiştir:
```js
  // Apply the user's redeemed campaign code (it exists in LS, auto-created by
  // the admin campaigns module) if it has not expired.
  if (user?.discount_code && user.discount_expires_at && new Date(user.discount_expires_at) > new Date()) {
    checkoutData.discount_code = user.discount_code
  }
```
`LS_DISCOUNT_CODE` importu artık kullanılmıyorsa import satırından çıkar (`billing-config.js` importunda). `import { LS_API, LS_STORE_ID, VARIANTS } from '../lib/billing-config.js'`.

- [ ] **Step 2: `/activate-voucher` endpoint'ini ekle**

`billing.js`'e (export default'tan önce) ekle:
```js
import { activateVoucher } from '../lib/campaigns.js'

// ─── POST /activate-voucher (authed) — start a banked free_month voucher ─────
billing.post('/activate-voucher', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { plan } = await c.req.json()
  if (!['pro', 'growth', 'team'].includes(plan)) return c.json({ error: 'Geçersiz paket' }, 400)
  try {
    const res = await activateVoucher(c.env.DB, userId, plan)
    return c.json({ ok: true, plan: res.plan, free_until: res.free_until })
  } catch (err) {
    return c.json({ error: err.message || 'Voucher aktifleştirilemedi' }, 400)
  }
})
```
Not: `authMiddleware` zaten `billing.js`'te import edilmiş (satır 2). `activateVoucher` importunu dosya başına taşı.

- [ ] **Step 3: Mevcut testler geçiyor mu**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add workers/askdesk-api/src/routes/billing.js
git commit -m "feat(campaigns): checkout uses user's code + activate-voucher endpoint"
```

---

## Task 7: `admin.js` — kampanya CRUD + LS senkron

**Files:**
- Modify: `workers/askdesk-api/src/routes/admin.js` (yeni endpoint'ler)

- [ ] **Step 1: Import + list/create/patch/delete endpoint'lerini ekle**

`admin.js` başına ekle:
```js
import { createDiscount, deactivateDiscount } from '../lib/lemonsqueezy-discounts.js'
import { normalizeCode } from '../lib/campaigns.js'
```
`export default admin`'den önce ekle:
```js
// ─── Campaign codes CRUD (super-admin) ───────────────────────────────────────
admin.get('/campaigns', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM campaign_codes ORDER BY created_at DESC').all()
  return c.json({ campaigns: rows.results || [] })
})

admin.post('/campaigns', async (c) => {
  const b = await c.req.json()
  const code = normalizeCode(b.code)
  if (!code) return c.json({ error: 'Kod gerekli' }, 400)
  if (!['percent', 'amount', 'free_month'].includes(b.type)) return c.json({ error: 'Geçersiz tip' }, 400)
  if (b.type === 'percent' && !(b.percent > 0 && b.percent <= 100)) return c.json({ error: 'Yüzde 1-100 olmalı' }, 400)
  if (b.type === 'amount' && !(b.amount_cents > 0)) return c.json({ error: 'Tutar gerekli' }, 400)
  if (b.type === 'free_month' && !(b.free_months > 0)) return c.json({ error: 'Ay sayısı gerekli' }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM campaign_codes WHERE code = ?').bind(code).first()
  if (existing) return c.json({ error: 'Bu kod zaten var' }, 409)

  const eligible_plans = Array.isArray(b.eligible_plans) && b.eligible_plans.length
    ? JSON.stringify(b.eligible_plans) : 'all'

  // For discount types, create the LS discount first so DB only stores real ones.
  let lsId = null
  if (b.type === 'percent' || b.type === 'amount') {
    try {
      lsId = await createDiscount(c.env, {
        code, type: b.type, percent: b.percent, amount_cents: b.amount_cents,
        duration: b.duration === 'forever' ? 'forever' : 'once',
        starts_at: b.starts_at || null, ends_at: b.ends_at || null,
        max_redemptions: b.max_redemptions || null,
      })
    } catch (err) {
      return c.json({ error: 'LemonSqueezy indirimi oluşturulamadı: ' + err.message }, 500)
    }
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO campaign_codes (id, code, type, percent, amount_cents, duration, free_months, redeem_window_days, eligible_plans, starts_at, ends_at, max_redemptions, ls_discount_id, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(id, code, b.type, b.percent || null, b.amount_cents || null,
    b.duration === 'forever' ? 'forever' : 'once', b.free_months || null,
    b.redeem_window_days || null, eligible_plans, b.starts_at || null, b.ends_at || null,
    b.max_redemptions || null, lsId).run()

  return c.json({ id, code, ls_discount_id: lsId }, 201)
})

admin.patch('/campaigns/:id', async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json()
  const fields = []
  const vals = []
  for (const k of ['active', 'starts_at', 'ends_at', 'max_redemptions']) {
    if (k in b) { fields.push(`${k} = ?`); vals.push(b[k]) }
  }
  if (!fields.length) return c.json({ error: 'Güncellenecek alan yok' }, 400)
  vals.push(id)
  await c.env.DB.prepare(`UPDATE campaign_codes SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()
  return c.json({ ok: true })
})

admin.delete('/campaigns/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT ls_discount_id FROM campaign_codes WHERE id = ?').bind(id).first()
  await c.env.DB.prepare('UPDATE campaign_codes SET active = 0 WHERE id = ?').bind(id).run()
  if (row?.ls_discount_id) await deactivateDiscount(c.env, row.ls_discount_id)
  return c.json({ ok: true })
})
```

- [ ] **Step 2: Worker'ı yerelde başlat + endpoint dumanı (manuel doğrulama)**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\wrangler.cmd dev --local` (ayrı terminalde)
Manuel: superadmin token'ı ile `GET http://localhost:8787/admin/campaigns` → seed edilen LAUNCH100 + LAUNCH50 dönmeli. (Token yoksa bu adımı deploy sonrası canlıda doğrula; not düş.)

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/routes/admin.js
git commit -m "feat(campaigns): super-admin campaign CRUD with LS discount sync"
```

---

## Task 8: Cron — kampanya süre bitişi (free'ye dönüş)

**Files:**
- Create: `workers/askdesk-api/src/lib/campaign-expiry.js`
- Modify: `workers/askdesk-api/src/index.js:70` (scheduled)
- Test: `workers/askdesk-api/src/lib/campaign-expiry.test.js`

- [ ] **Step 1: Failing test yaz**

`campaign-expiry.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { runCampaignExpiry } from './campaign-expiry.js'

vi.mock('./credits.js', () => ({ setPlanAndReset: vi.fn().mockResolvedValue(undefined) }))

function fakeDb(expiredUsers, expiredVouchers) {
  const calls = []
  return {
    calls,
    prepare(sql) {
      const q = sql.replace(/\s+/g, ' ').trim()
      return {
        _a: [],
        bind(...a) { this._a = a; return this },
        async all() {
          if (q.startsWith('SELECT id FROM users WHERE plan_source')) return { results: expiredUsers }
          if (q.startsWith('SELECT id FROM campaign_redemptions')) return { results: expiredVouchers }
          return { results: [] }
        },
        async run() { calls.push({ q, a: this._a }); return { success: true } },
      }
    },
  }
}

describe('runCampaignExpiry', () => {
  it('reverts expired campaign plans to free and clears markers', async () => {
    const db = fakeDb([{ id: 'u1' }], [])
    await runCampaignExpiry({ DB: db })
    const cleared = db.calls.find(c => c.q.includes('plan_expires_at = NULL'))
    expect(cleared).toBeTruthy()
    expect(cleared.a).toContain('u1')
  })
  it('expires un-activated vouchers past their window', async () => {
    const db = fakeDb([], [{ id: 'r1' }])
    await runCampaignExpiry({ DB: db })
    const exp = db.calls.find(c => c.q.includes("status = 'expired'"))
    expect(exp).toBeTruthy()
    expect(exp.a).toContain('r1')
  })
})
```

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaign-expiry.test.js`
Expected: FAIL — import çözülemedi.

- [ ] **Step 3: `campaign-expiry.js`'i yaz**

```js
import { setPlanAndReset } from './credits.js'

// Runs on the 15-min cron. (1) Reverts users whose campaign free month ended
// back to free. (2) Expires banked vouchers whose redeem window passed.
export async function runCampaignExpiry(env) {
  const db = env.DB
  const now = new Date().toISOString()

  const expiredPlans = await db.prepare(
    "SELECT id FROM users WHERE plan_source = 'campaign' AND plan_expires_at IS NOT NULL AND plan_expires_at <= ?"
  ).bind(now).all()
  for (const u of (expiredPlans.results || [])) {
    await setPlanAndReset(db, u.id, 'free')
    await db.prepare('UPDATE users SET plan_expires_at = NULL, plan_source = NULL WHERE id = ?').bind(u.id).run()
    await db.prepare("UPDATE campaign_redemptions SET status = 'expired' WHERE user_id = ? AND status = 'activated'").bind(u.id).run()
  }

  const expiredVouchers = await db.prepare(
    "SELECT id FROM campaign_redemptions WHERE type = 'free_month' AND status = 'redeemed' AND redeem_expires_at IS NOT NULL AND redeem_expires_at <= ?"
  ).bind(now).all()
  for (const r of (expiredVouchers.results || [])) {
    await db.prepare("UPDATE campaign_redemptions SET status = 'expired' WHERE id = ?").bind(r.id).run()
  }
}
```

- [ ] **Step 4: Testin geçtiğini doğrula**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run src/lib/campaign-expiry.test.js`
Expected: PASS.

- [ ] **Step 5: Cron handler'a bağla**

`src/index.js:22` importlarına ekle:
```js
import { runCampaignExpiry } from './lib/campaign-expiry.js'
```
`src/index.js:70` scheduled satırını değiştir:
```js
  scheduled: (event, env, ctx) => ctx.waitUntil(Promise.all([
    runTrialReminders(env),
    runCampaignExpiry(env),
  ])),
```

- [ ] **Step 6: Tam test paketi**

Run: `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\vitest.cmd run`
Expected: PASS (tümü).

- [ ] **Step 7: Commit**

```bash
git add workers/askdesk-api/src/lib/campaign-expiry.js workers/askdesk-api/src/lib/campaign-expiry.test.js workers/askdesk-api/src/index.js
git commit -m "feat(campaigns): cron reverts expired free months + stale vouchers"
```

---

## Task 9: Frontend — `api.patch` helper

**Files:**
- Modify: `src/lib/api.js:35`

- [ ] **Step 1: patch helper ekle**

`src/lib/api.js`'te `api.del` satırının altına ekle:
```js
api.patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) })
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.js
git commit -m "feat(api): add patch helper"
```

---

## Task 10: Frontend — Admin.jsx "Kampanya Kodları" bölümü

**Files:**
- Modify: `src/pages/Admin.jsx`

Mevcut stil kuralları: `text-sm/xs`, `border-[#E5E7EB]`, cyan/blue butonlar, **emoji yok, düzgün Türkçe, tire yok**.

- [ ] **Step 1: State + veri çekme ekle**

`Admin.jsx` `Admin()` içinde, mevcut `useState`'lerin altına ekle:
```js
  const [campaigns, setCampaigns] = useState([])
  const emptyForm = { code: '', type: 'percent', percent: 30, amount_cents: 5000, free_months: 1, redeem_window_days: 90, duration: 'once', eligible_plans: [], starts_at: '', ends_at: '', max_redemptions: '' }
  const [cForm, setCForm] = useState(emptyForm)
  const [cErr, setCErr] = useState('')
  const [cBusy, setCBusy] = useState(false)
```
`useEffect` içindeki `api.get('/admin/activity')` bloğunun altına ekle:
```js
    api.get('/admin/campaigns').then(d => setCampaigns(d.campaigns || [])).catch(() => {})
```

- [ ] **Step 2: create/toggle/delete işleyicileri ekle**

`Admin()` içinde `return` öncesine ekle:
```js
  async function createCampaign(e) {
    e.preventDefault()
    setCErr(''); setCBusy(true)
    try {
      const body = {
        code: cForm.code, type: cForm.type,
        eligible_plans: cForm.eligible_plans,
        starts_at: cForm.starts_at || null, ends_at: cForm.ends_at || null,
        max_redemptions: cForm.max_redemptions ? Number(cForm.max_redemptions) : null,
      }
      if (cForm.type === 'percent') body.percent = Number(cForm.percent)
      if (cForm.type === 'amount') body.amount_cents = Math.round(Number(cForm.amount_cents))
      if (cForm.type !== 'free_month') body.duration = cForm.duration
      if (cForm.type === 'free_month') { body.free_months = Number(cForm.free_months); body.redeem_window_days = Number(cForm.redeem_window_days) }
      await api.post('/admin/campaigns', body)
      setCForm(emptyForm)
      const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
    } catch (err) { setCErr(err.message) } finally { setCBusy(false) }
  }
  async function toggleCampaign(id, active) {
    await api.patch(`/admin/campaigns/${id}`, { active: active ? 0 : 1 })
    const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
  }
  async function deleteCampaign(id) {
    await api.del(`/admin/campaigns/${id}`)
    const d = await api.get('/admin/campaigns'); setCampaigns(d.campaigns || [])
  }
  function cValue(c) {
    if (c.type === 'percent') return `%${c.percent}`
    if (c.type === 'amount') return '$' + (c.amount_cents / 100)
    return `${c.free_months} ay ücretsiz`
  }
```

- [ ] **Step 3: UI bölümünü render et**

`Admin.jsx` `return (...)` içinde, "Plan Dağılımı" bloğundan ÖNCE ekle:
```jsx
      {/* Kampanya kodları */}
      <div className="text-xs font-semibold text-[#374151] mb-2">{t('Kampanya Kodları')}</div>
      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-3">
        <form onSubmit={createCampaign} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <label className="text-xs text-[#6B7280]">Kod
            <input value={cForm.code} onChange={e => setCForm({ ...cForm, code: e.target.value.toUpperCase() })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm uppercase" placeholder="LAUNCH100" />
          </label>
          <label className="text-xs text-[#6B7280]">Tip
            <select value={cForm.type} onChange={e => setCForm({ ...cForm, type: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm">
              <option value="percent">Yüzde indirim</option>
              <option value="amount">Tutar indirim</option>
              <option value="free_month">Ücretsiz ay</option>
            </select>
          </label>
          {cForm.type === 'percent' && (
            <label className="text-xs text-[#6B7280]">Yüzde
              <input type="number" min="1" max="100" value={cForm.percent} onChange={e => setCForm({ ...cForm, percent: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
            </label>
          )}
          {cForm.type === 'amount' && (
            <label className="text-xs text-[#6B7280]">Tutar (cent, USD)
              <input type="number" min="1" value={cForm.amount_cents} onChange={e => setCForm({ ...cForm, amount_cents: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
            </label>
          )}
          {cForm.type === 'free_month' && (
            <>
              <label className="text-xs text-[#6B7280]">Ay
                <input type="number" min="1" value={cForm.free_months} onChange={e => setCForm({ ...cForm, free_months: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs text-[#6B7280]">Aktivasyon penceresi (gün)
                <input type="number" min="1" value={cForm.redeem_window_days} onChange={e => setCForm({ ...cForm, redeem_window_days: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
              </label>
            </>
          )}
          {cForm.type !== 'free_month' && (
            <label className="text-xs text-[#6B7280]">Süre
              <select value={cForm.duration} onChange={e => setCForm({ ...cForm, duration: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm">
                <option value="once">Tek seferlik (ilk ödeme)</option>
                <option value="forever">Her ödeme</option>
              </select>
            </label>
          )}
          <label className="text-xs text-[#6B7280]">Başlangıç
            <input type="date" value={cForm.starts_at} onChange={e => setCForm({ ...cForm, starts_at: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-[#6B7280]">Bitiş
            <input type="date" value={cForm.ends_at} onChange={e => setCForm({ ...cForm, ends_at: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-[#6B7280]">Kullanım limiti
            <input type="number" min="1" value={cForm.max_redemptions} onChange={e => setCForm({ ...cForm, max_redemptions: e.target.value })} className="mt-1 w-full border border-[#E5E7EB] rounded-md px-2 py-1.5 text-sm" placeholder="Sınırsız" />
          </label>
          <button type="submit" disabled={cBusy || !cForm.code.trim()} className="text-xs font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 rounded-md px-4 py-2">
            {cBusy ? 'Ekleniyor...' : 'Kod Ekle'}
          </button>
        </form>
        {cErr && <div className="text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-md px-3 py-2 mt-2">{cErr}</div>}
      </div>
      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kod</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Tip</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Değer</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Pencere</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Kullanım</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">Durum</th>
              <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr><td colSpan="7" className="text-xs text-[#9CA3AF] text-center py-6">Henüz kampanya kodu yok.</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} className="border-b border-[#E5E7EB] last:border-0">
                <td className="px-4 py-2 text-xs font-medium text-[#111827]">{c.code}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{c.type}</td>
                <td className="px-4 py-2 text-xs text-[#111827]">{cValue(c)}</td>
                <td className="px-4 py-2 text-xs text-[#9CA3AF]">{(c.starts_at || '-')} / {(c.ends_at || '-')}</td>
                <td className="px-4 py-2 text-xs text-[#6B7280]">{c.redemptions_count}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</td>
                <td className="px-4 py-2 text-xs">
                  <button onClick={() => toggleCampaign(c.id, c.active)} className={c.active ? 'text-[#059669]' : 'text-[#9CA3AF]'}>{c.active ? 'Aktif' : 'Pasif'}</button>
                </td>
                <td className="px-4 py-2 text-xs"><button onClick={() => deleteCampaign(c.id)} className="text-[#DC2626]">Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
```

- [ ] **Step 4: Build (derleme hatası yok)**

Run (repo kökü): `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; npm run build`
Expected: Vite build başarılı.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(campaigns): admin campaign codes management UI"
```

---

## Task 11: Frontend — Settings.jsx voucher aktivasyonu

**Files:**
- Modify: `src/pages/Settings.jsx` (redeem sonucu + voucher kutusu)

- [ ] **Step 1: redeem sonucunu genelleştir (voucher tipini işle)**

`Settings.jsx:208-211` bloğunu:
```js
      const data = await api.post('/auth/redeem-code', { code: redeemCode })
      setRedeemed({ discount_percent: data.discount_percent, discount_expires_at: data.discount_expires_at })
```
ŞUNunla değiştir:
```js
      const data = await api.post('/auth/redeem-code', { code: redeemCode })
      if (data.type === 'free_month') {
        setRedeemed({ free_month: true, code: data.code, redeem_expires_at: data.redeem_expires_at })
      } else {
        setRedeemed({ discount_percent: data.discount_percent, discount_expires_at: data.discount_expires_at })
      }
```

- [ ] **Step 2: Voucher aktivasyon kutusu ekle**

`Settings.jsx`'te `goCheckout` fonksiyonunun altına ekle:
```js
  const [voucherPlan, setVoucherPlan] = useState('growth')
  const [voucherBusy, setVoucherBusy] = useState(false)
  const [voucherMsg, setVoucherMsg] = useState('')
  async function activateVoucher() {
    setVoucherBusy(true); setVoucherMsg('')
    try {
      const r = await api.post('/payments/activate-voucher', { plan: voucherPlan })
      setVoucherMsg((isEn ? 'Free month started on ' : 'Ücretsiz ay başladı: ') + voucherPlan + ' — ' + new Date(r.free_until).toLocaleDateString('tr-TR'))
    } catch (err) { setVoucherMsg(err.message) } finally { setVoucherBusy(false) }
  }
```
`user?.pending_voucher` varsa "Plan & Faturalama" bölümünün ÜSTÜNE render et:
```jsx
      {user?.pending_voucher && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-md p-4 mb-4">
          <div className="text-sm font-medium text-[#065F46] mb-2">
            {isEn ? 'You have 1 free month available' : '1 aylık ücretsiz kullanım hakkınız var'}
          </div>
          <div className="text-xs text-[#047857] mb-3">
            {isEn ? 'Choose a plan and start. Valid until ' : 'Paket seçip başlatın. Son kullanım: '}
            {new Date(user.pending_voucher.redeem_expires_at).toLocaleDateString('tr-TR')}
          </div>
          <div className="flex items-center gap-2">
            <select value={voucherPlan} onChange={e => setVoucherPlan(e.target.value)} className="border border-[#A7F3D0] rounded-md px-2 py-1.5 text-sm">
              <option value="pro">Pro</option>
              <option value="growth">Growth</option>
              <option value="team">Team</option>
            </select>
            <button onClick={activateVoucher} disabled={voucherBusy} className="text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] disabled:opacity-50 rounded-md px-4 py-2">
              {voucherBusy ? (isEn ? 'Starting...' : 'Başlatılıyor...') : (isEn ? 'Start free month' : 'Ücretsiz ayı başlat')}
            </button>
          </div>
          {voucherMsg && <div className="text-xs text-[#065F46] mt-2">{voucherMsg}</div>}
        </div>
      )}
```
Ayrıca redeem başarı mesajında free_month durumunu göster: mevcut discount göstergesinin (satır 292-296 civarı) yanına `redeemed?.free_month` ise "1 aylık ücretsiz hak tanımlandı, aşağıdan başlatın" mesajı ekle.

- [ ] **Step 3: Build**

Run (repo kökü): `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; npm run build`
Expected: Vite build başarılı.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat(campaigns): voucher activation UI in settings"
```

---

## Task 12: Deploy (canlıya alma)

**Files:** yok (deploy adımları)

- [ ] **Step 1: Remote D1 migration**

Run (`workers/askdesk-api`): `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\wrangler.cmd d1 execute askdesk-db --remote --file src/db/migration-campaigns-v1.sql`
Expected: başarılı; LAUNCH100 + LAUNCH50 seed'lendi.

- [ ] **Step 2: Worker deploy**

Run (`workers/askdesk-api`): `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; .\node_modules\.bin\wrangler.cmd deploy`
Expected: yeni Version ID.

- [ ] **Step 3: Frontend build + CF Pages deploy**

Run (repo kökü): `$env:PATH="C:\nvm4w\nodejs;$env:PATH"; npm run build`
Sonra: `.\node_modules\.bin\wrangler.cmd pages deploy dist --project-name askdesk-app --branch main`
Expected: Pages deploy URL. (Bkz [[reference-askdesk-deploy]]: git push deploy ETMEZ, direct-upload.)

- [ ] **Step 4: Canlı duman testi**

- superadmin (captsertacgul@gmail.com) ile giriş → Admin → Kampanya Kodları'nda LAUNCH100 + LAUNCH50 görünmeli.
- Yeni bir %30 kod ekle → LS'de discount oluştuğunu doğrula (LemonSqueezy panelinde).
- LAUNCH100'ü test bir hesapla redeem et → Settings'te "1 aylık ücretsiz" kutusu → paket seç → başlat → plan değişmeli, `free_until` görünmeli.

- [ ] **Step 5: Commit yoksa atla; deploy notu**

Değişiklik commit'leri Task 1-11'de atıldı. Deploy'un git'e yansıması için `git status` temiz olmalı.

---

## Notlar / açık riskler
- **LS test/live modu:** `createDiscount` `env.LEMONSQUEEZY_LIVE`'a göre `test_mode` set eder. Canlı checkout `LEMONSQUEEZY_LIVE='true'` ise indirimler live modda oluşmalı. Task 12 Step 4'te LS panelinde doğrula; discount live mağazada görünmüyorsa `LEMONSQUEEZY_LIVE` secret'ını kontrol et.
- **Değer düzenleme:** percent/amount kodun değeri oluşturulduktan sonra değiştirilemez (LS discount immutable kabul edildi). Değer değişimi = kodu pasifleştir + yeni kod. UI sadece aktif/pasif + sil sunar.
- **İndirim kodu plan kısıtı:** percent/amount kodlar LS'de mağaza-geneli oluşur; `eligible_plans` sadece free_month voucher aktivasyonunda zorlanır. İndirim kodunu belirli planlarla sınırlama gerekirse LS discount'a variant ilişkisi eklenmeli (ayrı iş).
- **Superadmin token'ı:** admin uçları `role='superadmin'` ister; yerel dev'de token yoksa Task 7 Step 2 canlıda doğrulanır.
