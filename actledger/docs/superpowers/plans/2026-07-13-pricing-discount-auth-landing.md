# Pricing + Discount + Auth UX + Landing — Implementation Plan

> Execute via superpowers:subagent-driven-development, task-by-task. Steps use `- [ ]`.

**Goal:** Discount code (%50, global, one-time/user, 3 months), retuned pricing model + pay-as-you-go display, show-password toggle, and landing copy fixes. No payment collection.

**Tech:** Cloudflare Workers/Hono/D1, React, Tailwind. Git root `C:\Users\serta`, project `actledger/`. Branch: new `feat/pricing-discount`.

Ref spec: `docs/superpowers/specs/2026-07-13-pricing-discount-auth-landing-design.md`

Git discipline: only `git add` exact paths. Test cmds via `node node_modules/...`.

---

## Task 1: PasswordInput component + wire (Madde 3)

**Files:** Create `src/components/PasswordInput.jsx`; modify `src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/ForgotPassword.jsx`.

- [ ] Create `src/components/PasswordInput.jsx`:
```jsx
import { useState } from 'react'

export default function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full px-3 py-2 pr-10 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
        tabIndex={-1}
        aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
      </button>
    </div>
  )
}
```

- [ ] `Login.jsx`: import PasswordInput; replace the password `<input type="password" ... />` with `<PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />` (drop the old className, PasswordInput carries it).
- [ ] `Register.jsx`: same for its password input → `<PasswordInput value={form.password} onChange={update('password')} required minLength={6} />`.
- [ ] `ForgotPassword.jsx`: the "new password" input → `<PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />`.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/components/PasswordInput.jsx actledger/src/pages/Login.jsx actledger/src/pages/Register.jsx actledger/src/pages/ForgotPassword.jsx && git commit -m "feat: show/hide password toggle on auth forms"`

---

## Task 2: DB migration for discount (Madde 1)

**Files:** Create `workers/askdesk-api/src/db/migration-pricing-v1.sql`.

- [ ] Write:
```sql
-- Discount code redemption per user
ALTER TABLE users ADD COLUMN discount_percent INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN discount_expires_at TEXT;
ALTER TABLE users ADD COLUMN discount_code TEXT;
```
- [ ] Apply local: `cd actledger/workers/askdesk-api && node node_modules/wrangler/bin/wrangler.js d1 execute askdesk-db --local --file=src/db/migration-pricing-v1.sql`. (If "duplicate column" → already applied, treat as success.) NOTE: local `users` table may not exist; if "no such table: users", note it (DONE_WITH_CONCERNS) — remote has it, will apply at deploy.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/db/migration-pricing-v1.sql && git commit -m "feat: users discount columns migration"`

---

## Task 3: Worker auth — discount config + endpoints (Madde 1)

**Files:** Modify `workers/askdesk-api/src/routes/auth.js`. READ it first (register handler, /me handler, exports).

- [ ] Add near top (after imports): 
```js
const DISCOUNT_CODES = { LAUNCH50: { percent: 50, months: 3 } }

function computeDiscount(code) {
  if (!code) return null
  const cfg = DISCOUNT_CODES[String(code).trim().toUpperCase()]
  if (!cfg) return null
  const exp = new Date()
  exp.setMonth(exp.getMonth() + cfg.months)
  return { percent: cfg.percent, expires_at: exp.toISOString(), code: String(code).trim().toUpperCase() }
}
```

- [ ] `/register`: read optional `discount_code` from body. After validating email/existing user, compute `const disc = discount_code ? computeDiscount(discount_code) : null`. If `discount_code` provided AND `disc === null` → `return c.json({ error: 'Geçersiz indirim kodu' }, 400)`. Add the 3 columns to the INSERT (extend column list + binds): `discount_percent = disc?.percent || 0`, `discount_expires_at = disc?.expires_at || null`, `discount_code = disc?.code || null`. Include them in the returned JSON too.

- [ ] `/auth/me`: extend the returned user object to include `discount_percent: user.discount_percent || 0, discount_expires_at: user.discount_expires_at || null, discount_code: user.discount_code || null` (the SELECT is likely `SELECT *`; if it's an explicit column list, add them).

- [ ] Add new endpoint (authed — mirror how other authed routes get userId; auth.js `/me` shows the pattern):
```js
router.post('/redeem-code', async (c) => {
  const userId = /* same way /me resolves current user id from cookie/token */ 
  if (!userId) return c.json({ error: 'Yetkisiz' }, 401)
  const { code } = await c.req.json()
  const user = await c.env.DB.prepare('SELECT discount_code FROM users WHERE id = ?').bind(userId).first()
  if (!user) return c.json({ error: 'Kullanıcı bulunamadı' }, 404)
  if (user.discount_code) return c.json({ error: 'Bu hesap indirim kodunu zaten kullandı' }, 409)
  const disc = computeDiscount(code)
  if (!disc) return c.json({ error: 'Geçersiz indirim kodu' }, 400)
  await c.env.DB.prepare('UPDATE users SET discount_percent = ?, discount_expires_at = ?, discount_code = ? WHERE id = ?')
    .bind(disc.percent, disc.expires_at, disc.code, userId).run()
  return c.json({ discount_percent: disc.percent, discount_expires_at: disc.expires_at })
})
```
IMPORTANT: resolve `userId` exactly the way `/me` does in this file (read the token cookie + verify). Match the existing pattern; do not invent a middleware.

- [ ] Verify: `cd actledger/workers/askdesk-api && node --check src/routes/auth.js`.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/auth.js && git commit -m "feat: discount code redemption (register + /redeem-code + /me)"`

---

## Task 4: Frontend discount UI (Madde 1)

**Files:** Modify `src/contexts/AuthContext.jsx`, `src/pages/Register.jsx`, `src/pages/Settings.jsx`.

- [ ] `AuthContext.jsx`: `register` gains a 5th param `discountCode` and includes `discount_code: discountCode || undefined` in the POST body. Ensure `user` exposed by context carries discount fields from `/auth/me` and `register` responses (it already sets `setUser(data)`).
- [ ] `Register.jsx`: add optional field to `form` state (`discount_code: ''`) and an input "İndirim Kodu (opsiyonel)" / "Discount code (optional)" below password; pass `form.discount_code` as 5th arg to `register(...)`.
- [ ] `Settings.jsx`: READ it first for structure/patterns. Add an "İndirim Kodu" card/section: if `user.discount_code` set → show status "%{user.discount_percent} indirim aktif — {new Date(user.discount_expires_at).toLocaleDateString('tr-TR')}'e kadar"; else an input + "Uygula" button calling `api.post('/auth/redeem-code', { code })`, on success update local UI (and ideally refresh user). Use existing Settings styling.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/contexts/AuthContext.jsx actledger/src/pages/Register.jsx actledger/src/pages/Settings.jsx && git commit -m "feat: discount code entry on register + settings"`

---

## Task 5: PLAN_LIMITS retune (Madde 4)

**Files:** Modify `workers/askdesk-api/src/routes/email-finder.js`.

- [ ] Change `const PLAN_LIMITS = { free: 25, pro: 300, growth: 1500, team: 1000 }` → `const PLAN_LIMITS = { free: 25, pro: 250, growth: 600, team: 600 }`.
- [ ] Verify: `node --check src/routes/email-finder.js`.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/email-finder.js && git commit -m "feat: retune reveal limits for margin (pro250/growth600/team600)"`

---

## Task 6: Landing pricing update + pay-as-you-go card + de-slop copy (Madde 2 + 4)

**Files:** Modify `src/pages/Landing.jsx`.

- [ ] **Pricing numbers** in the pricing cards:
  - Pro list: `isEn?'300 email reveals/month':'300 email reveal/ay'` → `250 email reveals/month` / `250 email reveal/ay`.
  - Growth list: `1,500 email reveals/month` / `1.500 email reveal/ay` → `600 email reveals/month` / `600 email reveal/ay`.
  - Team list: `1,000 reveals/user/month` / `1.000 reveal/kullanıcı/ay` → `600 reveals/user/month` / `600 reveal/kullanıcı/ay`.
- [ ] **Pay-as-you-go block**: after the 4-card grid `</div>` (the `grid ... lg:grid-cols-4` closing) and before the SSL line, insert a full-width card:
```jsx
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <div className="text-xs font-medium text-[#2563EB] uppercase tracking-wider mb-1">{isEn ? 'Pay as you go' : 'Kullandıkça Öde'}</div>
                <p className="text-sm text-[#6B7280]">{isEn ? 'No monthly fee. Buy verified-reveal credits, use anytime.' : 'Aylık ücret yok. Doğrulanmış reveal kredisi alın, istediğinizde kullanın.'}</p>
              </div>
              <Link to="/register" className="shrink-0 text-center text-sm font-medium text-[#2563EB] border border-[#2563EB] rounded-lg px-5 py-2.5 hover:bg-[#EFF6FF] transition-colors">
                {isEn ? 'Start Trial' : 'Denemeye Başla'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[{c:'50',p:'$12'},{c:'200',p:'$40'},{c:'1,000',p:'$150'}].map((pk,i) => (
                <div key={i} className="border border-[#F3F4F6] rounded-lg p-4 text-center">
                  <div className="text-2xl font-extrabold text-[#111827]">{pk.p}</div>
                  <div className="text-xs text-[#6B7280] mt-1">{pk.c} {isEn ? 'credits' : 'kredi'}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#9CA3AF] mt-3">{isEn ? '1 credit = 1 verified email reveal. Credits valid 12 months.' : '1 kredi = 1 doğrulanmış email reveal. Krediler 12 ay geçerli.'}</p>
          </div>
```
- [ ] **De-slop copy** (`FEATURES[1]`):
  - descTr: replace `MX doğrulama` with `Doğrulanmış email adresleri`.
  - descEn: replace `MX verification` with `Verified email addresses`.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/pages/Landing.jsx && git commit -m "feat: landing pay-as-you-go card, retuned reveal counts, verified-email copy"`

---

## Deploy (after all tasks, with user)
1. Remote D1: `wrangler d1 execute askdesk-db --remote --file=src/db/migration-pricing-v1.sql` (echo y | ...).
2. Worker: `wrangler deploy`.
3. Frontend: merge `feat/pricing-discount` → master, push.

## Self-review
- Item 1 → T2/T3/T4. Item 2 → T6. Item 3 → T1. Item 4 → T5/T6. All covered.
- Discount is inert until billing (no charge path) — intentional per "define model first".
