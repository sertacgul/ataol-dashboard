# Universal Credits + Landing — Implementation Plan

> Execute via superpowers:subagent-driven-development.

**Goal:** Single credit pool; every AI/generation action deducts credits; plans expressed in credits; balance shown app-wide; landing pricing in credits + de-slop.

**Branch:** new `feat/universal-credits`. Git root `C:\Users\serta`, project `actledger/`. Only `git add` exact paths; never `-A`.

Ref spec: `docs/superpowers/specs/2026-07-13-universal-credits-landing-design.md`

Charge pattern (every metered endpoint): check credits at start → `402` if insufficient → do work → `deductCredit(db, userId, amount)` on success.

Credit menu: reveal 1 (exists), bulk-reveal 1/person (exists), compose 1, auto-outreach 1, ai/generate 1, ai/research 1, seo POST create 5, seo translate 1, seo check 1, competitors analyze 2, maps search 1, maps details 1, maps sentiment 1, profile analyze 1.

---

## Task 1: Shared `lib/credits.js` + email-finder refactor + charge compose/auto-outreach

**Files:** Create `workers/askdesk-api/src/lib/credits.js`; modify `workers/askdesk-api/src/routes/email-finder.js`.

- [ ] Create `lib/credits.js` by MOVING these from email-finder.js (keep bodies identical, add `amount`): `PLAN_LIMITS`, `getNextResetDate`, `getOrCreateCredits`, `deductCredit`. Add `hasCredits` and `checkCredits`:
```js
const PLAN_LIMITS = { free: 25, pro: 250, growth: 600, team: 600 }

export { PLAN_LIMITS }

export function getNextResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().split('T')[0]
}

export async function getOrCreateCredits(db, userId, plan) {
  let credits = await db.prepare('SELECT * FROM user_credits WHERE user_id = ?').bind(userId).first()
  if (!credits) {
    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free
    const resetDate = getNextResetDate()
    await db.prepare('INSERT INTO user_credits (user_id, monthly_limit, used_this_month, reset_date) VALUES (?, ?, 0, ?)')
      .bind(userId, limit, resetDate).run()
    credits = { user_id: userId, monthly_limit: limit, used_this_month: 0, reset_date: resetDate }
  }
  if (new Date(credits.reset_date) <= new Date()) {
    const newReset = getNextResetDate()
    const limit = PLAN_LIMITS[plan] || credits.monthly_limit
    await db.prepare('UPDATE user_credits SET used_this_month = 0, reset_date = ?, monthly_limit = ? WHERE user_id = ?')
      .bind(newReset, limit, userId).run()
    credits.used_this_month = 0; credits.reset_date = newReset; credits.monthly_limit = limit
  }
  return credits
}

export function hasCredits(credits, amount = 1) {
  return (credits.monthly_limit - credits.used_this_month) >= amount
}

export async function deductCredit(db, userId, amount = 1) {
  await db.prepare('UPDATE user_credits SET used_this_month = used_this_month + ? WHERE user_id = ?')
    .bind(amount, userId).run()
}

// Convenience for routes: returns { ok, userId }. Does NOT deduct.
export async function checkCredits(c, amount = 1) {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const credits = await getOrCreateCredits(c.env.DB, userId, user?.plan || 'free')
  return { ok: hasCredits(credits, amount), userId, credits }
}
```
- [ ] In `email-finder.js`: DELETE the local `PLAN_LIMITS`, `getOrCreateCredits`, `getNextResetDate`, `deductCredit` (now in credits.js). Add `import { PLAN_LIMITS, getOrCreateCredits, deductCredit, checkCredits } from '../lib/credits.js'`. Existing `deductCredit(c.env.DB, userId)` calls still work (amount defaults 1). The `/credits` GET, `/reveal`, `/bulk-reveal` keep working via imports.
- [ ] Charge `/compose`: at handler start add `const { ok, userId: uid } = await checkCredits(c, 1); if (!ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)`. On successful JSON return (email produced), before returning add `await deductCredit(c.env.DB, uid, 1)`. (Keep existing `userId` var; use it.)
- [ ] Charge `/auto-outreach`: same, 1 credit, deduct after the draft is saved + before final `c.json`.
- [ ] Verify: `cd workers/askdesk-api && node --check src/lib/credits.js && node --check src/routes/email-finder.js`; `node node_modules/vitest/vitest.mjs run src/lib/enrichment/` (25/32 tests still pass).
- [ ] Commit: `git add actledger/workers/askdesk-api/src/lib/credits.js actledger/workers/askdesk-api/src/routes/email-finder.js && git commit -m "feat: shared credits lib; charge compose/auto-outreach"`

---

## Task 2: Charge ai.js, competitors.js, profile.js

**Files:** modify `workers/askdesk-api/src/routes/{ai,competitors,profile}.js`. READ each first.

For EACH endpoint below: add `import { checkCredits, deductCredit } from '../lib/credits.js'` (top), then at the handler start `const { ok, userId } = await checkCredits(c, N); if (!ok) return c.json({ error: 'Yetersiz kredi. Paketinizi yükseltin.' }, 402)` (reuse existing userId if already fetched — don't redeclare; if handler already has `const userId = c.get('userId')`, call `checkCredits(c, N)` and destructure only `ok`). After the work succeeds (just before the success `c.json(...)`), add `await deductCredit(c.env.DB, userId, N)`.
- `ai.js` `ai.post('/generate')` → N=1
- `ai.js` `ai.post('/research')` → N=1
- `competitors.js` `competitors.post('/:id/analyze')` → N=2
- `profile.js` `profile.post('/analyze')` → N=1
- [ ] Verify `node --check` on all three.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/ai.js actledger/workers/askdesk-api/src/routes/competitors.js actledger/workers/askdesk-api/src/routes/profile.js && git commit -m "feat: charge credits for ai/competitor/profile actions"`

---

## Task 3: Charge seo.js + maps.js

**Files:** modify `workers/askdesk-api/src/routes/{seo,maps}.js`. READ each first. Same pattern (import + checkCredits + deductCredit after success).
- `seo.js` `seo.post('/')` (create article) → N=5
- `seo.js` `seo.post('/:id/translate')` → N=1
- `seo.js` `seo.post('/:id/check')` → N=1
- `maps.js` `maps.post('/search')` → N=1
- `maps.js` `maps.post('/details')` → N=1
- `maps.js` `maps.post('/sentiment')` → N=1
- [ ] Verify `node --check` on both.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/seo.js actledger/workers/askdesk-api/src/routes/maps.js && git commit -m "feat: charge credits for seo/maps actions"`

---

## Task 4: App-wide credit balance UI

**Files:** modify `src/components/Sidebar.jsx` (+ read `src/pages/email-finder/EmailFinder.jsx` CreditsBar for the API shape).

- [ ] The endpoint `GET /email-finder/credits` returns `{ monthly_limit, used_this_month, remaining, reset_date, plan }`. In `Sidebar.jsx`, fetch it once on mount (via `api.get('/email-finder/credits')`) and render a small balance row in the sidebar footer (above the user/logout block): e.g. `{remaining}/{monthly_limit} kredi` with a thin progress bar (reuse the CreditsBar visual style from EmailFinder.jsx — copy the minimal bar markup, don't import). Keep it compact and on-brand (cyan/existing palette). Hide if fetch fails.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/components/Sidebar.jsx && git commit -m "feat: show credit balance in sidebar"`

---

## Task 5: Landing pricing in credits + legend (B)

**Files:** modify `src/pages/Landing.jsx` (pricing section, id="pricing").

- [ ] Rewrite the 4 plan cards' feature list arrays to lead with credits and drop mixed units:
  - Starter: `['25 kredi/ay' / '25 credits/month', 'CRM Pipeline', '1 kullanıcı'/'1 user']`
  - Pro: `['250 kredi/ay', 'Email Finder', 'Rakip Analizi'/'Competitor Analysis', 'Sınırsız pipeline'/'Unlimited pipeline']`
  - Growth: `['600 kredi/ay', 'API erişimi'/'API access', 'Öncelikli destek'/'Priority support', 'Tüm Pro'/'All Pro']`
  - Team: `['600 kredi/kullanıcı/ay'/'600 credits/user/month', 'Ekip işbirliği'/'Team collaboration', 'Yönetici paneli'/'Admin panel', 'Rol bazlı erişim'/'Role-based access']`
  (Keep the exact `isEn?...:...` ternary style already used in these arrays.)
- [ ] Add a credit legend line right under the 4-card grid (before the pay-as-you-go card), centered small text: TR `1 reveal = 1 kredi · 1 AI email = 1 kredi · 1 SEO makale = 5 kredi · 1 lead = 1 kredi` / EN `1 reveal = 1 credit · 1 AI email = 1 credit · 1 SEO article = 5 credits · 1 lead = 1 credit`:
```jsx
          <p className="text-center text-xs text-[#9CA3AF] mb-8">{isEn ? '1 reveal = 1 credit · 1 AI email = 1 credit · 1 SEO article = 5 credits · 1 lead = 1 credit' : '1 reveal = 1 kredi · 1 AI email = 1 kredi · 1 SEO makale = 5 kredi · 1 lead = 1 kredi'}</p>
```
- [ ] Build → success.
- [ ] Commit: `git add actledger/src/pages/Landing.jsx && git commit -m "feat: landing plans expressed in credits + legend"`

---

## Task 6: Landing de-slop (C)

**Files:** modify `src/pages/Landing.jsx`. READ the mid-page CTA block (the blue gradient section with only the logo + "POWERED BY ATAOL AI TECHS") and the STATS array and hero.

- [ ] **Remove the mid-page blue gradient logo-only block.** Identify the `<section>` that renders a full-width blue gradient background containing only the AskDesk logo + "POWERED BY ATAOL AI TECHS" text (NOT the final "Startup'ını büyütmeye hazır mısınız?" CTA — keep that). Delete that section entirely. Verify the page still builds and other sections are intact.
- [ ] **STATS array**: replace the `{ value: '28', labelTr: 'Dil Desteği', labelEn: 'Languages Supported' }` entry (inconsistent — landing now shows 2 languages) with `{ value: 'Verified', labelTr: 'Doğrulanmış Email', labelEn: 'Verified Emails' }`. Keep the other 3 stats.
- [ ] **Hero headline**: keep structure/animation; tighten copy to be more specific. Change TR `Startup'lar İçin<br />Büyüme Platformu` → `Müşteri Bul,<br />AI ile Ulaş, Sat` ; EN `The Growth Platform<br />Built for Startups` → `Find Customers,<br />Reach Them with AI`. (Keep the `<h1>` classes/animation unchanged; only the text.)
- [ ] Build → success. Also quick sanity: `#pricing`, `#features`, `#how-it-works` sections still present.
- [ ] Commit: `git add actledger/src/pages/Landing.jsx && git commit -m "feat: landing de-slop - remove filler block, fix stats, tighten hero"`

---

## Deploy (after all tasks, with user)
1. Worker: `wrangler deploy` (credits lib + charges).
2. Frontend: `cd actledger && npm run build` then `wrangler pages deploy dist --project-name askdesk-app --branch main --commit-dirty=true`.
(No new D1 migration — user_credits already exists.)

## Self-review
- A1 (shared lib + balance UI) → T1, T4. A2 (charge every action) → T1, T2, T3. B → T5. C → T6. All covered.
- No migration needed. Landing deploy MUST use wrangler pages deploy --branch main (git push does not deploy frontend).
