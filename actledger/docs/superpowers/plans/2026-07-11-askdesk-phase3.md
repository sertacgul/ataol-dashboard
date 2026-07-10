# AskDesk Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 analytics/strategy modules to AskDesk: Analytics Dashboard (Recharts), Financial Simulator, Business Model Canvas, and Competitor Analysis. All AI branded as OperIQ.

**Architecture:** Analytics aggregates existing D1 tables via new API endpoints. Simulator runs entirely in frontend (localStorage). BMC and Competitors use new D1 tables. Recharts for all charts. Sidebar gets 4 new nav items.

**Tech Stack:** React 19, Recharts, Hono Workers, D1, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-07-11-askdesk-phase3-design.md`

---

## File Structure

### New Workers API Routes
```
workers/askdesk-api/src/routes/
├── analytics.js        # Aggregate queries on existing tables
├── bmc.js              # BMC CRUD (single JSON doc per user)
└── competitors.js      # Competitor CRUD + OperIQ analysis
```

### New Frontend Pages
```
src/pages/
├── analytics/
│   └── Analytics.jsx           # Charts + metrics dashboard
├── simulator/
│   └── Simulator.jsx           # Financial calculator (localStorage)
├── bmc/
│   └── Bmc.jsx                 # Interactive 9-section canvas
└── competitors/
    └── Competitors.jsx         # Competitor list + analysis
```

### Modified Files
```
workers/askdesk-api/src/db/migration-phase3.sql   # 2 new tables
workers/askdesk-api/src/db/schema.sql              # Append
workers/askdesk-api/src/index.js                   # Mount 3 new routes
src/App.jsx                                        # 4 new routes
src/components/Sidebar.jsx                         # 4 new nav items
```

---

## Task 1: D1 Migration + Recharts Install

**Files:**
- Create: `workers/askdesk-api/src/db/migration-phase3.sql`
- Modify: `workers/askdesk-api/src/db/schema.sql`

- [ ] **Step 1: Create migration file**

`workers/askdesk-api/src/db/migration-phase3.sql`:

```sql
CREATE TABLE IF NOT EXISTS bmc_items (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS competitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  website TEXT,
  analysis TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bmc_items_user ON bmc_items(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitors(user_id);
```

- [ ] **Step 2: Append to schema.sql**

- [ ] **Step 3: Apply to local and remote D1**

```bash
cd workers/askdesk-api
npx wrangler d1 execute askdesk-db --local --file=src/db/migration-phase3.sql
npx wrangler d1 execute askdesk-db --remote --file=src/db/migration-phase3.sql
```

- [ ] **Step 4: Install Recharts**

```bash
cd C:/Users/serta/actledger
npm install recharts
```

- [ ] **Step 5: Commit**

```bash
git add workers/askdesk-api/src/db/ package.json package-lock.json
git commit -m "feat: add Phase 3 D1 schema + install recharts"
```

---

## Task 2: Analytics API

**Files:**
- Create: `workers/askdesk-api/src/routes/analytics.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: Create analytics route**

`workers/askdesk-api/src/routes/analytics.js` with authMiddleware on all endpoints:

- `GET /overview?from=YYYY-MM-DD&to=YYYY-MM-DD` - counts from companies, emails (total, sent, opened), calculates rates
- `GET /email-trend?from=&to=` - daily email send counts grouped by date: `SELECT DATE(created_at) as date, COUNT(*) as count FROM emails WHERE user_id=? AND status='sent' AND created_at BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY date`
- `GET /social-stats` - platform post counts: `SELECT platform, COUNT(*) as count FROM social_posts WHERE user_id=? GROUP BY platform`
- `GET /pipeline-stats` - stage item counts: `SELECT ps.name, COUNT(pi.id) as count FROM pipeline_stages ps LEFT JOIN pipeline_items pi ON ps.id = pi.stage_id WHERE ps.user_id=? GROUP BY ps.id ORDER BY ps.position`
- `GET /content-trend?from=&to=` - monthly content counts for seo_articles, social_posts, newsletters grouped by month
- `GET /top-outreach?limit=10` - top emails by opened=1 sorted by created_at DESC, joined with company name

Superadmin sees all data (no user_id filter), regular users filtered.

Mount: `app.route('/analytics', analyticsRoutes)`

- [ ] **Step 2: Commit**

```bash
git add workers/askdesk-api/src/
git commit -m "feat: add analytics API with aggregate queries"
```

---

## Task 3: Analytics Dashboard UI

**Files:**
- Create: `src/pages/analytics/Analytics.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create Analytics page**

`src/pages/analytics/Analytics.jsx`:

- Time filter buttons at top: "Bu Hafta", "Bu Ay", "Son 3 Ay", "Son 1 Yıl" (calculates from/to dates)
- 5 StatCard components in a row (reuse existing component)
- 4 chart sections using Recharts:
  - Email Gönderim Trendi: `<LineChart>` with `<Line>` stroke="#2563EB"
  - Sosyal Medya Dağılımı: `<BarChart>` with platform colors (LinkedIn=#0077B5, Twitter=#1DA1F2, Instagram=#E4405F, Facebook=#1877F2)
  - Pipeline Dağılımı: `<PieChart>` with `<Pie>` using palette colors
  - İçerik Üretim Trendi: `<LineChart>` with multiple lines (seo=#2563EB, social=#059669, newsletter=#7C3AED)
- Top Outreach table at bottom (company name, subject, opened badge, date)

Charts wrapped in white card with border, chart title as text-sm font-semibold.

Recharts imports: `import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'`

All charts inside `<ResponsiveContainer width="100%" height={250}>`.

- [ ] **Step 2: Add route**

```jsx
import Analytics from './pages/analytics/Analytics'
<Route path="analytics" element={<Analytics />} />
```

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/
git commit -m "feat: add analytics dashboard with Recharts graphs"
```

---

## Task 4: Financial Simulator

**Files:**
- Create: `src/pages/simulator/Simulator.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create Simulator page**

`src/pages/simulator/Simulator.jsx`:

All state stored in localStorage key `askdesk_simulator`.

**Layout:** Two columns - left: inputs, right: results.

**Left column - Input cards:**

Card 1: "Gelir Sürücüleri"
- Proje sayısı (number input) + proje başına gelir (number input)
- SaaS üye sayısı + aylık üyelik ücreti
- Eğitim sınıfı sayısı + sınıf başına gelir
- Diğer gelir (tek number input)

Card 2: "Maliyet Sürücüleri"
- Altyapı maliyeti (aylık)
- API giderleri (aylık)
- Pazarlama bütçesi (aylık)
- Çalışan sayısı + ortalama maaş
- Hukuk/muhasebe (aylık)
- Diğer giderler (aylık)

**Right column - Results:**

Card 1: 3 big metric cards (yıllık gelir, yıllık gider, net kar)
- Net kar card green if positive, red if negative
- EBITDA marjı % below

Card 2: Başabaş analizi text

Card 3: Gelir vs Gider bar chart (Recharts BarChart, 2 bars side by side)

**Calculations (all frontend):**
```
yillikGelir = (proje * projeGelir) + (saasUye * aylikUcret * 12) + (egitimSinif * sinifGelir) + digerGelir
yillikGider = (altyapi + apiGider + pazarlama + hukuk + digerGider) * 12 + (calisanSayisi * ortMaas * 12)
netKar = yillikGelir - yillikGider
ebitdaMarji = yillikGelir > 0 ? (netKar / yillikGelir * 100) : 0
```

Load from localStorage on mount, save on every input change.

- [ ] **Step 2: Add route and commit**

```bash
npm run build
git add src/
git commit -m "feat: add financial simulator with live calculations"
```

---

## Task 5: BMC API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/bmc.js`
- Create: `src/pages/bmc/Bmc.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: BMC API route**

`workers/askdesk-api/src/routes/bmc.js` with authMiddleware:

- `GET /` - returns user's bmc_items row (data is JSON string), or null
- `POST /` - create BMC: `{ data: JSON.stringify(body.data) }`, reject 409 if exists
- `PUT /` - update BMC data + updated_at

Mount: `app.route('/bmc', bmcRoutes)`

- [ ] **Step 2: BMC UI page**

`src/pages/bmc/Bmc.jsx`:

Classic BMC grid layout using CSS grid:
```
| Partners  | Activities | Value Prop | Relations | Segments |
|           | Resources  |            | Channels  |          |
| Cost Structure          |            | Revenue Streams      |
```

Grid: `grid-template-areas` or manual grid with `grid-cols-5`.

Each section:
- Colored top border (each section different color from palette)
- Section title (Turkish name + English subtitle in muted text)
- List of items with delete button
- "Ekle" input + button at bottom
- Inline editing on click

"OperIQ ile Doldur" button at top: calls `/ai/generate` with profile context + prompt asking for BMC in JSON format:
```json
{
  "partners": ["..."],
  "activities": ["..."],
  "resources": ["..."],
  "value_propositions": ["..."],
  "relationships": ["..."],
  "channels": ["..."],
  "segments": ["..."],
  "cost_structure": ["..."],
  "revenue_streams": ["..."]
}
```

State: `data` object with 9 arrays. Fetch on mount (GET /bmc), auto-save on changes (PUT /bmc with debounce or on blur).

"Yazdır" button: window.print() with print CSS.

- [ ] **Step 3: Add routes and commit**

```bash
npm run build
git add workers/ src/
git commit -m "feat: add business model canvas with OperIQ auto-fill"
```

---

## Task 6: Competitor Analysis API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/competitors.js`
- Create: `src/pages/competitors/Competitors.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Competitors API route**

`workers/askdesk-api/src/routes/competitors.js` with authMiddleware:

- `GET /` - list competitors for user, ORDER BY created_at DESC
- `POST /` - create competitor (name, website), returns {id}
- `POST /:id/analyze` - reads competitor website + user's profile context, sends Gemini prompt to analyze. Prompt: analyze competitor website, return JSON with name, sector, description, strengths[], weaknesses[], opportunities[]. Save result to analysis column.
- `DELETE /:id` - delete competitor

Mount: `app.route('/competitors', competitorsRoutes)`

- [ ] **Step 2: Competitors UI page**

`src/pages/competitors/Competitors.jsx`:

Top: "Rakip Ekle" form (firma adı + website URL + "Ekle" button)

Main: List of competitors as cards. Each card:
- Competitor name + website link
- "OperIQ ile Analiz Et" button (if no analysis yet) or analysis results
- Analysis display: sektör, açıklama, güçlü yönler (green list), zayıf yönler (red list), fırsatlar (blue list)
- "Karşılaştır" toggle: shows side-by-side comparison table (your company profile vs competitor)
- Delete button

Comparison table columns: Özellik, Sizin Firma, Rakip. Rows: Sektör, Açıklama, Güçlü Yönler, Zayıf Yönler.

- [ ] **Step 3: Add routes and commit**

```bash
npm run build
git add workers/ src/
git commit -m "feat: add competitor analysis with OperIQ comparison"
```

---

## Task 7: Sidebar Update + Final Wiring

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx` (verify all routes)

- [ ] **Step 1: Add Phase 3 nav items to Sidebar**

Read current Sidebar.jsx. After `contentItems` array and its render block, add new `analyticsItems` array:

```js
const analyticsItems = [
  { to: '/app/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/app/simulator', label: 'Simülatör', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { to: '/app/bmc', label: 'BMC', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/app/competitors', label: 'Rakip Analizi', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
]
```

Add separator + render after contentItems.

- [ ] **Step 2: Verify App.jsx has all 4 routes**

All Phase 3 routes should be under /app:
```jsx
<Route path="analytics" element={<Analytics />} />
<Route path="simulator" element={<Simulator />} />
<Route path="bmc" element={<Bmc />} />
<Route path="competitors" element={<Competitors />} />
```

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/
git commit -m "feat: add Phase 3 sidebar items, verify all routes"
```

---

## Task 8: Production Deploy

- [ ] **Step 1: Deploy Workers**

```bash
cd workers/askdesk-api && npx wrangler deploy
```

- [ ] **Step 2: Build and deploy frontend**

```bash
cd C:/Users/serta/actledger
npm run build
npx wrangler pages deploy dist --project-name askdesk-app --commit-dirty=true --branch main
```

- [ ] **Step 3: Smoke test**

1. Login at askdesk.app
2. Sidebar: Analytics, Simülatör, BMC, Rakip Analizi visible
3. Analytics: charts render (may be empty if no data)
4. Simulator: inputs work, calculations update live
5. BMC: grid renders, OperIQ ile Doldur works
6. Competitors: add competitor, analyze works

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: Phase 3 production deploy"
```
