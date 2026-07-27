import { setPlanAndReset } from './credits.js'

// Runs on the 15-min cron. (1) Reverts users whose campaign free month ended
// back to free. (2) Expires banked vouchers whose redeem window passed.
export async function runCampaignExpiry(env) {
  const db = env.DB
  const now = new Date().toISOString()

  const expiredPlans = await db.prepare(
    "SELECT id FROM users WHERE plan_source = 'campaign' AND plan_expires_at IS NOT NULL AND plan_expires_at <= ?"
  ).bind(now).all()
  for (const u of (expiredPlans.results || [])) {
    await setPlanAndReset(db, u.id, 'free')
    await db.prepare('UPDATE users SET plan_expires_at = NULL, plan_source = NULL WHERE id = ?').bind(u.id).run()
    await db.prepare("UPDATE campaign_redemptions SET status = 'expired' WHERE user_id = ? AND status = 'activated'").bind(u.id).run()
  }

  const expiredVouchers = await db.prepare(
    "SELECT id FROM campaign_redemptions WHERE type = 'free_month' AND status = 'redeemed' AND redeem_expires_at IS NOT NULL AND redeem_expires_at <= ?"
  ).bind(now).all()
  for (const r of (expiredVouchers.results || [])) {
    await db.prepare("UPDATE campaign_redemptions SET status = 'expired' WHERE id = ?").bind(r.id).run()
  }
}
