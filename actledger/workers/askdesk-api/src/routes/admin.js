import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { createDiscount, deactivateDiscount } from '../lib/lemonsqueezy-discounts.js'
import { normalizeCode } from '../lib/campaigns.js'

const admin = new Hono()
admin.use('*', authMiddleware)
// Super-admin only.
admin.use('*', async (c, next) => {
  if (c.get('userRole') !== 'superadmin') return c.json({ error: 'Yetkisiz' }, 403)
  await next()
})

// ─── Cost model (edit as your real costs change) ─────────────────────────────
// Monthly subscription prices in USD used to estimate MRR.
const PLAN_PRICE = { pro: 29, growth: 49, team: 29 }
// Estimated variable cost per email reveal (~2-3 MillionVerifier verifications).
const COST_PER_REVEAL = 0.003
// Estimated fixed monthly infrastructure cost (Cloudflare, domain, misc), USD.
const FIXED_MONTHLY_COST = 25

async function fetchApiBalances(env) {
  const out = {}

  // MillionVerifier — live credit balance (does not consume a credit).
  if (env.MILLIONVERIFIER_API_KEY) {
    try {
      const r = await fetch(`https://api.millionverifier.com/api/v3/credits?api=${env.MILLIONVERIFIER_API_KEY}`)
      const d = await r.json()
      out.millionverifier = { configured: true, credits: d?.credits ?? null, plan: d?.plan ?? null }
    } catch { out.millionverifier = { configured: true, error: true } }
  } else {
    out.millionverifier = { configured: false }
  }

  // Hunter — account usage.
  if (env.HUNTER_API_KEY) {
    try {
      const r = await fetch(`https://api.hunter.io/v2/account?api_key=${env.HUNTER_API_KEY}`)
      const d = await r.json()
      const s = d?.data?.requests?.searches
      const v = d?.data?.requests?.verifications
      out.hunter = {
        configured: true,
        plan: d?.data?.plan_name || null,
        searches_used: s?.used ?? null,
        searches_available: s?.available ?? null,
        verifications_used: v?.used ?? null,
        verifications_available: v?.available ?? null,
      }
    } catch { out.hunter = { configured: true, error: true } }
  } else {
    out.hunter = { configured: false }
  }

  // Resend — no public usage endpoint; report configuration status only.
  out.resend = { configured: !!env.RESEND_API_KEY, note: 'no_usage_api' }

  return out
}

admin.get('/overview', async (c) => {
  const db = c.env.DB

  const [totalUsers, byPlan, recent, last30, reveals30] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM users').first(),
    db.prepare('SELECT plan, COUNT(*) AS n FROM users GROUP BY plan').all(),
    db.prepare(`SELECT id, email, name, company_name, plan, role, trial_expires_at, terms_accepted_at, created_at
                FROM users ORDER BY created_at DESC LIMIT 200`).all(),
    db.prepare("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now','-30 days')").first(),
    db.prepare("SELECT COUNT(*) AS n FROM email_reveals WHERE created_at >= datetime('now','-30 days')").first().catch(() => ({ n: 0 })),
  ])

  const planCount = { free: 0, pro: 0, growth: 0, team: 0 }
  for (const r of (byPlan.results || [])) planCount[r.plan] = r.n
  const paid = planCount.pro + planCount.growth + planCount.team

  const mrr = planCount.pro * PLAN_PRICE.pro + planCount.growth * PLAN_PRICE.growth + planCount.team * PLAN_PRICE.team

  const revealCount = reveals30?.n || 0
  const variableCost = revealCount * COST_PER_REVEAL
  const totalCost = variableCost + FIXED_MONTHLY_COST
  const margin = mrr - totalCost
  const marginPct = mrr > 0 ? Math.round((margin / mrr) * 100) : 0

  let orders = []
  try {
    const o = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all()
    orders = o.results || []
  } catch { /* orders table not migrated yet */ }

  const api = await fetchApiBalances(c.env)

  return c.json({
    users: {
      total: totalUsers?.n || 0,
      last_30_days: last30?.n || 0,
      by_plan: planCount,
      paid,
      list: recent.results || [],
    },
    revenue: { mrr, currency: 'USD' },
    cost: {
      variable: Number(variableCost.toFixed(2)),
      fixed: FIXED_MONTHLY_COST,
      total: Number(totalCost.toFixed(2)),
      reveals_30d: revealCount,
      cost_per_reveal: COST_PER_REVEAL,
    },
    margin: { amount: Number(margin.toFixed(2)), percent: marginPct },
    orders,
    api,
  })
})

// ─── GET /activity ── recent activity across all users ───────────────────────
admin.get('/activity', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '150', 10) || 150, 300)
  const rows = await c.env.DB.prepare(
    `SELECT a.id, a.module, a.action, a.title, a.created_at, u.email, u.name
     FROM activity_log a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT ?`
  ).bind(limit).all()
  return c.json({ activity: rows.results || [] })
})

// ─── POST /run-trial-reminders ── manual trigger for verification ────────────
admin.post('/run-trial-reminders', async (c) => {
  const { runTrialReminders } = await import('../lib/trial-reminders.js')
  const r = await runTrialReminders(c.env)
  return c.json(r)
})

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

  // The admin date inputs send date-only strings ("2026-07-28"); LemonSqueezy
  // requires full ISO 8601. Normalize once so LS and our DB store the same value
  // (start of day for starts_at, end of day for ends_at so the range is inclusive).
  const toIso = (d, endOfDay) => !d ? null : (String(d).includes('T') ? d : `${d}T${endOfDay ? '23:59:59' : '00:00:00'}Z`)
  const startsAt = toIso(b.starts_at, false)
  const endsAt = toIso(b.ends_at, true)

  // For discount types, create the LS discount first so DB only stores real ones.
  let lsId = null
  if (b.type === 'percent' || b.type === 'amount') {
    try {
      lsId = await createDiscount(c.env, {
        code, type: b.type, percent: b.percent, amount_cents: b.amount_cents,
        duration: b.duration === 'forever' ? 'forever' : 'once',
        starts_at: startsAt, ends_at: endsAt,
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
    b.redeem_window_days || null, eligible_plans, startsAt, endsAt,
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

export default admin
