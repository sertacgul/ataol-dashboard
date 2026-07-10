# AskDesk Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 content modules to AskDesk: Company Profile (onboarding), SEO Content, Social Media, Newsletter, Template Library, and Content Calendar. All AI features branded as "OperIQ AI".

**Architecture:** New D1 tables + Workers API routes for each module. Frontend pages follow existing patterns (list/new/detail). Company profile is fetched once and injected into all AI prompts. Onboarding gate prevents access until profile is completed. Phase 1 outreach "AI ile Oluştur" renamed to "OperIQ ile Oluştur".

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Hono (Workers), D1, html2canvas (poster)

**Spec:** `docs/superpowers/specs/2026-07-11-askdesk-phase2-design.md`

---

## File Structure

### New Workers API Routes

```
workers/askdesk-api/src/routes/
├── profile.js          # Company profile CRUD + AI analyze
├── seo.js              # SEO articles CRUD + translate + check
├── social.js           # Social media posts CRUD
├── newsletter.js       # Newsletter CRUD
├── templates.js        # Template library CRUD
└── calendar.js         # Content calendar CRUD
```

### New Frontend Pages

```
src/pages/
├── Onboarding.jsx              # Post-register company profile wizard
├── seo/
│   ├── SeoList.jsx             # Article list with status filter
│   ├── SeoNew.jsx              # 6-step wizard
│   └── SeoDetail.jsx           # Article view/edit
├── social/
│   ├── SocialList.jsx          # Post list with platform filter
│   └── SocialNew.jsx           # Create post (platform select + AI)
├── newsletter/
│   ├── NewsletterList.jsx      # Newsletter list
│   ├── NewsletterNew.jsx       # Create with AI + poster
│   └── NewsletterDetail.jsx    # View/export (poster PNG + PDF)
├── templates/
│   ├── TemplateList.jsx        # Template list with category filter
│   └── TemplateNew.jsx         # Create/edit template
└── calendar/
    └── Calendar.jsx            # Monthly grid calendar view
```

### Modified Files

```
workers/askdesk-api/src/index.js          # Mount 6 new routes
workers/askdesk-api/src/db/schema.sql     # Add 6 new tables
src/App.jsx                               # Add all new routes + onboarding
src/components/Sidebar.jsx                # Add Phase 2 nav items
src/components/ProtectedRoute.jsx         # Add onboarding gate
src/contexts/AuthContext.jsx              # Add profile state
src/pages/Settings.jsx                    # Add profile edit section
src/pages/outreach/OutreachNew.jsx        # Rename "AI ile Oluştur" → "OperIQ ile Oluştur"
```

---

## Task 1: D1 Şema Migration — 6 Yeni Tablo

**Files:**
- Create: `workers/askdesk-api/src/db/migration-phase2.sql`
- Modify: `workers/askdesk-api/src/db/schema.sql` (append new tables)

- [ ] **Step 1: Migration SQL dosyasını oluştur**

`workers/askdesk-api/src/db/migration-phase2.sql`:

```sql
CREATE TABLE IF NOT EXISTS company_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  company_name TEXT,
  website TEXT,
  sector TEXT,
  description TEXT,
  value_proposition TEXT,
  target_audience TEXT,
  products_services TEXT,
  competitors TEXT,
  usps TEXT,
  tone TEXT DEFAULT 'formal',
  sample_content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS seo_articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  topic TEXT,
  body_tr TEXT,
  body_en TEXT,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT,
  keyword_density REAL,
  seo_score REAL,
  step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  content TEXT,
  hashtags TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS newsletters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  body TEXT,
  poster_html TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_platforms TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  platform TEXT,
  name TEXT NOT NULL,
  content TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS calendar_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_articles_user ON seo_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_newsletters_user ON newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_calendar_items_user ON calendar_items(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_items_date ON calendar_items(user_id, scheduled_date);
```

- [ ] **Step 2: schema.sql'e de ekle** (append same content at end of file)

- [ ] **Step 3: Migration'ı local D1'e uygula**

```bash
cd workers/askdesk-api
npx wrangler d1 execute askdesk-db --local --file=src/db/migration-phase2.sql
```

- [ ] **Step 4: Migration'ı remote D1'e uygula**

```bash
npx wrangler d1 execute askdesk-db --remote --file=src/db/migration-phase2.sql
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/serta/actledger
git add workers/askdesk-api/src/db/
git commit -m "feat: add Phase 2 D1 schema — 6 new tables for content modules"
```

---

## Task 2: Company Profile API + Onboarding

**Files:**
- Create: `workers/askdesk-api/src/routes/profile.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: Profile route oluştur**

`workers/askdesk-api/src/routes/profile.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const profile = new Hono()
profile.use('*', authMiddleware)

// Get current user's company profile
profile.get('/', async (c) => {
  const userId = c.get('userId')
  const row = await c.env.DB.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()
  return c.json({ profile: row || null })
})

// Create profile (onboarding)
profile.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  const existing = await c.env.DB.prepare('SELECT id FROM company_profiles WHERE user_id = ?').bind(userId).first()
  if (existing) return c.json({ error: 'Profil zaten mevcut. Güncellemek için PUT kullanın.' }, 409)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO company_profiles (id, user_id, company_name, website, sector, description, value_proposition, target_audience, products_services, competitors, usps, tone, sample_content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, userId,
    body.company_name || null, body.website || null, body.sector || null,
    body.description || null, body.value_proposition || null, body.target_audience || null,
    body.products_services ? JSON.stringify(body.products_services) : null,
    body.competitors ? JSON.stringify(body.competitors) : null,
    body.usps ? JSON.stringify(body.usps) : null,
    body.tone || 'formal', body.sample_content || null
  ).run()

  return c.json({ id }, 201)
})

// Update profile
profile.put('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()

  await c.env.DB.prepare(
    `UPDATE company_profiles SET
      company_name = ?, website = ?, sector = ?, description = ?,
      value_proposition = ?, target_audience = ?,
      products_services = ?, competitors = ?, usps = ?,
      tone = ?, sample_content = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(
    body.company_name || null, body.website || null, body.sector || null,
    body.description || null, body.value_proposition || null, body.target_audience || null,
    body.products_services ? JSON.stringify(body.products_services) : null,
    body.competitors ? JSON.stringify(body.competitors) : null,
    body.usps ? JSON.stringify(body.usps) : null,
    body.tone || 'formal', body.sample_content || null, userId
  ).run()

  return c.json({ ok: true })
})

// AI analyze website → generate profile draft
profile.post('/analyze', async (c) => {
  const { website } = await c.req.json()
  if (!website) return c.json({ error: 'Website URL gerekli' }, 400)

  const prompt = `Şu web sitesini analiz et: ${website}

Aşağıdaki bilgileri çıkar ve JSON formatında döndür:
{
  "company_name": "firma adı",
  "sector": "sektör",
  "description": "firma ne iş yapıyor (2-3 cümle)",
  "value_proposition": "müşteriye sunulan temel değer",
  "target_audience": "hedef kitle tanımı",
  "products_services": ["ürün/hizmet 1", "ürün/hizmet 2"],
  "competitors": ["rakip 1", "rakip 2"],
  "usps": ["benzersiz özellik 1", "benzersiz özellik 2"],
  "tone": "formal|friendly|technical|casual"
}

Eğer bilgi bulamazsan ilgili alanı boş bırak. Sadece JSON döndür, başka açıklama ekleme.`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  if (!res.ok) return c.json({ error: 'OperIQ şu anda yanıt veremiyor' }, 502)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return c.json({ result: text })
})

export default profile
```

- [ ] **Step 2: index.js'e mount et**

`workers/askdesk-api/src/index.js`'e ekle:

```js
import profileRoutes from './routes/profile.js'

// After existing routes
app.route('/profile', profileRoutes)
```

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/
git commit -m "feat: add company profile API with AI website analysis"
```

---

## Task 3: Onboarding UI + Auth Context Güncelleme

**Files:**
- Create: `src/pages/Onboarding.jsx`
- Modify: `src/contexts/AuthContext.jsx`
- Modify: `src/components/ProtectedRoute.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: AuthContext'e profile state ekle**

`src/contexts/AuthContext.jsx`'i güncelle — `useEffect` içinde `/auth/me` yanından `/profile` da çek. State'e `profile` ve `setProfile` ekle. `hasProfile` boolean'ı türet.

```jsx
// Existing state'lere ekle:
const [profile, setProfile] = useState(null)

// useEffect'te /auth/me'den sonra:
api.get('/profile').then((data) => setProfile(data.profile)).catch(() => {})

// Provider value'ya ekle:
{ user, profile, hasProfile: !!profile, loading, login, register, logout, setProfile }
```

- [ ] **Step 2: ProtectedRoute'a onboarding gate ekle**

`src/components/ProtectedRoute.jsx`'i güncelle — eğer user var ama profile yoksa `/app/onboarding`'e yönlendir:

```jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, hasProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!hasProfile && location.pathname !== '/app/onboarding') return <Navigate to="/app/onboarding" replace />

  return children
}
```

- [ ] **Step 3: Onboarding sayfasını oluştur**

`src/pages/Onboarding.jsx` — firma profili wizard:

İki bölüm:
1. **Akıllı Başlangıç:** Website URL girişi + "OperIQ ile Analiz Et" butonu → API'den profil taslağı gelir → form otomatik dolar
2. **Manuel Form:** company_name, website, sector, description, value_proposition, target_audience, products_services (virgülle ayrılmış → array), competitors (virgülle), usps (virgülle), tone (select: formal/friendly/technical/casual), sample_content (textarea)

"Profili Kaydet" butonu → `api.post('/profile', form)` → `setProfile(form)` → navigate('/app/dashboard')

Eğer profil zaten varsa (superadmin) → dashboard'a redirect

Tüm AI butonlarında "OperIQ" branding kullan.

- [ ] **Step 4: App.jsx'e onboarding route ekle**

```jsx
import Onboarding from './pages/Onboarding'

// /app altına:
<Route path="onboarding" element={<Onboarding />} />
```

- [ ] **Step 5: Test et ve commit**

```bash
npm run build
git add src/
git commit -m "feat: add onboarding page with OperIQ AI website analysis"
```

---

## Task 4: Sidebar Güncellemesi + OperIQ Branding

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/pages/outreach/OutreachNew.jsx`

- [ ] **Step 1: Sidebar'a Phase 2 nav itemları ekle**

`src/components/Sidebar.jsx`'te `secondaryItems` array'inden sonra yeni bir `contentItems` array ekle:

```js
const contentItems = [
  { to: '/app/seo', label: 'SEO İçerik', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/app/social', label: 'Sosyal Medya', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { to: '/app/newsletter', label: 'Newsletter', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
  { to: '/app/templates', label: 'Şablonlar', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/app/calendar', label: 'Takvim', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
]
```

Nav render'da `secondaryItems` sonrasına yeni separator + contentItems ekle:

```jsx
{secondaryItems.map((item) => <NavItem key={item.to} {...item} />)}
<div className="my-3 border-t border-[#E5E7EB]" />
{contentItems.map((item) => <NavItem key={item.to} {...item} />)}
```

- [ ] **Step 2: OutreachNew.jsx'te OperIQ branding uygula**

`src/pages/outreach/OutreachNew.jsx`'te:
- "AI ile Oluştur" → "OperIQ ile Oluştur"
- "Oluşturuluyor..." → "OperIQ oluşturuyor..."

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: add Phase 2 sidebar items, apply OperIQ branding"
```

---

## Task 5: SEO İçerik API

**Files:**
- Create: `workers/askdesk-api/src/routes/seo.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: SEO route oluştur**

`workers/askdesk-api/src/routes/seo.js`:

CRUD endpoints (GET list with status filter, POST create, GET /:id, PUT /:id, DELETE /:id) plus:
- `POST /seo/:id/translate` — reads body_tr, sends to Gemini for EN translation, saves body_en
- `POST /seo/:id/check` — reads body_tr + keywords, sends to Gemini for SEO score + suggestions

All endpoints use authMiddleware and user_id scoping. The translate and check endpoints fetch the user's company_profiles to inject as context.

Helper function to get profile context:
```js
async function getProfileContext(db, userId) {
  const p = await db.prepare('SELECT * FROM company_profiles WHERE user_id = ?').bind(userId).first()
  if (!p) return ''
  return `Firma: ${p.company_name || ''}\nSektör: ${p.sector || ''}\nAçıklama: ${p.description || ''}\nDeğer Önerisi: ${p.value_proposition || ''}\nHedef Kitle: ${p.target_audience || ''}\nTon: ${p.tone || 'formal'}`
}
```

- [ ] **Step 2: Mount in index.js**

```js
import seoRoutes from './routes/seo.js'
app.route('/seo', seoRoutes)
```

- [ ] **Step 3: Commit**

```bash
git add workers/askdesk-api/src/
git commit -m "feat: add SEO articles API with translate and check endpoints"
```

---

## Task 6: SEO İçerik UI — 6 Aşamalı Wizard

**Files:**
- Create: `src/pages/seo/SeoList.jsx`
- Create: `src/pages/seo/SeoNew.jsx`
- Create: `src/pages/seo/SeoDetail.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: SeoList oluştur**

Article list page — fetches from `/seo`, shows title/topic/step/status/date. Filter buttons: Tümü, Taslak, Devam Ediyor, Tamamlandı. "+ Yeni Makale" button.

- [ ] **Step 2: SeoNew oluştur — 6 aşamalı wizard**

Step indicator at top (1-6, active step highlighted).

**Step 1 - Trend Araştırması:** Sektör/konu input + "OperIQ ile Araştır" button → calls `/ai/generate` with trend research prompt + profile context → shows 3-5 topic suggestions as clickable cards

**Step 2 - Konu Seçimi:** Select from suggestions or enter custom topic. Save topic to article via `PUT /seo/:id`.

**Step 3 - TR İçerik:** "OperIQ ile İçerik Oluştur" button → calls `/ai/generate` with article writing prompt + profile context → fills body_tr textarea. Manual editing available. Auto-calculates keyword density if keywords entered.

**Step 4 - EN Çeviri:** "OperIQ ile Çevir" button → calls `POST /seo/:id/translate` → fills body_en textarea. Manual editing available.

**Step 5 - SEO Kontrol:** "OperIQ Analiz Et" button → calls `POST /seo/:id/check` → shows AEO checklist (H2 questions, FAQ, numbers, direct answers) with pass/fail indicators. SEO score display.

**Step 6 - Yayın:** Copy buttons (TR markdown, EN markdown, HTML). Download buttons. Mark as completed.

Navigation: "Önceki" / "Sonraki" buttons. Each step saves progress via PUT.

- [ ] **Step 3: SeoDetail oluştur**

Read-only view of completed article. Shows both TR/EN versions, SEO score, metadata. "Düzenle" button goes to SeoNew at current step.

- [ ] **Step 4: App.jsx route'larını ekle**

```jsx
import SeoList from './pages/seo/SeoList'
import SeoNew from './pages/seo/SeoNew'
import SeoDetail from './pages/seo/SeoDetail'

<Route path="seo" element={<SeoList />} />
<Route path="seo/new" element={<SeoNew />} />
<Route path="seo/:id" element={<SeoDetail />} />
```

- [ ] **Step 5: Build ve commit**

```bash
npm run build
git add src/
git commit -m "feat: add SEO content 6-step wizard with OperIQ AI"
```

---

## Task 7: Sosyal Medya API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/social.js`
- Create: `src/pages/social/SocialList.jsx`
- Create: `src/pages/social/SocialNew.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Social API route**

`workers/askdesk-api/src/routes/social.js` — CRUD with platform/status filter. All endpoints use authMiddleware + user_id scoping. Mount as `app.route('/social', socialRoutes)`.

- [ ] **Step 2: SocialList oluştur**

Post list — platform filter tabs (Tümü, LinkedIn, Twitter, Instagram, Facebook). Each row: platform icon/badge, content preview (truncated), status badge, date. "+ Yeni Post" button.

- [ ] **Step 3: SocialNew oluştur**

1. Platform selector (4 buttons: LinkedIn, Twitter/X, Instagram, Facebook — each with icon and character limit info)
2. AI generation: "OperIQ ile Oluştur" button → sends prompt with platform-specific instructions + profile context:
   - LinkedIn: profesyonel, uzun (1300 karakter max), değer odaklı
   - Twitter: kısa, punch (280 karakter), trend hashtag
   - Instagram: görsel anlatım, hashtag ağırlıklı (2200 karakter)
   - Facebook: samimi, paylaşılabilir, soru soran
3. Content textarea with live character count + limit warning
4. Hashtag input (comma separated) + "OperIQ Hashtag Öner" button
5. Save buttons: "Kaydet" (draft) + "Takvime Ekle" (creates calendar_item too)

- [ ] **Step 4: App.jsx route'larını ekle**

```jsx
import SocialList from './pages/social/SocialList'
import SocialNew from './pages/social/SocialNew'

<Route path="social" element={<SocialList />} />
<Route path="social/new" element={<SocialNew />} />
```

- [ ] **Step 5: Deploy workers + build + commit**

```bash
git add workers/ src/
git commit -m "feat: add social media module — 4 platform support with OperIQ AI"
```

---

## Task 8: Newsletter API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/newsletter.js`
- Create: `src/pages/newsletter/NewsletterList.jsx`
- Create: `src/pages/newsletter/NewsletterNew.jsx`
- Create: `src/pages/newsletter/NewsletterDetail.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Newsletter API route**

CRUD endpoints. Mount as `app.route('/newsletter', newsletterRoutes)`.

- [ ] **Step 2: NewsletterList oluştur**

Newsletter list — title, status badge, date. "+ Yeni Bülten" button.

- [ ] **Step 3: NewsletterNew oluştur**

1. Title input
2. "OperIQ ile İçerik Oluştur" button → AI generates newsletter body with profile context
3. Body textarea (rich editing with manual control)
4. Poster section: poster_html textarea (or auto-generated HTML template with title + key points) + "Poster Önizle" button (renders html2canvas preview)
5. Save buttons: "Taslak Kaydet" / "Tamamla"

- [ ] **Step 4: NewsletterDetail oluştur**

View newsletter — formatted body, poster preview. Action buttons:
- "Poster İndir (PNG)" — html2canvas → canvas.toDataURL → download
- "PDF İndir" — window.print() with print-specific CSS
- "Şablon Olarak Kaydet" — calls POST /templates

Published platforms checklist (LinkedIn, blog, email — toggle/log).

Install html2canvas: `npm install html2canvas`

- [ ] **Step 5: App.jsx route'larını ekle**

```jsx
import NewsletterList from './pages/newsletter/NewsletterList'
import NewsletterNew from './pages/newsletter/NewsletterNew'
import NewsletterDetail from './pages/newsletter/NewsletterDetail'

<Route path="newsletter" element={<NewsletterList />} />
<Route path="newsletter/new" element={<NewsletterNew />} />
<Route path="newsletter/:id" element={<NewsletterDetail />} />
```

- [ ] **Step 6: Build ve commit**

```bash
npm run build
git add workers/ src/ package.json package-lock.json
git commit -m "feat: add newsletter module with poster generation and PDF export"
```

---

## Task 9: Template Library API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/templates.js`
- Create: `src/pages/templates/TemplateList.jsx`
- Create: `src/pages/templates/TemplateNew.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Templates API route**

CRUD with category/platform filter. Mount as `app.route('/templates', templatesRoutes)`.

- [ ] **Step 2: TemplateList oluştur**

Template list — category filter tabs (Tümü, Email, Sosyal Medya, SEO, Newsletter). Each row: name, category badge, platform (if social), tags, date. "+ Yeni Şablon" button. Search input.

- [ ] **Step 3: TemplateNew oluştur**

Form:
- Name input
- Category select (email, social, seo, newsletter)
- Platform select (only visible if category=social: linkedin/twitter/instagram/facebook)
- Content textarea
- Tags input (comma separated)
- Save button

- [ ] **Step 4: App.jsx route'larını ekle**

```jsx
import TemplateList from './pages/templates/TemplateList'
import TemplateNew from './pages/templates/TemplateNew'

<Route path="templates" element={<TemplateList />} />
<Route path="templates/new" element={<TemplateNew />} />
```

- [ ] **Step 5: Commit**

```bash
git add workers/ src/
git commit -m "feat: add template library — save and reuse content templates"
```

---

## Task 10: Content Calendar API + UI

**Files:**
- Create: `workers/askdesk-api/src/routes/calendar.js`
- Create: `src/pages/calendar/Calendar.jsx`
- Modify: `workers/askdesk-api/src/index.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Calendar API route**

`workers/askdesk-api/src/routes/calendar.js`:
- `GET /?month=YYYY-MM` — returns all calendar_items for that month (user scoped)
- `POST /` — create item (title, type, reference_id, scheduled_date, notes)
- `PUT /:id` — update item (title, scheduled_date, status, notes)
- `DELETE /:id` — delete item

Mount as `app.route('/calendar', calendarRoutes)`.

- [ ] **Step 2: Calendar.jsx — Aylık grid takvim**

Monthly calendar view:
- Header: "< Haziran 2026 >" with prev/next month buttons
- 7-column grid (Pzt, Sal, Çar, Per, Cum, Cmt, Paz)
- Day cells with date number + content items as colored pills:
  - SEO: mavi (#2563EB)
  - Sosyal Medya: yeşil (#059669)
  - Newsletter: mor (#7C3AED)
  - Outreach: turuncu (#D97706)
- Click on day → modal to add new item (title, type select, notes)
- Drag & drop items between days → `PUT /calendar/:id` with new scheduled_date
- Click on item → edit modal (title, status, notes, delete)

Right sidebar: "Yaklaşan 7 Gün" — upcoming items list sorted by date.

Turkish month names: Ocak, Şubat, Mart, Nisan, Mayıs, Haziran, Temmuz, Ağustos, Eylül, Ekim, Kasım, Aralık

- [ ] **Step 3: App.jsx route'u ekle**

```jsx
import Calendar from './pages/calendar/Calendar'

<Route path="calendar" element={<Calendar />} />
```

- [ ] **Step 4: Build ve commit**

```bash
npm run build
git add workers/ src/
git commit -m "feat: add content calendar with monthly grid and drag-drop"
```

---

## Task 11: Settings'e Profil Düzenleme + Final Wiring

**Files:**
- Modify: `src/pages/Settings.jsx`
- Modify: `workers/askdesk-api/src/index.js` (verify all routes mounted)

- [ ] **Step 1: Settings'e profil düzenleme ekle**

`src/pages/Settings.jsx`'i güncelle — mevcut hesap bilgileri kartının altına "Firma Profili" kartı ekle:
- Profil bilgilerini göster (company_name, sector, description, value_proposition, vb.)
- "Düzenle" butonu → alanlar editable olur
- "Kaydet" → `api.put('/profile', form)`
- Profile yoksa "Profil Oluştur" linki → `/app/onboarding`

- [ ] **Step 2: Tüm Workers route'larının mount edildiğini doğrula**

`workers/askdesk-api/src/index.js` final hali tüm route'ları içermeli:
```js
app.route('/auth', authRoutes)
app.route('/dashboard', dashboardRoutes)
app.route('/leads', leadsRoutes)
app.route('/outreach', outreachRoutes)
app.route('/ai', aiRoutes)
app.route('/pipeline', pipelineRoutes)
app.route('/maps', mapsRoutes)
app.route('/profile', profileRoutes)
app.route('/seo', seoRoutes)
app.route('/social', socialRoutes)
app.route('/newsletter', newsletterRoutes)
app.route('/templates', templatesRoutes)
app.route('/calendar', calendarRoutes)
```

- [ ] **Step 3: Commit**

```bash
git add src/ workers/
git commit -m "feat: add profile editing in settings, verify all route mounts"
```

---

## Task 12: Production Deploy

- [ ] **Step 1: Workers deploy**

```bash
cd workers/askdesk-api
npx wrangler deploy
```

- [ ] **Step 2: Frontend build + Pages deploy**

```bash
cd C:/Users/serta/actledger
npm run build
npx wrangler pages deploy dist --project-name askdesk-app --commit-dirty=true --branch main
```

- [ ] **Step 3: Smoke test**

1. https://askdesk.app/login → giriş
2. Onboarding sayfasına yönlenmeli (profil yoksa)
3. Website gir → "OperIQ ile Analiz Et" → profil taslağı
4. Profili kaydet → dashboard'a yönlenme
5. Sidebar'da yeni itemlar: SEO İçerik, Sosyal Medya, Newsletter, Şablonlar, Takvim
6. Her modülü test et: oluştur, listele, düzenle

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 2 production deploy"
```
