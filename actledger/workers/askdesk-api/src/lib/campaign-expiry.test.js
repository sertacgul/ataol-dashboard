import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCampaignExpiry } from './campaign-expiry.js'
import { setPlanAndReset } from './credits.js'

vi.mock('./credits.js', () => ({ setPlanAndReset: vi.fn().mockResolvedValue(undefined) }))

function fakeDb(expiredUsers, expiredVouchers) {
  const calls = []
  return {
    calls,
    prepare(sql) {
      const q = sql.replace(/\s+/g, ' ').trim()
      return {
        _a: [],
        bind(...a) { this._a = a; return this },
        async all() {
          if (q.startsWith('SELECT id FROM users WHERE plan_source')) return { results: expiredUsers }
          if (q.startsWith('SELECT id FROM campaign_redemptions')) return { results: expiredVouchers }
          return { results: [] }
        },
        async run() { calls.push({ q, a: this._a }); return { success: true } },
      }
    },
  }
}

describe('runCampaignExpiry', () => {
  beforeEach(() => { setPlanAndReset.mockClear() })

  it('reverts an expired campaign-plan user back to free and clears markers', async () => {
    const db = fakeDb([{ id: 42 }], [])
    await runCampaignExpiry({ DB: db })

    expect(setPlanAndReset).toHaveBeenCalledWith(db, 42, 'free')
    const cleared = db.calls.find((c) => c.q.includes('plan_expires_at = NULL') && c.a.includes(42))
    expect(cleared).toBeTruthy()
  })

  it('expires an un-activated voucher whose redeem window passed', async () => {
    const db = fakeDb([], [{ id: 7 }])
    await runCampaignExpiry({ DB: db })

    const expired = db.calls.find((c) => c.q.includes("status = 'expired'") && c.a.includes(7))
    expect(expired).toBeTruthy()
  })
})
