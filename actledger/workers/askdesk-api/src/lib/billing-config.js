// Lemon Squeezy billing configuration for the AskDesk store.
export const LS_API = 'https://api.lemonsqueezy.com/v1'
export const LS_STORE_ID = '281912'
export const LS_DISCOUNT_CODE = 'LAUNCH50' // 50% launch discount (LS discount id 1058288)

// variant_id -> what a purchase of that variant grants.
export const VARIANTS = {
  // Subscriptions (plan set on the user; credits come from PLAN_CREDITS[plan]).
  '1904790': { kind: 'subscription', plan: 'pro',    interval: 'month' },
  '1904803': { kind: 'subscription', plan: 'pro',    interval: 'year' },
  '1904815': { kind: 'subscription', plan: 'growth', interval: 'month' },
  '1904807': { kind: 'subscription', plan: 'growth', interval: 'year' },
  '1904872': { kind: 'subscription', plan: 'team',   interval: 'month' },
  '1904858': { kind: 'subscription', plan: 'team',   interval: 'year' },
  // One-time pay-as-you-go packs (top up the outreach pool).
  '1904911': { kind: 'onetime', pool: 'outreach', amount: 40 },
  '1904915': { kind: 'onetime', pool: 'outreach', amount: 200 },
  '1904921': { kind: 'onetime', pool: 'outreach', amount: 1000 },
}
