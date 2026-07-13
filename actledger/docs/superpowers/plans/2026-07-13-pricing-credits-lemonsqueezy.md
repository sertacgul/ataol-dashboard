# Pricing Model + Split Credits + Lemon Squeezy — Implementation Plan

**Branch:** `fix/pricing-credits`. Git root `C:\Users\serta`, project `actledger/`. Only `git add` exact paths; never `-A`. Each step its own commit.

## Credit categorization (locked)
- **outreach** pool: email reveal, bulk-reveal, compose, auto-outreach, maps search/details/sentiment, competitors analyze, profile analyze.
- **content** pool: ai generate, ai research, seo translate, seo check.
- Pay-as-you-go packs top up the **outreach** pool.

## Plan values (locked)
| Plan | $/mo | $/yr | outreach | content | notes |
|---|---|---|---|---|---|
| Free | 0 | - | 25 | 5 | no CC |
| Pro | 29 | 290 | 300 | 10 | |
| Growth | 49 | 490 | 750 | 25 | API access |
| Team | 29/user | 290/user | 300/user | 10/user | min 2 users |
Pay-as-you-go: $10 / 40 · $35 / 200 · $120 / 1000 (outreach).

`PLAN_CREDITS = { free:{outreach:25,content:5}, pro:{outreach:300,content:10}, growth:{outreach:750,content:25}, team:{outreach:300,content:10} }`

---

# FAZ A — Pricing model + credit split

## A1: Migration — split credit columns
`workers/askdesk-api/src/db/migration-credits-split.sql`:
```sql
ALTER TABLE user_credits ADD COLUMN outreach_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN content_used INTEGER NOT NULL DEFAULT 0;
```
Existing balances: carry `used_this_month` -> `outreach_used` at read time if outreach_used is 0 and used_this_month>0 (handled in getOrCreateCredits migration shim), content_used starts 0. Apply local + (deploy: remote).

## A2: credits.js — two pools
Rewrite `lib/credits.js`:
- `PLAN_CREDITS` (above). Keep `PLAN_LIMITS` export as `{plan: outreach}` for any legacy import OR update callers.
- `getOrCreateCredits(db, userId, plan)` returns `{ outreach_used, content_used, reset_date, plan, limits: PLAN_CREDITS[plan] }`. On reset (reset_date passed) zero both used counters. One-time shim: if row has legacy `used_this_month>0` and `outreach_used==0`, treat outreach_used=used_this_month.
- `hasCredits(credits, type, amount)` -> `(credits.limits[type] - credits[type+'_used']) >= amount`.
- `deductCredit(db, userId, type, amount=1)` -> `UPDATE user_credits SET <type>_used = <type>_used + ? WHERE user_id=?`.
- `checkCredits(c, type, amount=1)` -> `{ ok, userId, credits }`.
- `addCredits(db, userId, type, amount)` (for pay-as-you-go): decrements <type>_used by amount (floor 0) OR store bonus — simplest: subtract from used (grants headroom). Implement as `UPDATE ... <type>_used = MAX(0, <type>_used - ?)`.

## A3: Wire every charging endpoint with its type
Update all `checkCredits(c, N)`/`deductCredit(c.env.DB, uid, N)` calls to pass type:
- email-finder.js: reveal, bulk-reveal, compose, auto-outreach -> `'outreach'`.
- maps.js: search/details/sentiment -> `'outreach'`.
- competitors.js: analyze -> `'outreach'` (amount 2).
- profile.js: analyze -> `'outreach'`.
- ai.js: generate, research -> `'content'`.
- seo.js: translate, check -> `'content'`.
- GET /email-finder/credits: return both pools `{ outreach:{limit,used,remaining}, content:{...}, reset_date, plan }`.
Insufficient -> 402 `{ error, credit_type }`.

## A4: CC conflict + free credits
- `Landing.jsx`: remove Starter card line `Credit card required / Kredi kartı gerekli`. (Hero "Kredi kartsız başla" stays.)
- `Register.jsx`: change the "Payment will be charged after trial / Deneme süresi sonunda ödeme alınır" line to no-CC copy: `isEn ? '7-day free trial. No credit card required.' : '7 gün ücretsiz deneme. Kredi kartı gerekmez.'`
- Free credits handled by PLAN_CREDITS.free = {outreach:25, content:5}.

## A5: Pricing page values + two-credit copy
`Landing.jsx` pricing cards:
- Prices: Pro $25->$29 ($250/yr->$290/yr save $58 or keep "2 ay" phrasing: $290/yıl), Growth $40->$49 ($400->$490/yr), Team $35->$29/user, "Min 3"->"Min 2 users ($58/mo)".
- Each card lists two credit lines: e.g. Pro `[isEn?'300 outreach credits/mo':'300 outreach kredisi/ay', isEn?'10 content credits/mo':'10 content kredisi/ay', 'Email Finder', ...]`. Free `25 outreach + 5 content`. Growth `750 outreach + 25 content`. Team `300 outreach + 10 content /user`.
- Pay-as-you-go packs -> `[{c:'40',p:'$10'},{c:'200',p:'$35'},{c:'1,000',p:'$120'}]`.
- Legend: split into two lines: `1 outreach kredisi = reveal + AI email + lead` and `1 content kredisi = SEO makale + sosyal medya postu` (EN too).
- Frontend Sidebar credit balance + EmailFinder CreditsBar: adapt to show two pools (outreach/content) from the new /credits shape.

Build after each; deploy at end of Faz A.

---

# FAZ B — Lemon Squeezy (store 281912, USD, key = LEMONSQUEEZY_API_KEY secret)

## B1: Archive old product (manual-ish, via API script, one-time)
Old product "AskDesk Pro $7" id=1049378 -> set status draft via `PATCH /v1/products/1049378` (or leave; new variants supersede). Controller runs this once with the key; not app code.

## B2: Create products/variants via LS API (controller runs one-time script)
Create (test_mode considerations): Pro (monthly $29 + yearly $290), Growth (monthly $49 + yearly $490), Team (per-unit $29/mo, $290/yr), 3 one-time pay-as-you-go ($10/$35/$120). Capture variant IDs -> put in `lib/billing-config.js` (VARIANTS map + credit grants per variant).

## B3: /billing route
`routes/billing.js` + `app.route('/billing', ...)`:
- `POST /billing/checkout` (authed): body `{ variant_id }`. Create LS checkout via `POST /v1/checkouts` with `checkout_data.custom = { user_id }`, `product_options.redirect_url`, `test_mode` per env. Return `{ url }`.
- `POST /billing/webhook` (public, no auth): verify HMAC-SHA256 signature header `X-Signature` against `LEMON_WEBHOOK_SECRET` over raw body. Handle:
  - `subscription_created`/`subscription_updated` (status active): set user.plan from variant map, reset credits to plan.
  - `subscription_cancelled`/`subscription_expired`: user.plan='free'.
  - `order_created` (one-time, pay-as-you-go): `addCredits(outreach, packAmount)` from variant map.
  Map LS -> user via `meta.custom_data.user_id`.

## B4: Frontend checkout wiring
Pricing card buttons + Settings "Aboneliğim" -> call `/billing/checkout` with the right variant, redirect to `url`.

## B5: Test (test mode) then go live
Controller tests a checkout in LS test mode (test card), verifies webhook updates plan/credits. User adds webhook URL `https://api.askdesk.app/billing/webhook` + signing secret in LS dashboard. Then flip to live.

---

## Deploy
Remote D1 migration (credits split). Worker deploy. Frontend build + `wrangler pages deploy --branch main`.
LS product creation + webhook config are separate one-time steps (B1/B2/B5) run by controller/user, not in the app deploy.
