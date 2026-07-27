import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildDiscountPayload, createDiscount } from './lemonsqueezy-discounts.js'
import { LS_STORE_ID } from './billing-config.js'

afterEach(() => { vi.restoreAllMocks() })

function mockFetch(json, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok, status, json: async () => json,
  })
  return globalThis.fetch
}

describe('buildDiscountPayload', () => {
  it('maps a percent code', () => {
    const payload = buildDiscountPayload(
      { code: 'SAVE20', type: 'percent', percent: 20, duration: 'repeating' },
      true,
    )
    const attrs = payload.data.attributes
    expect(payload.data.type).toBe('discounts')
    expect(attrs.name).toBe('SAVE20')
    expect(attrs.code).toBe('SAVE20')
    expect(attrs.amount_type).toBe('percent')
    expect(attrs.amount).toBe(20)
    expect(attrs.duration).toBe('repeating')
    expect(attrs.test_mode).toBe(true)
    expect(attrs.is_limited_to_products).toBe(false)
    expect(attrs.is_limited_redemptions).toBe(false)
    expect(payload.data.relationships.store.data.id).toBe(String(LS_STORE_ID))
  })

  it('maps a fixed/amount code with test_mode false', () => {
    const payload = buildDiscountPayload(
      { code: 'TENOFF', type: 'amount', amount_cents: 1000 },
      false,
    )
    const attrs = payload.data.attributes
    expect(attrs.amount_type).toBe('fixed')
    expect(attrs.amount).toBe(1000)
    expect(attrs.test_mode).toBe(false)
    expect(attrs.duration).toBe('once')
  })

  it('sets is_limited_redemptions + max_redemptions when max_redemptions given', () => {
    const attrs = buildDiscountPayload(
      { code: 'C', type: 'percent', percent: 5, max_redemptions: 100 },
      true,
    ).data.attributes
    expect(attrs.is_limited_redemptions).toBe(true)
    expect(attrs.max_redemptions).toBe(100)
  })

  it('maps starts_at/ends_at to starts_at/expires_at', () => {
    const attrs = buildDiscountPayload(
      { code: 'C', type: 'percent', percent: 5, starts_at: '2026-01-01', ends_at: '2026-02-01' },
      true,
    ).data.attributes
    expect(attrs.starts_at).toBe('2026-01-01')
    expect(attrs.expires_at).toBe('2026-02-01')
  })
})

describe('createDiscount', () => {
  it('returns the created discount id on success', async () => {
    const fetchMock = mockFetch({ data: { id: '9999' } })
    const env = { LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_LIVE: 'true' }
    const id = await createDiscount(env, { code: 'X', type: 'percent', percent: 10 })
    expect(id).toBe('9999')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends test_mode:false when LEMONSQUEEZY_LIVE === "true"', async () => {
    const fetchMock = mockFetch({ data: { id: '1' } })
    const env = { LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_LIVE: 'true' }
    await createDiscount(env, { code: 'X', type: 'percent', percent: 10 })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data.attributes.test_mode).toBe(false)
  })

  it('rejects with the LS error detail on non-ok', async () => {
    mockFetch({ errors: [{ detail: 'bad' }] }, false, 422)
    const env = { LEMONSQUEEZY_API_KEY: 'k', LEMONSQUEEZY_LIVE: 'true' }
    await expect(createDiscount(env, { code: 'X', type: 'percent', percent: 10 }))
      .rejects.toThrow(/bad/)
  })
})
