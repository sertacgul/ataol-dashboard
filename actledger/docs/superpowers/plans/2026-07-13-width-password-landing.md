# Width + Password Change + Landing Redesign — Implementation Plan

> Execute via superpowers:subagent-driven-development.

**Goal:** Widen narrow module pages; add password change in Settings; redesign landing for B2B-outbound positioning with honest trust signals + polished animation (10-second buy decision). NO fabricated proof (no fake testimonials/logos/metrics).

**Branch:** new `feat/ux-landing`. Git root `C:\Users\serta`, project `actledger/`. Only `git add` exact paths; never `-A`.

---

## Task 1: Widen narrow module pages

**Files:** `src/pages/leads/LeadDetail.jsx`, `src/pages/leads/LeadNew.jsx`, `src/pages/outreach/OutreachDetail.jsx`, `src/pages/outreach/OutreachNew.jsx`, `src/pages/Settings.jsx`.
- [ ] In each of the 4 lead/outreach pages, change the root container `className="max-w-xl"` → `className="max-w-3xl"`.
- [ ] In `Settings.jsx`, change the section card widths `max-w-md` → `max-w-2xl` (there are several `bg-white border ... rounded-md p-6 max-w-md mb-6` cards; make them `max-w-2xl`). Leave the existing `max-w-2xl` card as-is.
- [ ] Build: `cd actledger && node node_modules/vite/bin/vite.js build` → success.
- [ ] Commit: `git add actledger/src/pages/leads/LeadDetail.jsx actledger/src/pages/leads/LeadNew.jsx actledger/src/pages/outreach/OutreachDetail.jsx actledger/src/pages/outreach/OutreachNew.jsx actledger/src/pages/Settings.jsx && git commit -m "feat: widen lead/outreach/settings content"`

---

## Task 2: Password change (backend + Settings)

**Files:** `workers/askdesk-api/src/routes/auth.js`; `src/pages/Settings.jsx`; `src/lib/api.js` (verify `api.post` exists — it does).

READ FIRST: `auth.js` — how `/me` resolves userId from the `askdesk_token` cookie (JWT via jose + JWT_SECRET), and the `hashPassword`/`verifyPassword` helpers.

- [ ] Add `POST /auth/change-password` (authed) to auth.js. Resolve userId exactly like `/me`. Then:
```js
auth.post('/change-password', async (c) => {
  // resolve userId from askdesk_token cookie (same as /me)
  if (!userId) return c.json({ error: 'Yetkisiz' }, 401)
  const { current_password, new_password } = await c.req.json()
  if (!current_password || !new_password) return c.json({ error: 'Mevcut ve yeni şifre gerekli' }, 400)
  if (new_password.length < 6) return c.json({ error: 'Yeni şifre en az 6 karakter olmalı' }, 400)
  const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first()
  if (!user) return c.json({ error: 'Kullanıcı bulunamadı' }, 404)
  const ok = await verifyPassword(current_password, user.password_hash)
  if (!ok) return c.json({ error: 'Mevcut şifre yanlış' }, 400)
  const password_hash = await hashPassword(new_password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(password_hash, userId).run()
  return c.json({ ok: true })
})
```
(Use the file's actual router var name — likely `auth`. Reuse the exact cookie/JWT resolution block from `/me` or `/redeem-code`.)
- [ ] Verify `node --check src/routes/auth.js`.
- [ ] In `Settings.jsx`, add a "Şifre Değiştir" / "Change Password" card (styled like the other Settings cards, `max-w-2xl`). Import `PasswordInput` from `../components/PasswordInput`. Fields: current password + new password (both `<PasswordInput>`), a save button, and inline success/error message. On submit: `api.post('/auth/change-password', { current_password, new_password })`; on success show "Şifre güncellendi" and clear fields; on error show `err.message`. Local state for fields + submitting + message.
- [ ] Build → success.
- [ ] Commit: `git add actledger/workers/askdesk-api/src/routes/auth.js actledger/src/pages/Settings.jsx && git commit -m "feat: change password in settings"`
- [ ] Deploy note: worker needs redeploy for the endpoint (done at final deploy).

---

## Task 3: Landing redesign — outbound hero + honest trust + stats + CTA

**Files:** `src/pages/Landing.jsx`. READ the hero section (h1/subcopy/CTA ~line 1021-1057), the STATS array (~line 71), the FEATURES array (~line 5).

- [ ] **Hero copy** (keep `<h1>` classes + animation; change text only):
  - H1: `isEn ? <>Find the right people,<br />reach them with AI</> : <>Doğru kişiyi bul,<br />AI ile ulaş, toplantı al</>`
  - Subcopy `<p>`: `isEn ? 'The outbound engine for B2B founders: real verified emails + personalized AI emails. No guessing, no setup — first replies in minutes.' : 'B2B kurucular için outbound motoru: gerçek doğrulanmış e-postalar + kişiye özel AI e-postaları. Tahmin yok, kurulum yok — dakikalar içinde ilk yanıtlar.'`
- [ ] **Honest trust band**: add a small centered row right below the hero CTA buttons (inside the hero `max-w-4xl` container, after the CTA `<div>`):
```jsx
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#9CA3AF]">
            <span>{isEn ? 'Built at ITU ARI Teknokent' : 'ITÜ ARI Teknokent\'te geliştirildi'}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span>{isEn ? 'Real verified emails' : 'Gerçek doğrulanmış e-postalar'}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span>{isEn ? 'No credit card to start' : 'Kredi kartsız başla'}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span>{isEn ? '256-bit SSL' : '256-bit SSL'}</span>
          </div>
```
- [ ] **STATS array** — replace with honest, outbound-outcome-framed items (no fabricated numbers):
```js
const STATS = [
  { value: 'Verified', labelTr: 'Doğrulanmış E-posta', labelEn: 'Verified Emails' },
  { value: 'AI', labelTr: 'Kişiye Özel Outreach', labelEn: 'Personalized Outreach' },
  { value: 'Dakikalar', labelTr: 'Kurulumdan İlk E-postaya', labelEn: 'Setup to First Email' },
  { value: '0', labelTr: 'Kurulum / Kod', labelEn: 'Setup / Code' },
]
```
(If a `value` needs to differ by language for 'Dakikalar'/'Minutes', keep `value` as-is; acceptable to show 'Dakikalar' — or set value to a language-neutral glyph. Keep simple: value stays the string above.)
- [ ] **Features emphasis**: In the FEATURES array, reorder so the outbound trio is first: (1) People & Email Finder, (2) Fully Automated Outreach, (3) Lead Generation — then the rest (Pipeline, SEO, etc.). Do NOT delete features; just reorder the array so outbound leads.
- [ ] Build → success. Sanity: `#features`, `#pricing`, `#how-it-works` still present.
- [ ] Commit: `git add actledger/src/pages/Landing.jsx && git commit -m "feat: landing outbound positioning + honest trust band + outcome stats"`

---

## Task 4: Landing animation polish

**Files:** `src/pages/Landing.jsx`. READ the `ProductShowcase` component (~line 698-850) and `DEMO_SCREENS` array (~line 85).
- [ ] **Lead with the outbound flow:** reorder `DEMO_SCREENS` so the sequence starts with the outbound story: `emailfinder` (Email Finder) → `outreach` → `leads` → `pipeline` → then the rest (dashboard, seo, social, ...). This makes the auto-cycling showcase tell the outbound narrative first.
- [ ] **Smoother transitions:** in `ProductShowcase`, if the crossfade/transition duration is short/janky, increase the fade duration for a smoother feel (e.g. transition-opacity duration to ~500ms) and ensure the auto-advance interval gives enough read time (INTERVAL ~3500ms is fine; keep or bump to 4000ms). Only adjust timing/easing — do not restructure the component. Keep all existing colors/animations.
- [ ] **Hero entrance:** ensure the hero content has a subtle entrance animation on load (the CSS has `fadeInUp`). If the hero container doesn't already animate in, add `className="... animate-[fadeInUp_0.6s_ease-out]"` to the hero inner `max-w-4xl` text container (do not add if it already animates).
- [ ] Build → success.
- [ ] Commit: `git add actledger/src/pages/Landing.jsx && git commit -m "feat: landing animation polish - outbound showcase order + smoother transitions"`

---

## Deploy (after all tasks, with user)
1. Worker: `wrangler deploy` (change-password endpoint).
2. Frontend: `cd actledger && npm run build` then `wrangler pages deploy dist --project-name askdesk-app --branch main --commit-dirty=true`.
(No D1 migration.)

## Self-review
- #1 → T1. #2 → T2. #3 (outbound + honest trust) → T3. #4 (animation) → T4. No fabricated proof anywhere (only real facts: ITU ARI Teknokent, verified emails, SSL).
- Frontend deploy MUST use wrangler pages deploy --branch main.
