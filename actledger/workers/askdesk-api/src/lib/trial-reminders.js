import { sendEmail, trialReminderEmail } from './mail.js'

// Send trial-ending reminders to free users: one ~24h before expiry and one
// ~1h before. Idempotent via reminder_24h_sent_at / reminder_1h_sent_at flags,
// so it is safe to run on any cron cadence without duplicate emails.
export async function runTrialReminders(env) {
  const db = env.DB
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const in1h = new Date(now + 60 * 60 * 1000).toISOString()
  const in24h = new Date(now + 24 * 60 * 60 * 1000).toISOString()

  let sent24 = 0
  let sent1 = 0

  // 24h reminder: trial ends between 1h and 24h from now, not yet reminded.
  const rows24 = await db.prepare(
    `SELECT id, email, name FROM users
     WHERE plan = 'free' AND trial_expires_at IS NOT NULL
       AND trial_expires_at > ? AND trial_expires_at <= ?
       AND reminder_24h_sent_at IS NULL`
  ).bind(in1h, in24h).all()
  for (const u of (rows24.results || [])) {
    const mail = trialReminderEmail(u.name || 'Kullanıcı', '24h')
    const res = await sendEmail(env, { to: u.email, ...mail })
    if (res.ok) {
      await db.prepare('UPDATE users SET reminder_24h_sent_at = ? WHERE id = ?').bind(nowIso, u.id).run()
      sent24++
    }
  }

  // 1h reminder: trial ends within the next hour, not yet reminded.
  const rows1 = await db.prepare(
    `SELECT id, email, name FROM users
     WHERE plan = 'free' AND trial_expires_at IS NOT NULL
       AND trial_expires_at > ? AND trial_expires_at <= ?
       AND reminder_1h_sent_at IS NULL`
  ).bind(nowIso, in1h).all()
  for (const u of (rows1.results || [])) {
    const mail = trialReminderEmail(u.name || 'Kullanıcı', '1h')
    const res = await sendEmail(env, { to: u.email, ...mail })
    if (res.ok) {
      await db.prepare('UPDATE users SET reminder_1h_sent_at = ? WHERE id = ?').bind(nowIso, u.id).run()
      sent1++
    }
  }

  return { sent24, sent1 }
}
