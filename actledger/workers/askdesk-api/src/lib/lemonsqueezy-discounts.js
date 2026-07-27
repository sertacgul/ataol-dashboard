import { LS_API, LS_STORE_ID } from './billing-config.js'

// Note: the LS discount is created store-wide (is_limited_to_products: false).
// eligible_plans is enforced by us for free_month vouchers; percent/amount
// discount codes apply to any plan at checkout.
export function buildDiscountPayload(code, testMode) {
  const attrs = {
    name: code.code,
    code: code.code,
    amount: code.type === 'amount' ? code.amount_cents : code.percent,
    amount_type: code.type === 'amount' ? 'fixed' : 'percent',
    duration: code.duration || 'once',
    is_limited_to_products: false,
    is_limited_redemptions: code.max_redemptions != null,
    test_mode: testMode,
  }
  if (code.max_redemptions != null) attrs.max_redemptions = code.max_redemptions
  if (code.starts_at) attrs.starts_at = code.starts_at
  if (code.ends_at) attrs.expires_at = code.ends_at
  return {
    data: {
      type: 'discounts',
      attributes: attrs,
      relationships: { store: { data: { type: 'stores', id: String(LS_STORE_ID) } } },
    },
  }
}

export async function createDiscount(env, code) {
  const testMode = env.LEMONSQUEEZY_LIVE !== 'true'
  const payload = buildDiscountPayload(code, testMode)
  const res = await fetch(`${LS_API}/discounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.errors?.[0]?.detail || 'LS indirim oluşturulamadı')
  return data.data?.id || null
}

export async function deactivateDiscount(env, lsDiscountId) {
  if (!lsDiscountId) return
  await fetch(`${LS_API}/discounts/${lsDiscountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`, Accept: 'application/vnd.api+json' },
  }).catch(() => {})
}
