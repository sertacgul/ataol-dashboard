# AskDesk Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AskDesk Phase 1 MVP — a SaaS platform for startups to manage outreach, leads, and CRM pipeline, deployed on Cloudflare Pages + Workers + D1.

**Architecture:** React SPA (Vite + Tailwind) on Cloudflare Pages communicates with a Cloudflare Workers API. D1 (SQLite) stores all data. Gemini API key is proxied through Workers. JWT auth with HttpOnly cookies. Every DB table is scoped by `user_id`.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Cloudflare Workers (Hono framework), Cloudflare D1, JWT (jose library), bcrypt (bcryptjs)

**Spec:** `docs/superpowers/specs/2026-07-10-askdesk-design.md`

---

## File Structure

### Frontend (`src/`)

```
src/
├── main.jsx                          # Entry point, BrowserRouter
├── index.css                         # Tailwind imports + AskDesk theme
├── App.jsx                           # Route definitions
├── lib/
│   └── api.js                        # API client (fetch wrapper)
├── contexts/
│   └── AuthContext.jsx               # Auth state, login/logout/register
├── components/
│   ├── Layout.jsx                    # Authenticated layout (sidebar + content)
│   ├── Sidebar.jsx                   # Nav sidebar with collapse
│   ├── ProtectedRoute.jsx            # Auth guard
│   ├── StatCard.jsx                  # Dashboard stat card
│   ├── Badge.jsx                     # Status badge (pill)
│   ├── Modal.jsx                     # Reusable modal
│   └── KanbanBoard.jsx              # Drag & drop kanban
├── pages/
│   ├── Landing.jsx                   # Public homepage
│   ├── Login.jsx                     # Login form
│   ├── Register.jsx                  # Register form
│   ├── Dashboard.jsx                 # Stats + recent activity
│   ├── Settings.jsx                  # User settings
│   ├── leads/
│   │   ├── LeadList.jsx              # Lead table with filters
│   │   ├── LeadDetail.jsx            # Single lead view
│   │   ├── LeadNew.jsx               # Manual lead entry form
│   │   └── LeadMaps.jsx             # Google Maps firm finder
│   ├── outreach/
│   │   ├── OutreachList.jsx          # Email list with status filters
│   │   ├── OutreachNew.jsx           # Compose + AI generate
│   │   └── OutreachDetail.jsx        # Email preview + actions
│   └── pipeline/
│       └── Pipeline.jsx              # Kanban board view
```

### Workers API (`workers/askdesk-api/`)

```
workers/askdesk-api/
├── package.json                      # Hono, jose, bcryptjs deps
├── wrangler.toml                     # D1 binding, env vars
├── src/
│   ├── index.js                      # Hono app, route mounting, CORS
│   ├── middleware/
│   │   └── auth.js                   # JWT verify middleware
│   ├── routes/
│   │   ├── auth.js                   # register, login, logout, me
│   │   ├── leads.js                  # CRUD for companies + contacts
│   │   ├── outreach.js               # Email CRUD, send, track
│   │   ├── pipeline.js               # Stages + items CRUD
│   │   ├── maps.js                   # Google Maps proxy
│   │   ├── ai.js                     # Gemini proxy
│   │   └── dashboard.js              # Stats aggregation
│   └── db/
│       └── schema.sql                # D1 table definitions
```

---

## Task 1: Proje Temizliği ve Bağımlılıklar

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `src/index.css`
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Delete: `src/App.css`
- Delete: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

- [ ] **Step 1: Bağımlılıkları kur**

```bash
cd C:/Users/serta/actledger
npm install react-router-dom@7
```

- [ ] **Step 2: package.json name güncelle**

`package.json` dosyasında `"name": "actledger"` → `"name": "askdesk"` olarak değiştir.

- [ ] **Step 3: index.html güncelle**

```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AskDesk</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Tailwind CSS'i AskDesk temasıyla yapılandır**

`src/index.css` dosyasını tamamen değiştir:

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-surface: #F9FAFB;
  --color-border: #E5E7EB;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #93C5FD;
  --radius-default: 6px;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--color-text-primary);
  background: #fff;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: main.jsx'e router ekle**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 6: App.jsx'i temizle — placeholder routes**

```jsx
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<div>Login</div>} />
      <Route path="/register" element={<div>Register</div>} />
      <Route path="/app/dashboard" element={<div>Dashboard</div>} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 7: Eski template dosyalarını sil**

```bash
rm -f src/App.css src/assets/react.svg src/assets/vite.svg src/assets/hero.png
```

- [ ] **Step 8: Çalıştığını doğrula**

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` → "AskDesk Landing" görünmeli.
`http://localhost:5173/login` → "Login" görünmeli.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: clean template, add react-router, set up AskDesk theme"
```

---

## Task 2: Cloudflare Workers API Projesi Oluştur

**Files:**
- Create: `workers/askdesk-api/package.json`
- Create: `workers/askdesk-api/wrangler.toml`
- Create: `workers/askdesk-api/src/index.js`
- Create: `workers/askdesk-api/src/db/schema.sql`

- [ ] **Step 1: Workers dizin yapısını oluştur**

```bash
mkdir -p workers/askdesk-api/src/routes workers/askdesk-api/src/middleware workers/askdesk-api/src/db
```

- [ ] **Step 2: package.json oluştur**

`workers/askdesk-api/package.json`:

```json
{
  "name": "askdesk-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "jose": "^6.0.0",
    "bcryptjs": "^3.0.0"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 3: wrangler.toml oluştur**

`workers/askdesk-api/wrangler.toml`:

```toml
name = "askdesk-api"
main = "src/index.js"
compatibility_date = "2026-07-10"

[vars]
CORS_ORIGIN = "http://localhost:5173"

# Gemini API key is set via: wrangler secret put GEMINI_API_KEY
# Google Maps API key is set via: wrangler secret put GOOGLE_MAPS_API_KEY
# JWT secret is set via: wrangler secret put JWT_SECRET

[[d1_databases]]
binding = "DB"
database_name = "askdesk-db"
database_id = "" # Will be filled after: wrangler d1 create askdesk-db
```

- [ ] **Step 4: D1 şema dosyasını oluştur**

`workers/askdesk-api/src/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  sector TEXT,
  country TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  seniority TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  contact_id TEXT,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  opened INTEGER NOT NULL DEFAULT 0,
  quality_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pipeline_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id)
);

CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_user ON pipeline_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_stage ON pipeline_items(stage_id);
```

- [ ] **Step 5: Hono app entrypoint oluştur**

`workers/askdesk-api/src/index.js`:

```js
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
  return corsMiddleware(c, next)
})

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

- [ ] **Step 6: Bağımlılıkları kur**

```bash
cd workers/askdesk-api
npm install
```

- [ ] **Step 7: D1 veritabanını oluştur**

```bash
npx wrangler d1 create askdesk-db
```

Çıktıdaki `database_id` değerini `wrangler.toml` dosyasındaki boş `database_id` alanına yapıştır.

- [ ] **Step 8: Şemayı D1'e uygula**

```bash
npx wrangler d1 execute askdesk-db --local --file=src/db/schema.sql
```

- [ ] **Step 9: Dev server'ı test et**

```bash
npm run dev
```

`curl http://localhost:8787/health` → `{"status":"ok"}`

- [ ] **Step 10: Commit**

```bash
cd ../..
git add workers/
git commit -m "feat: initialize Cloudflare Workers API with Hono and D1 schema"
```

---

## Task 3: Auth API (Workers)

**Files:**
- Create: `workers/askdesk-api/src/middleware/auth.js`
- Create: `workers/askdesk-api/src/routes/auth.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: JWT auth middleware oluştur**

`workers/askdesk-api/src/middleware/auth.js`:

```js
import { SignJWT, jwtVerify } from 'jose'

export async function createToken(userId, role, secret) {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function authMiddleware(c, next) {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/askdesk_token=([^;]+)/)
  if (!match) return c.json({ error: 'Yetkisiz erişim' }, 401)

  try {
    const key = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(match[1], key)
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
    await next()
  } catch {
    return c.json({ error: 'Geçersiz token' }, 401)
  }
}
```

- [ ] **Step 2: Auth routes oluştur**

`workers/askdesk-api/src/routes/auth.js`:

```js
import { Hono } from 'hono'
import { hashSync, compareSync } from 'bcryptjs'
import { createToken } from '../middleware/auth.js'

const auth = new Hono()

auth.post('/register', async (c) => {
  const { email, password, name, company_name } = await c.req.json()
  if (!email || !password || !name) {
    return c.json({ error: 'Email, şifre ve isim gerekli' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Bu email zaten kayıtlı' }, 409)

  const id = crypto.randomUUID()
  const password_hash = hashSync(password, 10)

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, company_name, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, company_name || null, 'member').run()

  const token = await createToken(id, 'member', c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id, email, name, company_name, role: 'member' }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email ve şifre gerekli' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user || !compareSync(password, user.password_hash)) {
    return c.json({ error: 'Geçersiz email veya şifre' }, 401)
  }

  const token = await createToken(user.id, user.role, c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id: user.id, email: user.email, name: user.name, company_name: user.company_name, role: user.role })
})

auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'askdesk_token=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/askdesk_token=([^;]+)/)
  if (!match) return c.json({ user: null })

  try {
    const { jwtVerify } = await import('jose')
    const key = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(match[1], key)
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?'
    ).bind(payload.sub).first()
    return c.json({ user: user || null })
  } catch {
    return c.json({ user: null })
  }
})

export default auth
```

- [ ] **Step 3: Auth route'larını index.js'e bağla**

`workers/askdesk-api/src/index.js` dosyasını güncelle — `app.get('/health', ...)` satırından önce:

```js
import authRoutes from './routes/auth.js'

// ... cors middleware'den sonra ...

app.route('/auth', authRoutes)
```

- [ ] **Step 4: Test et**

```bash
cd workers/askdesk-api && npm run dev
```

```bash
# Register
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test User"}' -v

# Login
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' -v
```

Her iki istekte de `Set-Cookie: askdesk_token=...` header'ı dönmeli.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add workers/
git commit -m "feat: add auth API — register, login, logout, me endpoints"
```

---

## Task 4: API Client ve Auth Context (Frontend)

**Files:**
- Create: `src/lib/api.js`
- Create: `src/contexts/AuthContext.jsx`
- Create: `src/components/ProtectedRoute.jsx`

- [ ] **Step 1: API client oluştur**

`src/lib/api.js`:

```js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Bir hata oluştu')
  return data
}

api.get = (path) => api(path)
api.post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) })
api.put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) })
api.del = (path) => api(path, { method: 'DELETE' })
```

- [ ] **Step 2: AuthContext oluştur**

`src/contexts/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password })
    setUser(data)
    return data
  }

  async function register(email, password, name, company_name) {
    const data = await api.post('/auth/register', { email, password, name, company_name })
    setUser(data)
    return data
  }

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: ProtectedRoute oluştur**

`src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>
  if (!user) return <Navigate to="/login" replace />

  return children
}
```

- [ ] **Step 4: main.jsx'e AuthProvider ekle**

`src/main.jsx`:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add API client, AuthContext, and ProtectedRoute"
```

---

## Task 5: Login ve Register Sayfaları

**Files:**
- Create: `src/pages/Login.jsx`
- Create: `src/pages/Register.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Login sayfasını oluştur**

`src/pages/Login.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="AskDesk" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
          <h1 className="text-lg font-semibold text-[#111827] mb-1">Giriş Yap</h1>
          <p className="text-sm text-[#6B7280] mb-6">Hesabınıza giriş yapın</p>

          {error && (
            <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="ornek@firma.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-sm text-[#6B7280] text-center mt-4">
          Hesabınız yok mu? <Link to="/register" className="text-[#2563EB] font-medium">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Register sayfasını oluştur**

`src/pages/Register.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(form.email, form.password, form.name, form.company_name)
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/assets/logo.svg" alt="AskDesk" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-6">
          <h1 className="text-lg font-semibold text-[#111827] mb-1">Kayıt Ol</h1>
          <p className="text-sm text-[#6B7280] mb-6">Yeni hesap oluşturun</p>

          {error && (
            <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Ad Soyad</label>
              <input type="text" value={form.name} onChange={update('name')} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Firma Adı</label>
              <input type="text" value={form.company_name} onChange={update('company_name')}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="İsteğe bağlı" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Email</label>
              <input type="email" value={form.email} onChange={update('email')} required
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Şifre</label>
              <input type="password" value={form.password} onChange={update('password')} required minLength={6}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
              {submitting ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>
        </div>

        <p className="text-sm text-[#6B7280] text-center mt-4">
          Zaten hesabınız var mı? <Link to="/login" className="text-[#2563EB] font-medium">Giriş Yap</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: App.jsx route'larını güncelle**

```jsx
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app/dashboard" element={
        <ProtectedRoute><div>Dashboard</div></ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
```

- [ ] **Step 4: Test et**

Workers dev server çalışır durumda olmalı (`cd workers/askdesk-api && npm run dev`).
Frontend dev server: `npm run dev`.

1. `http://localhost:5173/register` → kayıt formu görünmeli
2. Formu doldur → submit → `/app/dashboard`'a yönlenmeli
3. `http://localhost:5173/login` → giriş formu → login → dashboard

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add login and register pages with auth flow"
```

---

## Task 6: App Shell — Sidebar + Layout

**Files:**
- Create: `src/components/Layout.jsx`
- Create: `src/components/Sidebar.jsx`
- Create: `src/components/StatCard.jsx`
- Create: `src/components/Badge.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Sidebar oluştur**

`src/components/Sidebar.jsx`:

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { to: '/app/outreach', label: 'Outreach', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { to: '/app/leads', label: 'Leads', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/app/pipeline', label: 'Pipeline', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
]

const secondaryItems = [
  { to: '/app/leads/maps', label: 'Maps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { to: '/app/settings', label: 'Ayarlar', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function NavIcon({ d }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
          isActive
            ? 'bg-[#EFF6FF] text-[#2563EB]'
            : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
        }`
      }
    >
      <NavIcon d={icon} />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-[#FAFBFC] border-r border-[#E5E7EB] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
          <span className="text-sm font-semibold tracking-tight text-[#111827]">AskDesk</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        <div className="my-3 border-t border-[#E5E7EB]" />
        {secondaryItems.map((item) => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-[#6B7280]">
              {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[#111827] truncate">{user?.name}</div>
            <div className="text-[10px] text-[#9CA3AF]">
              {user?.role === 'superadmin' ? 'Super Admin' : user?.company_name || 'Kullanıcı'}
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#9CA3AF] hover:text-[#6B7280]" title="Çıkış">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Layout oluştur**

`src/components/Layout.jsx`:

```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-[#F9FAFB] p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: StatCard ve Badge bileşenlerini oluştur**

`src/components/StatCard.jsx`:

```jsx
export default function StatCard({ label, value, change, negative }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl font-semibold tracking-tight text-[#111827]">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${negative ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  )
}
```

`src/components/Badge.jsx`:

```jsx
const styles = {
  draft: 'bg-[#F3F4F6] text-[#374151]',
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  approved: 'bg-[#DCFCE7] text-[#166534]',
  sent: 'bg-[#DBEAFE] text-[#1E40AF]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B]',
  opened: 'bg-[#EDE9FE] text-[#5B21B6]',
}

const labels = {
  draft: 'Taslak',
  pending: 'Beklemede',
  approved: 'Onaylı',
  sent: 'Gönderildi',
  rejected: 'Reddedildi',
  opened: 'Açıldı',
}

export default function Badge({ status }) {
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}
```

- [ ] **Step 4: App.jsx'i Layout ile güncelle**

```jsx
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>AskDesk Landing</div>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<div className="text-sm text-[#6B7280]">Dashboard içeriği gelecek</div>} />
        <Route path="outreach" element={<div className="text-sm text-[#6B7280]">Outreach içeriği gelecek</div>} />
        <Route path="leads" element={<div className="text-sm text-[#6B7280]">Leads içeriği gelecek</div>} />
        <Route path="leads/new" element={<div>Yeni Lead</div>} />
        <Route path="leads/maps" element={<div>Maps</div>} />
        <Route path="leads/:id" element={<div>Lead Detay</div>} />
        <Route path="pipeline" element={<div className="text-sm text-[#6B7280]">Pipeline içeriği gelecek</div>} />
        <Route path="settings" element={<div className="text-sm text-[#6B7280]">Ayarlar içeriği gelecek</div>} />
      </Route>
    </Routes>
  )
}

export default App
```

- [ ] **Step 5: Test et**

1. Register → Dashboard'a yönlenmeli
2. Sol sidebar görünmeli — logo, nav itemlar, kullanıcı bilgisi
3. Nav linkleri çalışmalı — aktif sayfa mavi highlight
4. Çıkış butonu → login sayfasına yönlenmeli

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add app shell — sidebar navigation, layout, StatCard, Badge"
```

---

## Task 7: Dashboard Sayfası

**Files:**
- Create: `workers/askdesk-api/src/routes/dashboard.js`
- Modify: `workers/askdesk-api/src/index.js`
- Create: `src/pages/Dashboard.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Dashboard API route oluştur**

`workers/askdesk-api/src/routes/dashboard.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const dashboard = new Hono()
dashboard.use('*', authMiddleware)

dashboard.get('/stats', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const isSuper = role === 'superadmin'
  const where = isSuper ? '' : 'WHERE user_id = ?'
  const bind = isSuper ? [] : [userId]

  const [companies, emails, sent, opened] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM companies ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where}`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where ? where + ' AND' : 'WHERE'} status = 'sent'`).bind(...bind).first(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM emails ${where ? where + ' AND' : 'WHERE'} opened = 1`).bind(...bind).first(),
  ])

  const recentEmails = await c.env.DB.prepare(
    `SELECT e.id, e.subject, e.status, e.created_at, c.name as company_name
     FROM emails e LEFT JOIN companies c ON e.company_id = c.id
     ${where ? 'WHERE e.user_id = ?' : ''}
     ORDER BY e.created_at DESC LIMIT 5`
  ).bind(...bind).all()

  return c.json({
    total_leads: companies.count,
    total_emails: emails.count,
    total_sent: sent.count,
    total_opened: opened.count,
    open_rate: sent.count > 0 ? ((opened.count / sent.count) * 100).toFixed(1) : '0',
    recent_emails: recentEmails.results,
  })
})

export default dashboard
```

- [ ] **Step 2: Dashboard route'u index.js'e bağla**

`workers/askdesk-api/src/index.js`'e ekle:

```js
import dashboardRoutes from './routes/dashboard.js'

app.route('/dashboard', dashboardRoutes)
```

- [ ] **Step 3: Dashboard sayfasını oluştur**

`src/pages/Dashboard.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-[#9CA3AF]">Yükleniyor...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Dashboard</h1>
          <p className="text-xs text-[#9CA3AF]">Genel bakış</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Toplam Lead" value={stats?.total_leads || 0} />
        <StatCard label="Gönderilen Email" value={stats?.total_sent || 0} />
        <StatCard label="Açılma Oranı" value={`${stats?.open_rate || 0}%`} />
        <StatCard label="Toplam Email" value={stats?.total_emails || 0} />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#111827]">Son Outreach</span>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {stats?.recent_emails?.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Henüz outreach yok</div>
          )}
          {stats?.recent_emails?.map((email) => (
            <div key={email.id} className="flex items-center px-4 py-2.5">
              <span className="flex-2 text-xs font-medium text-[#111827]">{email.company_name || '—'}</span>
              <span className="flex-2 text-xs text-[#6B7280] truncate">{email.subject || '—'}</span>
              <span className="flex-1"><Badge status={email.status} /></span>
              <span className="flex-1 text-xs text-[#9CA3AF] text-right">
                {new Date(email.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App.jsx'deki dashboard placeholder'ını değiştir**

Dashboard route'unu `<Dashboard />` ile güncelle. Import ekle.

- [ ] **Step 5: Test et ve commit**

```bash
git add src/ workers/
git commit -m "feat: add dashboard page with stats and recent activity"
```

---

## Task 8: Leads API (Workers)

**Files:**
- Create: `workers/askdesk-api/src/routes/leads.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: Leads CRUD route'larını oluştur**

`workers/askdesk-api/src/routes/leads.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const leads = new Hono()
leads.use('*', authMiddleware)

// List companies with filters
leads.get('/', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { sector, country, source, q } = c.req.query()

  let sql = 'SELECT * FROM companies'
  const conditions = []
  const params = []

  if (role !== 'superadmin') {
    conditions.push('user_id = ?')
    params.push(userId)
  }
  if (sector) { conditions.push('sector = ?'); params.push(sector) }
  if (country) { conditions.push('country = ?'); params.push(country) }
  if (source) { conditions.push('source = ?'); params.push(source) }
  if (q) { conditions.push('name LIKE ?'); params.push(`%${q}%`) }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ companies: result.results })
})

// Get single company with contacts
leads.get('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  const contacts = await c.env.DB.prepare('SELECT * FROM contacts WHERE company_id = ?').bind(id).all()
  return c.json({ company, contacts: contacts.results })
})

// Create company + optional contact
leads.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const companyId = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO companies (id, user_id, name, website, sector, country, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(companyId, userId, body.name, body.website || null, body.sector || null, body.country || null, body.source || 'manual', body.notes || null).run()

  if (body.contact_name || body.contact_email) {
    const contactId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO contacts (id, company_id, user_id, name, email, title, seniority) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(contactId, companyId, userId, body.contact_name || '', body.contact_email || null, body.contact_title || null, body.contact_seniority || null).run()
  }

  return c.json({ id: companyId }, 201)
})

// Update company
leads.put('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')
  const body = await c.req.json()

  const company = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    'UPDATE companies SET name = ?, website = ?, sector = ?, country = ?, notes = ? WHERE id = ?'
  ).bind(body.name, body.website || null, body.sector || null, body.country || null, body.notes || null, id).run()

  return c.json({ ok: true })
})

// Delete company (cascades contacts)
leads.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const company = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM contacts WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM pipeline_items WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM emails WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM companies WHERE id = ?').bind(id),
  ])

  return c.json({ ok: true })
})

export default leads
```

- [ ] **Step 2: index.js'e bağla**

```js
import leadsRoutes from './routes/leads.js'

app.route('/leads', leadsRoutes)
```

- [ ] **Step 3: Test et ve commit**

```bash
git add workers/
git commit -m "feat: add leads API — CRUD for companies and contacts"
```

---

## Task 9: Leads UI — Liste, Detay, Manuel Ekleme

**Files:**
- Create: `src/pages/leads/LeadList.jsx`
- Create: `src/pages/leads/LeadNew.jsx`
- Create: `src/pages/leads/LeadDetail.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: LeadList sayfasını oluştur**

`src/pages/leads/LeadList.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadList() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadCompanies()
  }, [])

  async function loadCompanies() {
    setLoading(true)
    try {
      const data = await api.get(`/leads${search ? `?q=${encodeURIComponent(search)}` : ''}`)
      setCompanies(data.companies)
    } catch {}
    setLoading(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    loadCompanies()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Leads</h1>
          <p className="text-xs text-[#9CA3AF]">{companies.length} firma</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/leads/maps" className="px-3 py-2 text-xs border border-[#D1D5DB] text-[#374151] rounded-md hover:bg-[#F3F4F6]">
            Maps'ten Bul
          </Link>
          <Link to="/app/leads/new" className="px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
            + Yeni Lead
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Firma ara..."
          className="w-full max-w-xs px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
        />
      </form>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="flex px-4 py-2 bg-[#F9FAFB] border-b border-[#F3F4F6]">
          <span className="flex-2 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Firma</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Sektör</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Ülke</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Kaynak</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Tarih</span>
        </div>
        {loading && <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Yükleniyor...</div>}
        {!loading && companies.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Henüz lead eklenmemiş</div>
        )}
        {companies.map((c) => (
          <Link key={c.id} to={`/app/leads/${c.id}`} className="flex items-center px-4 py-2.5 border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
            <span className="flex-2 text-xs font-medium text-[#111827]">{c.name}</span>
            <span className="flex-1 text-xs text-[#6B7280]">{c.sector || '—'}</span>
            <span className="flex-1 text-xs text-[#6B7280]">{c.country || '—'}</span>
            <span className="flex-1 text-xs text-[#6B7280]">{c.source}</span>
            <span className="flex-1 text-xs text-[#9CA3AF]">{new Date(c.created_at).toLocaleDateString('tr-TR')}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: LeadNew sayfasını oluştur**

`src/pages/leads/LeadNew.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadNew() {
  const [form, setForm] = useState({
    name: '', website: '', sector: '', country: '', notes: '',
    contact_name: '', contact_email: '', contact_title: '', contact_seniority: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name) return setError('Firma adı gerekli')
    setError('')
    setSubmitting(true)
    try {
      const { id } = await api.post('/leads', form)
      navigate(`/app/leads/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-[#374151] mb-1'

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-[#111827] mb-1">Yeni Lead</h1>
      <p className="text-xs text-[#9CA3AF] mb-6">Manuel olarak firma ve iletişim bilgisi ekleyin</p>

      {error && <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[#111827]">Firma Bilgileri</h2>
          <div>
            <label className={labelClass}>Firma Adı *</label>
            <input type="text" value={form.name} onChange={update('name')} required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Website</label><input type="url" value={form.website} onChange={update('website')} className={inputClass} placeholder="https://" /></div>
            <div><label className={labelClass}>Sektör</label><input type="text" value={form.sector} onChange={update('sector')} className={inputClass} /></div>
          </div>
          <div>
            <label className={labelClass}>Ülke</label>
            <input type="text" value={form.country} onChange={update('country')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notlar</label>
            <textarea value={form.notes} onChange={update('notes')} rows={3} className={inputClass} />
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[#111827]">İletişim Kişisi</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Ad Soyad</label><input type="text" value={form.contact_name} onChange={update('contact_name')} className={inputClass} /></div>
            <div><label className={labelClass}>Email</label><input type="email" value={form.contact_email} onChange={update('contact_email')} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Ünvan</label><input type="text" value={form.contact_title} onChange={update('contact_title')} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Kıdem</label>
              <select value={form.contact_seniority} onChange={update('contact_seniority')} className={inputClass}>
                <option value="">Seçiniz</option>
                <option value="c-level">C-Level</option>
                <option value="vp">VP</option>
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="senior">Senior</option>
                <option value="junior">Junior</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button type="button" onClick={() => navigate('/app/leads')}
            className="px-4 py-2 text-sm border border-[#D1D5DB] text-[#374151] rounded-md hover:bg-[#F3F4F6]">
            İptal
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: LeadDetail sayfasını oluştur**

`src/pages/leads/LeadDetail.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/leads/${id}`)
      .then((data) => { setCompany(data.company); setContacts(data.contacts) })
      .catch(() => navigate('/app/leads'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return
    await api.del(`/leads/${id}`)
    navigate('/app/leads')
  }

  if (loading) return <div className="text-sm text-[#9CA3AF]">Yükleniyor...</div>
  if (!company) return null

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">{company.name}</h1>
          <p className="text-xs text-[#9CA3AF]">{company.sector} · {company.country}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/outreach/new?company=${id}`}
            className="px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
            Email Gönder
          </Link>
          <button onClick={handleDelete}
            className="px-3 py-2 text-xs text-[#DC2626] border border-red-200 rounded-md hover:bg-red-50">
            Sil
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4 space-y-2">
        <h2 className="text-sm font-semibold text-[#111827] mb-3">Firma Bilgileri</h2>
        {company.website && <div className="text-xs"><span className="text-[#6B7280]">Website:</span> <a href={company.website} target="_blank" className="text-[#2563EB]">{company.website}</a></div>}
        {company.source && <div className="text-xs"><span className="text-[#6B7280]">Kaynak:</span> {company.source}</div>}
        {company.notes && <div className="text-xs"><span className="text-[#6B7280]">Notlar:</span> {company.notes}</div>}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
        <h2 className="text-sm font-semibold text-[#111827] mb-3">İletişim Kişileri</h2>
        {contacts.length === 0 && <p className="text-xs text-[#9CA3AF]">Henüz kişi eklenmemiş</p>}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
            <div>
              <div className="text-xs font-medium text-[#111827]">{c.name}</div>
              <div className="text-[10px] text-[#6B7280]">{c.title} {c.seniority ? `· ${c.seniority}` : ''}</div>
            </div>
            {c.email && <span className="text-xs text-[#2563EB]">{c.email}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App.jsx route'larını güncelle**

Leads placeholder'larını gerçek komponentlerle değiştir. Import'ları ekle:

```jsx
import LeadList from './pages/leads/LeadList'
import LeadNew from './pages/leads/LeadNew'
import LeadDetail from './pages/leads/LeadDetail'
```

Route'ları güncelle:
```jsx
<Route path="leads" element={<LeadList />} />
<Route path="leads/new" element={<LeadNew />} />
<Route path="leads/:id" element={<LeadDetail />} />
```

- [ ] **Step 5: Test et ve commit**

```bash
git add src/ workers/
git commit -m "feat: add leads management — list, detail, manual entry"
```

---

## Task 10: Outreach API (Workers)

**Files:**
- Create: `workers/askdesk-api/src/routes/outreach.js`
- Create: `workers/askdesk-api/src/routes/ai.js`
- Modify: `workers/askdesk-api/src/index.js`

- [ ] **Step 1: Outreach route'larını oluştur**

`workers/askdesk-api/src/routes/outreach.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const outreach = new Hono()
outreach.use('*', authMiddleware)

// List emails
outreach.get('/', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { status } = c.req.query()

  let sql = `SELECT e.*, c.name as company_name, ct.name as contact_name, ct.email as contact_email
             FROM emails e
             LEFT JOIN companies c ON e.company_id = c.id
             LEFT JOIN contacts ct ON e.contact_id = ct.id`
  const conditions = []
  const params = []

  if (role !== 'superadmin') { conditions.push('e.user_id = ?'); params.push(userId) }
  if (status) { conditions.push('e.status = ?'); params.push(status) }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY e.created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ emails: result.results })
})

// Create email
outreach.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO emails (id, user_id, company_id, contact_id, subject, body, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, body.company_id || null, body.contact_id || null, body.subject || '', body.body || '', body.status || 'draft').run()

  return c.json({ id }, 201)
})

// Get single email
outreach.get('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const email = await c.env.DB.prepare(
    `SELECT e.*, c.name as company_name, ct.name as contact_name, ct.email as contact_email
     FROM emails e
     LEFT JOIN companies c ON e.company_id = c.id
     LEFT JOIN contacts ct ON e.contact_id = ct.id
     WHERE e.id = ?`
  ).bind(id).first()

  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  return c.json({ email })
})

// Update email (approve, reject, edit)
outreach.put('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')
  const body = await c.req.json()

  const email = await c.env.DB.prepare('SELECT user_id FROM emails WHERE id = ?').bind(id).first()
  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    'UPDATE emails SET subject = COALESCE(?, subject), body = COALESCE(?, body), status = COALESCE(?, status), quality_score = COALESCE(?, quality_score) WHERE id = ?'
  ).bind(body.subject ?? null, body.body ?? null, body.status ?? null, body.quality_score ?? null, id).run()

  return c.json({ ok: true })
})

// Send email (mark as sent)
outreach.post('/:id/send', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const email = await c.env.DB.prepare('SELECT * FROM emails WHERE id = ?').bind(id).first()
  if (!email) return c.json({ error: 'Email bulunamadı' }, 404)
  if (role !== 'superadmin' && email.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    "UPDATE emails SET status = 'sent', sent_at = datetime('now') WHERE id = ?"
  ).bind(id).run()

  // TODO: Phase 1'de gerçek email gönderimi eklenmeyecek, sadece status değişecek
  return c.json({ ok: true })
})

// Track pixel (open tracking)
outreach.get('/:id/track', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE emails SET opened = 1 WHERE id = ?').bind(id).run()

  // 1x1 transparent GIF
  const gif = new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,255,255,255,0,0,0,33,249,4,0,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59])
  return new Response(gif, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
})

export default outreach
```

- [ ] **Step 2: AI proxy route oluştur**

`workers/askdesk-api/src/routes/ai.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const ai = new Hono()
ai.use('*', authMiddleware)

ai.post('/generate', async (c) => {
  const { prompt, context } = await c.req.json()
  if (!prompt) return c.json({ error: 'Prompt gerekli' }, 400)

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': c.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: context ? `${context}\n\n${prompt}` : prompt }] }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return c.json({ error: 'AI servisi hatası', detail: err }, 502)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return c.json({ result: text })
})

ai.post('/research', async (c) => {
  const { company_name, website } = await c.req.json()
  if (!company_name) return c.json({ error: 'Firma adı gerekli' }, 400)

  const prompt = `"${company_name}" firması hakkında kısa bir araştırma yap${website ? ` (website: ${website})` : ''}. Şunları içersin:
1. Firma ne iş yapıyor (2-3 cümle)
2. Sektörü
3. Tahmini büyüklüğü
4. Potansiyel ihtiyaçları
JSON formatında yanıt ver: {"summary": "...", "sector": "...", "size": "...", "needs": ["..."]}`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': c.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) return c.json({ error: 'AI servisi hatası' }, 502)

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return c.json({ result: text })
})

export default ai
```

- [ ] **Step 3: index.js'e bağla**

```js
import outreachRoutes from './routes/outreach.js'
import aiRoutes from './routes/ai.js'

app.route('/outreach', outreachRoutes)
app.route('/ai', aiRoutes)
```

- [ ] **Step 4: Commit**

```bash
git add workers/
git commit -m "feat: add outreach API and Gemini AI proxy"
```

---

## Task 11: Outreach UI — Liste, Compose, AI Generate

**Files:**
- Create: `src/pages/outreach/OutreachList.jsx`
- Create: `src/pages/outreach/OutreachNew.jsx`
- Create: `src/pages/outreach/OutreachDetail.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: OutreachList oluştur**

`src/pages/outreach/OutreachList.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'

export default function OutreachList() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadEmails() }, [filter])

  async function loadEmails() {
    setLoading(true)
    try {
      const data = await api.get(`/outreach${filter ? `?status=${filter}` : ''}`)
      setEmails(data.emails)
    } catch {}
    setLoading(false)
  }

  const filters = [
    { value: '', label: 'Tümü' },
    { value: 'draft', label: 'Taslak' },
    { value: 'pending', label: 'Beklemede' },
    { value: 'approved', label: 'Onaylı' },
    { value: 'sent', label: 'Gönderildi' },
    { value: 'rejected', label: 'Reddedildi' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Outreach</h1>
          <p className="text-xs text-[#9CA3AF]">{emails.length} email</p>
        </div>
        <Link to="/app/outreach/new" className="px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
          + Yeni Email
        </Link>
      </div>

      <div className="flex gap-1 mb-4">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs rounded-md ${filter === f.value ? 'bg-[#2563EB] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
        <div className="flex px-4 py-2 bg-[#F9FAFB] border-b border-[#F3F4F6]">
          <span className="flex-2 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Firma</span>
          <span className="flex-2 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Konu</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Durum</span>
          <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-[#6B7280]">Tarih</span>
        </div>
        {loading && <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Yükleniyor...</div>}
        {!loading && emails.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">Henüz email yok</div>
        )}
        {emails.map((e) => (
          <Link key={e.id} to={`/app/outreach/${e.id}`} className="flex items-center px-4 py-2.5 border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
            <span className="flex-2 text-xs font-medium text-[#111827]">{e.company_name || '—'}</span>
            <span className="flex-2 text-xs text-[#6B7280] truncate">{e.subject || 'Konu yok'}</span>
            <span className="flex-1"><Badge status={e.opened ? 'opened' : e.status} /></span>
            <span className="flex-1 text-xs text-[#9CA3AF]">{new Date(e.created_at).toLocaleDateString('tr-TR')}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: OutreachNew oluştur**

`src/pages/outreach/OutreachNew.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'

export default function OutreachNew() {
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('company')
  const navigate = useNavigate()

  const [company, setCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (companyId) {
      api.get(`/leads/${companyId}`).then((data) => {
        setCompany(data.company)
        setContacts(data.contacts)
        if (data.contacts.length > 0) setSelectedContact(data.contacts[0].id)
      }).catch(() => {})
    }
  }, [companyId])

  async function handleGenerate() {
    if (!company) return setError('Önce bir firma seçin')
    setGenerating(true)
    setError('')
    try {
      const prompt = `"${company.name}" firmasına (${company.sector || 'sektör belirtilmemiş'}, ${company.country || 'ülke belirtilmemiş'}) profesyonel bir outreach emaili yaz. 
Konu ve içerik olarak ayır. Email kısa, net ve kişiselleştirilmiş olsun. Satış baskısı yapma, değer önerisi sun.
Format:
KONU: ...
İÇERİK:
...`

      const data = await api.post('/ai/generate', { prompt })
      const result = data.result || ''

      const subjectMatch = result.match(/KONU:\s*(.+)/i)
      const bodyMatch = result.match(/İÇERİK:\s*([\s\S]+)/i)

      if (subjectMatch) setSubject(subjectMatch[1].trim())
      if (bodyMatch) setBody(bodyMatch[1].trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(status) {
    if (!subject || !body) return setError('Konu ve içerik gerekli')
    setSubmitting(true)
    try {
      const { id } = await api.post('/outreach', {
        company_id: companyId || null,
        contact_id: selectedContact || null,
        subject, body, status,
      })
      navigate(`/app/outreach/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent'

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-[#111827] mb-1">Yeni Outreach</h1>
      <p className="text-xs text-[#9CA3AF] mb-6">AI ile email oluşturun veya manuel yazın</p>

      {error && <div className="text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</div>}

      {company && (
        <div className="bg-white border border-[#E5E7EB] rounded-md p-4 mb-4">
          <div className="text-xs text-[#6B7280]">Firma</div>
          <div className="text-sm font-medium text-[#111827]">{company.name}</div>
          {contacts.length > 0 && (
            <select value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)} className="mt-2 text-xs border border-[#D1D5DB] rounded-md px-2 py-1">
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          )}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-[#111827]">Email İçeriği</h2>
          <button onClick={handleGenerate} disabled={generating}
            className="px-3 py-1.5 text-xs font-medium text-[#2563EB] border border-[#2563EB] rounded-md hover:bg-[#EFF6FF] disabled:opacity-50">
            {generating ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">Konu</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">İçerik</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className={inputClass} />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => handleSubmit('pending')} disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
          Onaya Gönder
        </button>
        <button onClick={() => handleSubmit('draft')} disabled={submitting}
          className="px-4 py-2 text-sm border border-[#D1D5DB] text-[#374151] rounded-md hover:bg-[#F3F4F6]">
          Taslak Kaydet
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: OutreachDetail oluştur**

`src/pages/outreach/OutreachDetail.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import Badge from '../../components/Badge'

export default function OutreachDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/outreach/${id}`)
      .then((data) => setEmail(data.email))
      .catch(() => navigate('/app/outreach'))
      .finally(() => setLoading(false))
  }, [id])

  async function updateStatus(status) {
    await api.put(`/outreach/${id}`, { status })
    setEmail((e) => ({ ...e, status }))
  }

  async function handleSend() {
    await api.post(`/outreach/${id}/send`)
    setEmail((e) => ({ ...e, status: 'sent', sent_at: new Date().toISOString() }))
  }

  if (loading) return <div className="text-sm text-[#9CA3AF]">Yükleniyor...</div>
  if (!email) return null

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold text-[#111827]">{email.company_name || 'Email'}</h1>
            <Badge status={email.opened ? 'opened' : email.status} />
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {email.contact_name && `${email.contact_name} · `}
            {new Date(email.created_at).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <div className="flex gap-2">
          {email.status === 'pending' && (
            <>
              <button onClick={() => updateStatus('approved')}
                className="px-3 py-2 text-xs font-medium text-white bg-[#059669] rounded-md hover:bg-[#047857]">Onayla</button>
              <button onClick={() => updateStatus('rejected')}
                className="px-3 py-2 text-xs text-[#DC2626] border border-red-200 rounded-md hover:bg-red-50">Reddet</button>
            </>
          )}
          {email.status === 'approved' && (
            <button onClick={handleSend}
              className="px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">Gönder</button>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
        <div className="text-xs text-[#6B7280] mb-1">Konu</div>
        <div className="text-sm font-medium text-[#111827] mb-4">{email.subject}</div>
        <div className="text-xs text-[#6B7280] mb-1">İçerik</div>
        <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">{email.body}</div>
      </div>

      {email.sent_at && (
        <div className="mt-4 text-xs text-[#9CA3AF]">
          Gönderilme: {new Date(email.sent_at).toLocaleString('tr-TR')}
          {email.opened ? ' · Açıldı' : ''}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: App.jsx route'larını güncelle**

Import'lar ve route'lar:

```jsx
import OutreachList from './pages/outreach/OutreachList'
import OutreachNew from './pages/outreach/OutreachNew'
import OutreachDetail from './pages/outreach/OutreachDetail'
```

```jsx
<Route path="outreach" element={<OutreachList />} />
<Route path="outreach/new" element={<OutreachNew />} />
<Route path="outreach/:id" element={<OutreachDetail />} />
```

- [ ] **Step 5: Test et ve commit**

```bash
git add src/
git commit -m "feat: add outreach UI — email list, compose with AI, detail view"
```

---

## Task 12: Pipeline API + Kanban UI

**Files:**
- Create: `workers/askdesk-api/src/routes/pipeline.js`
- Modify: `workers/askdesk-api/src/index.js`
- Create: `src/pages/pipeline/Pipeline.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Pipeline API route'larını oluştur**

`workers/askdesk-api/src/routes/pipeline.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const pipeline = new Hono()
pipeline.use('*', authMiddleware)

// Get stages + items
pipeline.get('/', async (c) => {
  const userId = c.get('userId')

  let stages = await c.env.DB.prepare(
    'SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position'
  ).bind(userId).all()

  // Seed default stages if none exist
  if (stages.results.length === 0) {
    const defaults = ['İletişim Kuruldu', 'Yanıt Geldi', 'Toplantı', 'Anlaşma']
    for (let i = 0; i < defaults.length; i++) {
      await c.env.DB.prepare(
        'INSERT INTO pipeline_stages (id, user_id, name, position) VALUES (?, ?, ?, ?)'
      ).bind(crypto.randomUUID(), userId, defaults[i], i).run()
    }
    stages = await c.env.DB.prepare(
      'SELECT * FROM pipeline_stages WHERE user_id = ? ORDER BY position'
    ).bind(userId).all()
  }

  const items = await c.env.DB.prepare(
    `SELECT pi.*, c.name as company_name, c.sector, c.country
     FROM pipeline_items pi
     JOIN companies c ON pi.company_id = c.id
     WHERE pi.user_id = ?
     ORDER BY pi.updated_at DESC`
  ).bind(userId).all()

  return c.json({ stages: stages.results, items: items.results })
})

// Add item to pipeline
pipeline.post('/items', async (c) => {
  const userId = c.get('userId')
  const { company_id, stage_id, notes } = await c.req.json()
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO pipeline_items (id, user_id, company_id, stage_id, notes) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, userId, company_id, stage_id, notes || null).run()

  return c.json({ id }, 201)
})

// Move item to different stage
pipeline.put('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { stage_id, notes } = await c.req.json()

  const item = await c.env.DB.prepare('SELECT user_id FROM pipeline_items WHERE id = ?').bind(id).first()
  if (!item) return c.json({ error: 'Bulunamadı' }, 404)
  if (item.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    "UPDATE pipeline_items SET stage_id = COALESCE(?, stage_id), notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?"
  ).bind(stage_id ?? null, notes ?? null, id).run()

  return c.json({ ok: true })
})

// Delete item
pipeline.delete('/items/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  await c.env.DB.prepare('DELETE FROM pipeline_items WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return c.json({ ok: true })
})

export default pipeline
```

- [ ] **Step 2: index.js'e bağla**

```js
import pipelineRoutes from './routes/pipeline.js'

app.route('/pipeline', pipelineRoutes)
```

- [ ] **Step 3: Kanban Pipeline sayfasını oluştur**

`src/pages/pipeline/Pipeline.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

export default function Pipeline() {
  const [stages, setStages] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(null)

  useEffect(() => { loadPipeline() }, [])

  async function loadPipeline() {
    setLoading(true)
    try {
      const data = await api.get('/pipeline')
      setStages(data.stages)
      setItems(data.items)
    } catch {}
    setLoading(false)
  }

  function getItemsForStage(stageId) {
    return items.filter((item) => item.stage_id === stageId)
  }

  function handleDragStart(e, itemId) {
    setDragging(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e, stageId) {
    e.preventDefault()
    if (!dragging) return

    setItems((prev) => prev.map((item) =>
      item.id === dragging ? { ...item, stage_id: stageId } : item
    ))

    try {
      await api.put(`/pipeline/items/${dragging}`, { stage_id: stageId })
    } catch {
      loadPipeline()
    }
    setDragging(null)
  }

  async function handleDelete(itemId) {
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    await api.del(`/pipeline/items/${itemId}`)
  }

  if (loading) return <div className="text-sm text-[#9CA3AF]">Yükleniyor...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#111827]">Pipeline</h1>
        <p className="text-xs text-[#9CA3AF]">Lead'lerinizi sürükleyerek aşamalar arası taşıyın</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-64"
            onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.id)}>
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <span className="text-xs font-semibold text-[#111827]">{stage.name}</span>
              <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded-full">
                {getItemsForStage(stage.id).length}
              </span>
            </div>

            <div className="space-y-2 min-h-[200px] bg-[#F9FAFB] rounded-md p-2 border border-dashed border-[#E5E7EB]">
              {getItemsForStage(stage.id).map((item) => (
                <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item.id)}
                  className="bg-white border border-[#E5E7EB] rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-[#2563EB] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="text-xs font-medium text-[#111827]">{item.company_name}</div>
                    <button onClick={() => handleDelete(item.id)} className="text-[#9CA3AF] hover:text-[#DC2626] text-xs">x</button>
                  </div>
                  {item.sector && <div className="text-[10px] text-[#6B7280] mt-1">{item.sector}</div>}
                  {item.notes && <div className="text-[10px] text-[#9CA3AF] mt-1">{item.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App.jsx'deki pipeline route'unu güncelle**

```jsx
import Pipeline from './pages/pipeline/Pipeline'

// route:
<Route path="pipeline" element={<Pipeline />} />
```

- [ ] **Step 5: Test et ve commit**

```bash
git add src/ workers/
git commit -m "feat: add CRM pipeline — kanban board with drag & drop"
```

---

## Task 13: Google Maps Firma Bulma

**Files:**
- Create: `workers/askdesk-api/src/routes/maps.js`
- Modify: `workers/askdesk-api/src/index.js`
- Create: `src/pages/leads/LeadMaps.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Maps API proxy route oluştur**

`workers/askdesk-api/src/routes/maps.js`:

```js
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const maps = new Hono()
maps.use('*', authMiddleware)

maps.post('/search', async (c) => {
  const { query, location } = await c.req.json()
  if (!query) return c.json({ error: 'Arama terimi gerekli' }, 400)

  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${c.env.GOOGLE_MAPS_API_KEY}`
  if (location) url += `&location=${location}&radius=50000`

  const res = await fetch(url)
  const data = await res.json()

  const places = (data.results || []).map((p) => ({
    place_id: p.place_id,
    name: p.name,
    address: p.formatted_address,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    types: p.types,
    location: p.geometry?.location,
  }))

  return c.json({ places })
})

maps.post('/details', async (c) => {
  const { place_id } = await c.req.json()
  if (!place_id) return c.json({ error: 'Place ID gerekli' }, 400)

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,formatted_phone_number,website,reviews,rating,user_ratings_total&key=${c.env.GOOGLE_MAPS_API_KEY}`

  const res = await fetch(url)
  const data = await res.json()
  const place = data.result || {}

  return c.json({
    name: place.name,
    address: place.formatted_address,
    phone: place.formatted_phone_number,
    website: place.website,
    rating: place.rating,
    total_reviews: place.user_ratings_total,
    reviews: (place.reviews || []).slice(0, 5).map((r) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.relative_time_description,
    })),
  })
})

maps.post('/sentiment', async (c) => {
  const { reviews, company_name } = await c.req.json()
  if (!reviews || reviews.length === 0) return c.json({ error: 'Yorum gerekli' }, 400)

  const reviewTexts = reviews.map((r) => `[${r.rating}/5] ${r.text}`).join('\n')

  const prompt = `Aşağıdaki "${company_name}" firmasının Google Maps yorumlarını analiz et.
Sentiment analizi yap ve JSON formatında yanıt ver:
{"overall": "pozitif|negatif|nötr", "score": 0-100, "summary": "2-3 cümle özet", "strengths": ["..."], "weaknesses": ["..."]}

Yorumlar:
${reviewTexts}`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  if (!res.ok) return c.json({ error: 'AI servisi hatası' }, 502)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return c.json({ result: text })
})

export default maps
```

- [ ] **Step 2: index.js'e bağla**

```js
import mapsRoutes from './routes/maps.js'

app.route('/maps', mapsRoutes)
```

- [ ] **Step 3: LeadMaps sayfasını oluştur**

`src/pages/leads/LeadMaps.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function LeadMaps() {
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [details, setDetails] = useState(null)
  const [sentiment, setSentiment] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false)
  const navigate = useNavigate()

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSelectedPlace(null)
    setDetails(null)
    setSentiment(null)
    try {
      const data = await api.post('/maps/search', { query })
      setPlaces(data.places)
    } catch {}
    setSearching(false)
  }

  async function handleSelectPlace(place) {
    setSelectedPlace(place)
    setDetails(null)
    setSentiment(null)
    setLoadingDetails(true)
    try {
      const data = await api.post('/maps/details', { place_id: place.place_id })
      setDetails(data)
    } catch {}
    setLoadingDetails(false)
  }

  async function handleSentiment() {
    if (!details?.reviews?.length) return
    setAnalyzingSentiment(true)
    try {
      const data = await api.post('/maps/sentiment', {
        reviews: details.reviews,
        company_name: details.name,
      })
      setSentiment(data.result)
    } catch {}
    setAnalyzingSentiment(false)
  }

  async function handleSaveAsLead() {
    if (!details) return
    try {
      const { id } = await api.post('/leads', {
        name: details.name,
        website: details.website || '',
        country: details.address || '',
        source: 'maps',
        notes: sentiment || '',
      })
      navigate(`/app/leads/${id}`)
    } catch {}
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-[#111827] mb-1">Google Maps Firma Bul</h1>
      <p className="text-xs text-[#9CA3AF] mb-6">Haritada firma arayın, yorumlarını analiz edin</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="ör: İstanbul'daki yazılım şirketleri"
          className="flex-1 px-3 py-2 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
        <button type="submit" disabled={searching}
          className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8] disabled:opacity-50">
          {searching ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      <div className="flex gap-4">
        {/* Results list */}
        <div className="w-1/2 space-y-2">
          {places.map((p) => (
            <button key={p.place_id} onClick={() => handleSelectPlace(p)}
              className={`w-full text-left bg-white border rounded-md p-3 hover:border-[#2563EB] transition-colors ${
                selectedPlace?.place_id === p.place_id ? 'border-[#2563EB]' : 'border-[#E5E7EB]'
              }`}>
              <div className="text-xs font-medium text-[#111827]">{p.name}</div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">{p.address}</div>
              {p.rating && (
                <div className="text-[10px] text-[#D97706] mt-1">{p.rating} ({p.user_ratings_total} yorum)</div>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selectedPlace && (
          <div className="w-1/2">
            <div className="bg-white border border-[#E5E7EB] rounded-md p-4">
              {loadingDetails ? (
                <div className="text-sm text-[#9CA3AF]">Detaylar yükleniyor...</div>
              ) : details ? (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-[#111827]">{details.name}</h2>
                  {details.website && <div className="text-xs"><span className="text-[#6B7280]">Web:</span> <a href={details.website} target="_blank" className="text-[#2563EB]">{details.website}</a></div>}
                  {details.phone && <div className="text-xs"><span className="text-[#6B7280]">Tel:</span> {details.phone}</div>}
                  <div className="text-xs"><span className="text-[#6B7280]">Puan:</span> {details.rating}/5 ({details.total_reviews} yorum)</div>

                  {details.reviews?.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#111827]">Yorumlar</span>
                        <button onClick={handleSentiment} disabled={analyzingSentiment}
                          className="text-[10px] text-[#2563EB] border border-[#2563EB] px-2 py-0.5 rounded hover:bg-[#EFF6FF]">
                          {analyzingSentiment ? 'Analiz ediliyor...' : 'Sentiment Analizi'}
                        </button>
                      </div>
                      {details.reviews.map((r, i) => (
                        <div key={i} className="text-[10px] text-[#6B7280] border-b border-[#F3F4F6] py-1.5 last:border-0">
                          <span className="text-[#D97706]">{r.rating}/5</span> — {r.text?.slice(0, 100)}{r.text?.length > 100 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {sentiment && (
                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3 mt-3">
                      <div className="text-xs font-medium text-[#111827] mb-1">Sentiment Analizi</div>
                      <div className="text-[10px] text-[#374151] whitespace-pre-wrap">{sentiment}</div>
                    </div>
                  )}

                  <button onClick={handleSaveAsLead}
                    className="w-full mt-3 px-3 py-2 text-xs font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
                    Lead Olarak Kaydet
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App.jsx'deki maps route'unu güncelle**

```jsx
import LeadMaps from './pages/leads/LeadMaps'

// route:
<Route path="leads/maps" element={<LeadMaps />} />
```

- [ ] **Step 5: Test et ve commit**

```bash
git add src/ workers/
git commit -m "feat: add Google Maps firm finder with sentiment analysis"
```

---

## Task 14: Landing Page (Public)

**Files:**
- Create: `src/pages/Landing.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Landing page oluştur**

`src/pages/Landing.jsx`:

```jsx
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="" className="w-7 h-7" />
            <span className="text-base font-semibold tracking-tight text-[#111827]">AskDesk</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[#6B7280] hover:text-[#111827]">Giriş Yap</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-[#111827] mb-4" style={{lineHeight: '1.15'}}>
          Startup'ınızı büyütecek<br />müşterileri bulun
        </h1>
        <p className="text-lg text-[#6B7280] mb-8 max-w-xl mx-auto">
          Outreach, lead generation ve CRM pipeline'ınızı tek platformda yönetin. AI destekli email oluşturma ile zamandan tasarruf edin.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register" className="px-6 py-3 text-sm font-medium text-white bg-[#2563EB] rounded-md hover:bg-[#1D4ED8]">
            Ücretsiz Başla
          </Link>
          <Link to="/login" className="px-6 py-3 text-sm text-[#374151] border border-[#D1D5DB] rounded-md hover:bg-[#F3F4F6]">
            Giriş Yap
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-[#111827] text-center mb-12">Her şey tek platformda</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { title: 'Akıllı Outreach', desc: 'AI ile kişiselleştirilmiş emailler oluşturun. Onay akışı ve açılma takibi ile kontrol sizde.' },
              { title: 'Lead Generation', desc: 'Google Maps, sektör ve ülke bazlı firma arama. Yorum sentiment analizi ile doğru hedefleri bulun.' },
              { title: 'CRM Pipeline', desc: 'Kanban board ile lead\'lerinizi aşamalar arası taşıyın. İletişimden anlaşmaya kadar takip edin.' },
            ].map((f) => (
              <div key={f.title} className="bg-white border border-[#E5E7EB] rounded-md p-6">
                <h3 className="text-sm font-semibold text-[#111827] mb-2">{f.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/assets/logo.svg" alt="" className="w-5 h-5" />
            <span className="text-xs text-[#9CA3AF]">AskDesk</span>
          </div>
          <span className="text-xs text-[#9CA3AF]">ATAOL AI Techs</span>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: App.jsx'deki landing route'unu güncelle**

```jsx
import Landing from './pages/Landing'

<Route path="/" element={<Landing />} />
```

- [ ] **Step 3: Test et ve commit**

```bash
git add src/
git commit -m "feat: add public landing page"
```

---

## Task 15: Super Admin Seed ve Final Bağlantılar

**Files:**
- Modify: `workers/askdesk-api/src/routes/auth.js`
- Create: `src/pages/Settings.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Auth route'a Super Admin seed ekle**

`workers/askdesk-api/src/routes/auth.js` dosyasında register route'undan sonra yeni bir endpoint ekle:

```js
// One-time super admin seed (call manually, then remove or protect)
auth.post('/seed-admin', async (c) => {
  const { email, password, name } = await c.req.json()
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE role = ?').bind('superadmin').first()
  if (existing) return c.json({ error: 'Super Admin zaten var' }, 409)

  const id = crypto.randomUUID()
  const password_hash = hashSync(password, 10)

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, 'superadmin').run()

  return c.json({ id, email, name, role: 'superadmin' }, 201)
})
```

- [ ] **Step 2: Settings sayfasını oluştur**

`src/pages/Settings.jsx`:

```jsx
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-[#111827] mb-6">Ayarlar</h1>

      <div className="bg-white border border-[#E5E7EB] rounded-md p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#111827]">Hesap Bilgileri</h2>
        <div className="text-xs"><span className="text-[#6B7280]">Ad:</span> {user?.name}</div>
        <div className="text-xs"><span className="text-[#6B7280]">Email:</span> {user?.email}</div>
        <div className="text-xs"><span className="text-[#6B7280]">Firma:</span> {user?.company_name || '—'}</div>
        <div className="text-xs"><span className="text-[#6B7280]">Rol:</span> {user?.role}</div>
        <div className="text-xs"><span className="text-[#6B7280]">Kayıt:</span> {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: App.jsx'de settings route'unu güncelle**

```jsx
import Settings from './pages/Settings'

<Route path="settings" element={<Settings />} />
```

- [ ] **Step 4: Super Admin hesabını seed et**

Workers dev server çalışırken:

```bash
curl -X POST http://localhost:8787/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"captsertacgul@gmail.com","password":"BURAYA_GUCLU_SIFRE","name":"Sertac Gul"}'
```

- [ ] **Step 5: Tam uçtan uca test**

1. Landing page (`/`) → navbar, hero, features, footer
2. Register → yeni kullanıcı → dashboard
3. Login (Super Admin) → tüm veriler görünür
4. Leads → Yeni Lead → detay sayfası
5. Maps → firma ara → sentiment analizi → lead olarak kaydet
6. Outreach → yeni email → AI ile oluştur → onaya gönder → onayla → gönder
7. Pipeline → kanban board → sürükle-bırak

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: add settings page, super admin seed, final wiring"
```

---

## Task 16: Cloudflare'e Deploy

- [ ] **Step 1: Frontend build ve Cloudflare Pages deploy**

```bash
cd C:/Users/serta/actledger
npm run build
```

Cloudflare Dashboard'dan:
1. Pages → Create Project → `askdesk-app`
2. Connect to Git veya Direct Upload (`dist/` klasörü)
3. Custom domain: `askdesk.app`

- [ ] **Step 2: Workers deploy**

```bash
cd workers/askdesk-api

# Secrets ayarla
npx wrangler secret put JWT_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_MAPS_API_KEY

# wrangler.toml'daki CORS_ORIGIN'i güncelle
# CORS_ORIGIN = "https://askdesk.app"

# D1 şemayı production'a uygula
npx wrangler d1 execute askdesk-db --file=src/db/schema.sql

# Deploy
npm run deploy
```

- [ ] **Step 3: Custom domain bağla**

Workers'a custom domain: `api.askdesk.app` (Cloudflare Dashboard → Workers → askdesk-api → Custom Domains)

Frontend `.env.production` oluştur:
```
VITE_API_URL=https://api.askdesk.app
```

Tekrar build ve deploy.

- [ ] **Step 4: Production Super Admin seed**

```bash
curl -X POST https://api.askdesk.app/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"captsertacgul@gmail.com","password":"GUCLU_SIFRE","name":"Sertac Gul"}'
```

- [ ] **Step 5: Production smoke test**

1. `https://askdesk.app` → landing page
2. Login → dashboard
3. Tüm modüller çalışır durumda

- [ ] **Step 6: Commit deploy config**

```bash
git add -A
git commit -m "chore: add production deploy configuration"
```
