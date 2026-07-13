const PLAN_LIMITS = { free: 10, pro: 250, growth: 600, team: 600 }

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

export async function checkCredits(c, amount = 1) {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare('SELECT plan FROM users WHERE id = ?').bind(userId).first()
  const credits = await getOrCreateCredits(c.env.DB, userId, user?.plan || 'free')
  return { ok: hasCredits(credits, amount), userId, credits }
}
