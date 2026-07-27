import { setPlanAndReset } from './credits.js'

const PAID_PLANS = ['pro', 'growth', 'team']

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

export function isCodeUsable(row, nowMs) {
  if (!row || !row.active) return false
  if (row.starts_at && Date.parse(row.starts_at) > nowMs) return false
  if (row.ends_at && Date.parse(row.ends_at) < nowMs) return false
  if (row.max_redemptions != null && row.redemptions_count >= row.max_redemptions) return false
  return true
}

export function eligiblePlans(row) {
  if (!row || row.eligible_plans === 'all' || row.eligible_plans == null) return [...PAID_PLANS]
  try {
    const arr = JSON.parse(row.eligible_plans)
    return Array.isArray(arr) ? arr : [...PAID_PLANS]
  } catch {
    return [...PAID_PLANS]
  }
}

export function isPlanEligible(row, plan) {
  return eligiblePlans(row).includes(plan)
}

function addDays(iso, days) {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
function addMonths(iso, months) {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString()
}

export async function getActiveCode(db, rawCode, nowMs = Date.now()) {
  const code = normalizeCode(rawCode)
  if (!code) return null
  const row = await db.prepare('SELECT * FROM campaign_codes WHERE code = ?').bind(code).first()
  if (!row) return null
  return isCodeUsable(row, nowMs) ? row : null
}

export async function redeemForUser(db, codeRow, userId, nowIso = new Date().toISOString()) {
  const existing = await db.prepare('SELECT * FROM campaign_redemptions WHERE code_id = ? AND user_id = ?')
    .bind(codeRow.id, userId).first()
  if (existing) throw new Error('Bu kodu zaten kullandınız')

  const id = crypto.randomUUID()
  let redeemExpires = null
  if (codeRow.type === 'free_month') {
    redeemExpires = addDays(nowIso, codeRow.redeem_window_days || 90)
  }
  await db.prepare(
    `INSERT INTO campaign_redemptions (id, code_id, code, user_id, type, status, redeem_expires_at)
     VALUES (?, ?, ?, ?, ?, 'redeemed', ?)`
  ).bind(id, codeRow.id, codeRow.code, userId, codeRow.type, redeemExpires).run()

  await db.prepare('UPDATE campaign_codes SET redemptions_count = redemptions_count + 1 WHERE id = ?')
    .bind(codeRow.id).run()

  if (codeRow.type === 'percent' || codeRow.type === 'amount') {
    const discExpires = codeRow.ends_at || addMonths(nowIso, 12)
    await db.prepare('UPDATE users SET discount_percent = ?, discount_expires_at = ?, discount_code = ? WHERE id = ?')
      .bind(codeRow.percent || 0, discExpires, codeRow.code, userId).run()
  }

  return { type: codeRow.type, code: codeRow.code, redeem_expires_at: redeemExpires }
}

export async function activateVoucher(db, userId, plan, nowIso = new Date().toISOString()) {
  const voucher = await db.prepare(
    "SELECT * FROM campaign_redemptions WHERE user_id = ? AND type = 'free_month' AND status = 'redeemed' ORDER BY created_at DESC LIMIT 1"
  ).bind(userId).first()
  if (!voucher) throw new Error('Aktifleştirilecek bir voucher bulunamadı')
  if (voucher.redeem_expires_at && Date.parse(voucher.redeem_expires_at) < Date.parse(nowIso)) {
    throw new Error('Voucher süresi doldu')
  }
  const codeRow = await db.prepare('SELECT * FROM campaign_codes WHERE code = ?').bind(voucher.code).first()
  if (!isPlanEligible(codeRow || { eligible_plans: 'all' }, plan)) {
    throw new Error('Bu voucher seçtiğiniz paket için uygun değil')
  }
  const freeUntil = addMonths(nowIso, (codeRow?.free_months) || 1)

  await setPlanAndReset(db, userId, plan)
  await db.prepare('UPDATE users SET plan_expires_at = ?, plan_source = ? WHERE id = ?')
    .bind(freeUntil, 'campaign', userId).run()
  await db.prepare("UPDATE campaign_redemptions SET status = 'activated', activated_at = ?, plan_granted = ?, free_until = ? WHERE id = ?")
    .bind(nowIso, plan, freeUntil, voucher.id).run()

  return { plan, free_until: freeUntil }
}
