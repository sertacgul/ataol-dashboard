# Rakip Analizi + Aktivite Logu — Implementation Plan

> Execute via superpowers:subagent-driven-development.

**Goal:** Deep competitor analysis (Harvey Ball + terminology + own-vs-competitor + improvement areas), universal activity logging with a History page, email-finder search history.

**Branch:** new `feat/competitor-activity`. Git root `C:\Users\serta`, project `actledger/`. Only `git add` exact paths; never `-A`.

Ref spec: `docs/superpowers/specs/2026-07-13-competitor-analysis-activity-log-design.md`

---

## Task 1: Activity infra — migration + lib/activity.js + route + wiring

**Files:** Create `workers/askdesk-api/src/db/migration-activity-log.sql`, `workers/askdesk-api/src/lib/activity.js`, `workers/askdesk-api/src/routes/activity.js`; modify `workers/askdesk-api/src/index.js`.

- [ ] `migration-activity-log.sql`:
```sql
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at);
```
Apply local: `cd workers/askdesk-api && node node_modules/wrangler/bin/wrangler.js d1 execute askdesk-db --local --file=src/db/migration-activity-log.sql` (this table has no FK; should succeed locally).

- [ ] `lib/activity.js`:
```js
export async function logActivity(db, userId, { module, action, title, detail }) {
  try {
    const detailStr = detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail))
    await db.prepare(
      `INSERT INTO activity_log (id, user_id, module, action, title, detail) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, module, action, title || null, detailStr).run()
  } catch { /* logging must never break the main action */ }
}
```

- [ ] `routes/activity.js`:
```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const activity = new Hono()
activity.use('*', authMiddleware)

activity.get('/', async (c) => {
  const userId = c.get('userId')
  const module = c.req.query('module') || null
  const action = c.req.query('action') || null
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)
  const offset = (page - 1) * limit

  let where = 'WHERE user_id = ?'
  const params = [userId]
  if (module) { where += ' AND module = ?'; params.push(module) }
  if (action) { where += ' AND action = ?'; params.push(action) }

  const rows = await c.env.DB.prepare(
    `SELECT id, module, action, title, created_at FROM activity_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM activity_log ${where}`
  ).bind(...params).all()

  return c.json({ items: rows.results || [], total: countRow.results?.[0]?.total || 0, page, limit })
})

activity.get('/:id', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare('SELECT * FROM activity_log WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId).first()
  if (!row) return c.json({ error: 'Kayıt bulunamadı' }, 404)
  let detail = row.detail
  try { detail = row.detail ? JSON.parse(row.detail) : null } catch { /* keep string */ }
  return c.json({ ...row, detail })
})

export default activity
```

- [ ] `index.js`: add `import activityRoutes from './routes/activity.js'` (with the other route imports) and `app.route('/activity', activityRoutes)` (with the other `app.route` calls).

- [ ] Verify: `cd workers/askdesk-api && node --check src/lib/activity.js && node --check src/routes/activity.js && node --check src/index.js`.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/db/migration-activity-log.sql actledger/workers/askdesk-api/src/lib/activity.js actledger/workers/askdesk-api/src/routes/activity.js actledger/workers/askdesk-api/src/index.js && git commit -m "feat: activity log infra (table, helper, route)"`

---

## Task 2: Log email-finder actions

**Files:** modify `workers/askdesk-api/src/routes/email-finder.js`.
- [ ] Add `import { logActivity } from '../lib/activity.js'`.
- [ ] `/search`: after building the response (before `return c.json(...)`), log: `await logActivity(c.env.DB, userId, { module: 'email-finder', action: 'search', title: companyInfo.name || domain, detail: { domain, company: companyInfo, people_count: maskedPeople.length, people: maskedPeople.map(p => ({ name: p.masked_name, title: p.title, email: p.masked_email })) } })`. (Use the already-computed vars.)
- [ ] `/reveal`: on the success return (fresh reveal), log `{ module: 'email-finder', action: 'reveal', title: `${person.name} @ ${domain}`, detail: { email, person_name: person.name, title: person.title, domain } }`.
- [ ] `/compose` and `/auto-outreach`: on success, log `{ module: 'outreach', action: 'compose', title: <recipient/company>, detail: { subject, ... } }` (use available vars).
- [ ] Verify `node --check`.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/email-finder.js && git commit -m "feat: log email-finder search/reveal/compose activity"`

---

## Task 3: Log ai/seo/maps/profile actions

**Files:** modify `workers/askdesk-api/src/routes/{ai,seo,maps,profile}.js`. Add `import { logActivity } from '../lib/activity.js'` to each. On each endpoint's SUCCESS path (right after the existing `deductCredit`, before the success `c.json`), add a `logActivity` call:
- `ai.js /generate` → `{ module:'ai', action:'generate', title: (prompt/topic snippet, first 60 chars), detail: { result: text.slice(0,500) } }`
- `ai.js /research` → `{ module:'ai', action:'research', title: (query), detail: { ... } }`
- `seo.js /:id/translate` → `{ module:'seo', action:'translate', title: (article title or id), detail:{} }`
- `seo.js /:id/check` → `{ module:'seo', action:'check', title:(article title or id), detail:{ score } }`
- `maps.js /search` → `{ module:'maps', action:'search', title:(query), detail:{ count } }`
- `profile.js /analyze` → `{ module:'profile', action:'analyze', title:(website), detail:{} }`
Use `c.get('userId')` (already available). Keep titles short.
- [ ] Verify `node --check` on all four.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/ai.js actledger/workers/askdesk-api/src/routes/seo.js actledger/workers/askdesk-api/src/routes/maps.js actledger/workers/askdesk-api/src/routes/profile.js && git commit -m "feat: log ai/seo/maps/profile activity"`

---

## Task 4: Competitor analyze — rich JSON + log

**Files:** modify `workers/askdesk-api/src/routes/competitors.js`.
- [ ] Add `import { logActivity } from '../lib/activity.js'`.
- [ ] Replace the `prompt` in `/:id/analyze` with:
```js
  const prompt = `${profileContext ? `KENDI FIRMAM:\n${profileContext}\n\n` : ''}Rakip firma "${competitor.name || ''}"${competitor.website ? ` (${competitor.website})` : ''} için detaylı rekabet analizi yap. Kendi firmam ile karşılaştır.

Aşağıdaki JSON formatında yanıt ver. Puanlar 0-4 arası tam sayı (0=çok zayıf, 4=mükemmel). Kendi firmam ("own") için ${profileContext ? 'firma bağlamıma göre puanla' : 'bilgi yoksa makul tahmin yap'}.

{
  "name": "Rakip firma adı",
  "sector": "Sektör",
  "description": "3-4 cümlelik detaylı açıklama",
  "target_market": "Hedef pazar",
  "strengths": ["Güçlü yön 1", "Güçlü yön 2", "Güçlü yön 3"],
  "weaknesses": ["Zayıf yön 1", "Zayıf yön 2"],
  "opportunities": ["Fırsat 1", "Fırsat 2"],
  "scores": {
    "competitor": { "product_quality": 0-4, "price_competitiveness": 0-4, "market_reach": 0-4, "brand_awareness": 0-4, "innovation": 0-4, "customer_experience": 0-4 },
    "own": { "product_quality": 0-4, "price_competitiveness": 0-4, "market_reach": 0-4, "brand_awareness": 0-4, "innovation": 0-4, "customer_experience": 0-4 }
  },
  "competitor_position": "Pazar Lideri | Meydan Okuyan | Takipçi | Niş Oyuncu",
  "own_position": "Pazar Lideri | Meydan Okuyan | Takipçi | Niş Oyuncu",
  "position_summary": "Kendi firmamın rakibe göre pazar konumu, 2-3 cümle",
  "improvement_areas": ["Aksiyon alınabilir gelişim alanı 1", "gelişim alanı 2", "gelişim alanı 3"]
}

Sadece JSON döndür, başka açıklama ekleme.`
```
- [ ] After the `UPDATE competitors SET analysis = ?` succeeds, add before the success return: `await logActivity(c.env.DB, userId, { module: 'competitors', action: 'analyze', title: competitor.name || 'Rakip', detail: analysis || analysisStr })`.
- [ ] Verify `node --check src/routes/competitors.js`.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/competitors.js && git commit -m "feat: rich competitor analysis (scores/position/comparison) + log"`

---

## Task 5: HarveyBall component + Competitors.jsx frontend

**Files:** Create `src/components/HarveyBall.jsx`; modify `src/pages/competitors/Competitors.jsx` (READ it first for how analysis is currently rendered).
- [ ] `HarveyBall.jsx` (value 0-4 → fill quarters):
```jsx
export default function HarveyBall({ value = 0, size = 20 }) {
  const v = Math.max(0, Math.min(4, Math.round(value)))
  const r = size / 2
  const pct = v / 4
  // full circle outline; filled wedge from top, clockwise
  const angle = pct * 360
  const large = angle > 180 ? 1 : 0
  const rad = (angle - 90) * Math.PI / 180
  const x = r + r * Math.cos(rad)
  const y = r + r * Math.sin(rad)
  const fill = v === 0 ? null : v === 4
    ? <circle cx={r} cy={r} r={r} fill="#2563EB" />
    : <path d={`M${r},${r} L${r},0 A${r},${r} 0 ${large} 1 ${x},${y} Z`} fill="#2563EB" />
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="inline-block align-middle">
      <circle cx={r} cy={r} r={r - 0.5} fill="white" stroke="#2563EB" strokeWidth="1" />
      {fill}
    </svg>
  )
}
```
- [ ] In `Competitors.jsx`, when an analysis object has `scores`, render a comparison table: 6 rows (dimensions with TR labels: Ürün/Hizmet Kalitesi=product_quality, Fiyat Rekabetçiliği=price_competitiveness, Pazar Erişimi=market_reach, Marka Bilinirliği=brand_awareness, İnovasyon=innovation, Müşteri Deneyimi=customer_experience), columns: [Boyut | Rakip `<HarveyBall value={scores.competitor[k]} />` | Sen `<HarveyBall value={scores.own?.[k]} />`]. Above/below it: two terminology badges (`competitor_position`, `own_position`) with distinct colors; the `position_summary` paragraph; and an "Geliştirmen gereken alanlar" bulleted list from `improvement_areas`. Keep existing strengths/weaknesses/opportunities rendering. Gracefully handle old analyses without `scores` (fall back to existing display). Match existing card/style patterns.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/components/HarveyBall.jsx actledger/src/pages/competitors/Competitors.jsx && git commit -m "feat: Harvey Ball competitor comparison + terminology + improvement areas"`

---

## Task 6: History (Geçmiş) page + route + sidebar nav

**Files:** Create `src/pages/history/History.jsx`; modify `src/App.jsx` (route), `src/components/Sidebar.jsx` (nav item). READ App.jsx routing + Sidebar nav arrays first.
- [ ] `History.jsx`: fetch `api.get('/activity?page=..&module=..')`, list items (module badge, title, localized date). A module filter dropdown (all + email-finder/outreach/ai/seo/maps/competitors/profile). Click an item → `api.get('/activity/:id')` → detail panel/modal showing the `detail` (render objects readably: for arrays/objects show key sections; simplest: a titled section per key with values). Pagination (prev/next). Use existing app page styling (cards, `text-[#...]` palette). Loading/empty states.
- [ ] `App.jsx`: add a protected route `path="/app/history"` → `<History />` inside the existing app layout routes (match how other pages like /app/settings are registered; import History).
- [ ] `Sidebar.jsx`: add a nav item to the `secondaryItems` array (or the most fitting group): `{ to: '/app/history', label: 'Geçmiş', icon: '<clock svg path>' }`. Use a clock icon path e.g. `M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z`.
- [ ] Build → success.
- [ ] Commit: `git add actledger/src/pages/history/History.jsx actledger/src/App.jsx actledger/src/components/Sidebar.jsx && git commit -m "feat: activity history page + nav"`

---

## Task 7: Email finder search history panel

**Files:** modify `src/pages/email-finder/EmailFinder.jsx` (READ it first).
- [ ] Add an "Arama Geçmişi" control near the search bar (a button that toggles a dropdown/panel). On open, fetch `api.get('/activity?module=email-finder&action=search&limit=20')` → list of past searched companies (title = company/domain, date). Clicking an item sets the search `query` to that domain and triggers `handleSearch` (re-runs; hits cache instantly). Compact, on-brand.
- [ ] Build → success.
- [ ] Commit: `git add actledger/src/pages/email-finder/EmailFinder.jsx && git commit -m "feat: email finder search history quick access"`

---

## Deploy (after all tasks, with user)
1. Remote D1: `wrangler d1 execute askdesk-db --remote --file=src/db/migration-activity-log.sql` (echo y | ...).
2. Worker: `wrangler deploy`.
3. Frontend: `cd actledger && npm run build` then `wrangler pages deploy dist --project-name askdesk-app --branch main --commit-dirty=true`.

## Self-review
- A → T4 (backend), T5 (frontend). B → T1 (infra), T2/T3/T4 (wiring), T6 (page). C → T2 (search log), T7 (panel). Maps key already set.
- Frontend deploy MUST use wrangler pages deploy --branch main (git push does NOT deploy).
