// Two credit pools per user: "outreach" (reveal, AI email, lead) and
// "content" (SEO, social). Limits come from the plan; usage is tracked per pool.
const PLAN_CREDITS = {
  free:   { outreach: 25,  content: 5 },
  pro:    { outreach: 300, content: 10 },
  growth: { outreach: 750, content: 25 },
  team:   { outreach: 300, content: 10 },
}

export { PLAN_CREDITS }

// Back-compat: outreach limit per plan (legacy callers importing PLAN_LIMITS).
export const PLAN_LIMITS = { free: 25, pro: 300, growth: 750, team: 300 }

export function getNextResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().split('T')[0]
}

function planCredits(plan) {
  return PLAN_CREDITS[plan] || PLAN_CREDITS.free
}

export async function getOrCreateCredits(db, userId, plan) {
  let row = await db.prepare('SELECT * FROM user_credits WHERE user_id = ?').bind(userId).first()
  if (!row) {
    const resetDate = getNextResetDate()
    await db.prepare('INSERT INTO user_credits (user_id, monthly_limit, used_this_month, reset_date, outreach_used, content_used) VALUES (?, ?, 0, ?, 0, 0)')
      .bind(userId, planCredits(plan).outreach, resetDate).run()
    row = { user_id: userId, outreach_used: 0, content_used: 0, reset_date: resetDate, used_this_month: 0 }
  }
  // One-time shim: carry a legacy single-pool balance into the outreach pool.
  if ((row.outreach_used == null || row.outreach_used === 0) && row.used_this_month > 0) {
    row.outreach_used = row.used_this_month
  }
  // Monthly reset: zero both pools.
  if (new Date(row.reset_date) <= new Date()) {
    const newReset = getNextResetDate()
    await db.prepare('UPDATE user_credits SET outreach_used = 0, content_used = 0, used_this_month = 0, reset_date = ? WHERE user_id = ?')
      .bind(newReset, userId).run()
    row.outreach_used = 0; row.content_used = 0; row.reset_date = newReset
  }
  return {
    outreach_used: row.outreach_used || 0,
    content_used: row.content_used || 0,
    reset_date: row.reset_date,
    plan,
    limits: planCredits(plan),
  }
}

export function hasCredits(credits, type, amount = 1) {
  const limit = credits.limits?.[type] ?? 0
  const used = credits[type + '_used'] ?? 0
  return (limit - used) >= amount
}

export async function deductCredit(db, userId, type, amount = 1) {
  const col = type === 'content' ? 'content_used' : 'outreach_used'
  await db.prepare(`UPDATE user_credits SET ${col} = ${col} + ? WHERE user_id = ?`).bind(amount, userId).run()
}

// Grant credits (e.g. pay-as-you-go top-up) by reducing used, floored at 0.
export async function addCredits(db, userId, type, amount) {
  const col = type === 'content' ? 'content_used' : 'outreach_used'
  await db.prepare(`UPDATE user_credits SET ${col} = MAX(0, ${col} - ?) WHERE user_id = ?`).bind(amount, userId).run()
}

export async function checkCredits(c, type, amount = 1) {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const credits = await getOrCreateCredits(c.env.DB, userId, user?.plan || 'free')
  return { ok: hasCredits(credits, type, amount), userId, credits }
}
