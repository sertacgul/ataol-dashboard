import { describe, it, expect, vi, beforeEach } from 'vitest'

// setPlanAndReset touches user_credits; mocking it keeps the fake DB focused on
// the campaigns tables only.
vi.mock('./credits.js', () => ({ setPlanAndReset: vi.fn().mockResolvedValue(undefined) }))

import { setPlanAndReset } from './credits.js'
import {
  normalizeCode,
  isCodeUsable,
  eligiblePlans,
  isPlanEligible,
  getActiveCode,
  redeemForUser,
  activateVoucher,
} from './campaigns.js'

const norm = (sql) => sql.replace(/\s+/g, ' ').trim()

// Hand-rolled in-memory fake D1. State:
//   codes: array of campaign_codes rows (keyed logically by code / id)
//   redemptions: array of campaign_redemptions rows
//   users: { [id]: row }
function makeDb(initial = {}) {
  const state = {
    codes: initial.codes ? initial.codes.map((c) => ({ ...c })) : [],
    redemptions: initial.redemptions ? initial.redemptions.map((r) => ({ ...r })) : [],
    users: initial.users ? { ...initial.users } : {},
    _seq: 0,
  }

  const db = {
    _state: state,
    prepare(rawSql) {
      const sql = norm(rawSql)
      let args = []
      const stmt = {
        bind(...a) {
          args = a
          return stmt
        },
        async first() {
          if (sql === 'SELECT * FROM campaign_codes WHERE code = ?') {
            const [code] = args
            return state.codes.find((c) => c.code === code) || null
          }
          if (sql === 'SELECT * FROM campaign_redemptions WHERE code_id = ? AND user_id = ?') {
            const [codeId, userId] = args
            return state.redemptions.find((r) => r.code_id === codeId && r.user_id === userId) || null
          }
          if (
            sql ===
            "SELECT * FROM campaign_redemptions WHERE user_id = ? AND type = 'free_month' AND status = 'redeemed' ORDER BY created_at DESC LIMIT 1"
          ) {
            const [userId] = args
            const matches = state.redemptions
              .filter((r) => r.user_id === userId && r.type === 'free_month' && r.status === 'redeemed')
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) // DESC
            return matches[0] || null
          }
          throw new Error('Unexpected first() SQL: ' + sql)
        },
        async run() {
          if (
            sql ===
            'INSERT INTO campaign_redemptions (id, code_id, code, user_id, type, status, redeem_expires_at) VALUES (?, ?, ?, ?, ?, \'redeemed\', ?)'
          ) {
            const [id, codeId, code, userId, type, redeemExpires] = args
            state.redemptions.push({
              id,
              code_id: codeId,
              code,
              user_id: userId,
              type,
              status: 'redeemed',
              redeem_expires_at: redeemExpires,
              created_at: `seq-${String(state._seq++).padStart(6, '0')}`,
            })
            return { success: true }
          }
          if (sql === 'UPDATE campaign_codes SET redemptions_count = redemptions_count + 1 WHERE id = ?') {
            const [id] = args
            const row = state.codes.find((c) => c.id === id)
            if (row) row.redemptions_count = (row.redemptions_count || 0) + 1
            return { success: true }
          }
          if (
            sql ===
            'UPDATE users SET discount_percent = ?, discount_expires_at = ?, discount_code = ? WHERE id = ?'
          ) {
            const [pct, exp, code, id] = args
            state.users[id] = { ...(state.users[id] || { id }), discount_percent: pct, discount_expires_at: exp, discount_code: code }
            return { success: true }
          }
          if (sql === 'UPDATE users SET plan_expires_at = ?, plan_source = ? WHERE id = ?') {
            const [exp, source, id] = args
            state.users[id] = { ...(state.users[id] || { id }), plan_expires_at: exp, plan_source: source }
            return { success: true }
          }
          if (
            sql ===
            "UPDATE campaign_redemptions SET status = 'activated', activated_at = ?, plan_granted = ?, free_until = ? WHERE id = ?"
          ) {
            const [activatedAt, planGranted, freeUntil, id] = args
            const row = state.redemptions.find((r) => r.id === id)
            if (row) {
              row.status = 'activated'
              row.activated_at = activatedAt
              row.plan_granted = planGranted
              row.free_until = freeUntil
            }
            return { success: true }
          }
          throw new Error('Unexpected run() SQL: ' + sql)
        },
      }
      return stmt
    },
  }
  return db
}

const NOW_ISO = '2026-07-27T12:00:00Z'
const NOW_MS = Date.parse(NOW_ISO)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode('  welcome10  ')).toBe('WELCOME10')
  })
  it('returns empty string for nullish', () => {
    expect(normalizeCode(null)).toBe('')
    expect(normalizeCode(undefined)).toBe('')
  })
})

describe('isCodeUsable', () => {
  const base = { active: 1, starts_at: null, ends_at: null, max_redemptions: null, redemptions_count: 0 }
  it('usable when active with no windows', () => {
    expect(isCodeUsable(base, NOW_MS)).toBe(true)
  })
  it('false when inactive', () => {
    expect(isCodeUsable({ ...base, active: 0 }, NOW_MS)).toBe(false)
  })
  it('false when null row', () => {
    expect(isCodeUsable(null, NOW_MS)).toBe(false)
  })
  it('false before starts_at', () => {
    expect(isCodeUsable({ ...base, starts_at: '2026-08-01T00:00:00Z' }, NOW_MS)).toBe(false)
  })
  it('false after ends_at', () => {
    expect(isCodeUsable({ ...base, ends_at: '2026-07-01T00:00:00Z' }, NOW_MS)).toBe(false)
  })
  it('true within window', () => {
    expect(
      isCodeUsable({ ...base, starts_at: '2026-07-01T00:00:00Z', ends_at: '2026-08-01T00:00:00Z' }, NOW_MS)
    ).toBe(true)
  })
  it('false when max redemptions reached', () => {
    expect(isCodeUsable({ ...base, max_redemptions: 5, redemptions_count: 5 }, NOW_MS)).toBe(false)
  })
  it('true when under max redemptions', () => {
    expect(isCodeUsable({ ...base, max_redemptions: 5, redemptions_count: 4 }, NOW_MS)).toBe(true)
  })
})

describe('eligiblePlans / isPlanEligible', () => {
  it("'all' returns the three paid plans", () => {
    expect(eligiblePlans({ eligible_plans: 'all' })).toEqual(['pro', 'growth', 'team'])
  })
  it('null returns the three paid plans', () => {
    expect(eligiblePlans({ eligible_plans: null })).toEqual(['pro', 'growth', 'team'])
  })
  it('invalid JSON falls back to paid plans', () => {
    expect(eligiblePlans({ eligible_plans: 'not json' })).toEqual(['pro', 'growth', 'team'])
  })
  it('parses a JSON array', () => {
    expect(eligiblePlans({ eligible_plans: '["pro"]' })).toEqual(['pro'])
  })
  it('membership check', () => {
    expect(isPlanEligible({ eligible_plans: '["pro"]' }, 'pro')).toBe(true)
    expect(isPlanEligible({ eligible_plans: '["pro"]' }, 'growth')).toBe(false)
  })
})

describe('getActiveCode', () => {
  it('returns a usable code', async () => {
    const db = makeDb({
      codes: [{ id: 'c1', code: 'WELCOME10', active: 1, redemptions_count: 0, max_redemptions: null }],
    })
    const row = await getActiveCode(db, ' welcome10 ', NOW_MS)
    expect(row?.id).toBe('c1')
  })
  it('returns null for unknown code', async () => {
    const db = makeDb({ codes: [] })
    expect(await getActiveCode(db, 'NOPE', NOW_MS)).toBeNull()
  })
  it('returns null for empty code without querying', async () => {
    const db = makeDb({ codes: [] })
    expect(await getActiveCode(db, '   ', NOW_MS)).toBeNull()
  })
  it('returns null for an expired code', async () => {
    const db = makeDb({
      codes: [
        { id: 'c1', code: 'OLD', active: 1, redemptions_count: 0, max_redemptions: null, ends_at: '2026-07-01T00:00:00Z' },
      ],
    })
    expect(await getActiveCode(db, 'OLD', NOW_MS)).toBeNull()
  })
})

describe('redeemForUser', () => {
  it('banks a free_month voucher and increments redemptions_count', async () => {
    const codeRow = {
      id: 'c1',
      code: 'FREEMO',
      type: 'free_month',
      redeem_window_days: 90,
      free_months: 1,
      redemptions_count: 0,
    }
    const db = makeDb({ codes: [codeRow] })
    const res = await redeemForUser(db, codeRow, 'u1', NOW_ISO)
    expect(res).toEqual({
      type: 'free_month',
      code: 'FREEMO',
      redeem_expires_at: '2026-10-25T12:00:00.000Z',
      discount_expires_at: null,
    })
    const red = db._state.redemptions[0]
    expect(red.user_id).toBe('u1')
    expect(red.status).toBe('redeemed')
    expect(red.redeem_expires_at).toBe('2026-10-25T12:00:00.000Z')
    expect(db._state.codes[0].redemptions_count).toBe(1)
  })

  it('writes discount columns for a percent code', async () => {
    const codeRow = {
      id: 'c2',
      code: 'SAVE20',
      type: 'percent',
      percent: 20,
      ends_at: '2026-12-31T00:00:00Z',
      redemptions_count: 0,
    }
    const db = makeDb({ codes: [codeRow] })
    const res = await redeemForUser(db, codeRow, 'u1', NOW_ISO)
    expect(res.redeem_expires_at).toBeNull()
    const user = db._state.users['u1']
    expect(user.discount_percent).toBe(20)
    expect(user.discount_code).toBe('SAVE20')
    expect(user.discount_expires_at).toBe('2026-12-31T00:00:00Z')
    expect(db._state.codes[0].redemptions_count).toBe(1)
  })

  it('throws /zaten/ on a second redemption by the same user', async () => {
    const codeRow = { id: 'c1', code: 'FREEMO', type: 'free_month', redeem_window_days: 90, redemptions_count: 0 }
    const db = makeDb({ codes: [codeRow] })
    await redeemForUser(db, codeRow, 'u1', NOW_ISO)
    await expect(redeemForUser(db, codeRow, 'u1', NOW_ISO)).rejects.toThrow(/zaten/)
  })
})

describe('activateVoucher', () => {
  function dbWithVoucher(overrides = {}) {
    return makeDb({
      codes: [
        { id: 'c1', code: 'FREEMO', type: 'free_month', free_months: 1, eligible_plans: 'all', redemptions_count: 1 },
      ],
      redemptions: [
        {
          id: 'r1',
          code_id: 'c1',
          code: 'FREEMO',
          user_id: 'u1',
          type: 'free_month',
          status: 'redeemed',
          redeem_expires_at: '2026-10-25T12:00:00.000Z',
          created_at: 'seq-000000',
          ...overrides,
        },
      ],
    })
  }

  it('grants the chosen plan for one month', async () => {
    const db = dbWithVoucher()
    const res = await activateVoucher(db, 'u1', 'growth', NOW_ISO)
    expect(res).toEqual({ plan: 'growth', free_until: '2026-08-27T12:00:00.000Z' })
    expect(setPlanAndReset).toHaveBeenCalledWith(db, 'u1', 'growth')
    expect(db._state.users['u1'].plan_source).toBe('campaign')
    expect(db._state.users['u1'].plan_expires_at).toBe('2026-08-27T12:00:00.000Z')
    const red = db._state.redemptions[0]
    expect(red.status).toBe('activated')
    expect(red.plan_granted).toBe('growth')
    expect(red.free_until).toBe('2026-08-27T12:00:00.000Z')
    expect(red.activated_at).toBe(NOW_ISO)
  })

  it('throws /voucher/ when no banked voucher', async () => {
    const db = makeDb({ codes: [], redemptions: [] })
    await expect(activateVoucher(db, 'u1', 'growth', NOW_ISO)).rejects.toThrow(/voucher/)
  })

  it('throws /doldu/ when the redeem window has passed', async () => {
    const db = dbWithVoucher({ redeem_expires_at: '2026-07-01T00:00:00.000Z' })
    await expect(activateVoucher(db, 'u1', 'growth', NOW_ISO)).rejects.toThrow(/doldu/)
  })

  it('throws /uygun/ for an ineligible plan', async () => {
    const db = makeDb({
      codes: [
        { id: 'c1', code: 'FREEMO', type: 'free_month', free_months: 1, eligible_plans: '["pro"]', redemptions_count: 1 },
      ],
      redemptions: [
        {
          id: 'r1',
          code_id: 'c1',
          code: 'FREEMO',
          user_id: 'u1',
          type: 'free_month',
          status: 'redeemed',
          redeem_expires_at: '2026-10-25T12:00:00.000Z',
          created_at: 'seq-000000',
        },
      ],
    })
    await expect(activateVoucher(db, 'u1', 'team', NOW_ISO)).rejects.toThrow(/uygun/)
  })
})
