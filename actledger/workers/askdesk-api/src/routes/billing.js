import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { setPlanAndReset, addCredits } from '../lib/credits.js'
import { LS_API, LS_STORE_ID, LS_DISCOUNT_CODE, VARIANTS } from '../lib/billing-config.js'

const billing = new Hono()

// ─── POST /checkout (authed) — create a Lemon Squeezy checkout URL ───────────
billing.post('/checkout', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { variant_id } = await c.req.json()
  const variant = VARIANTS[String(variant_id)]
  if (!variant) return c.json({ error: 'Geçersiz paket' }, 400)

  const apiKey = c.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) return c.json({ error: 'Ödeme sistemi yapılandırılmamış' }, 500)

  const user = await c.env.DB.prepare('SELECT email, discount_percent, discount_expires_at FROM users WHERE id = ?')
    .bind(userId).first()

  const checkoutData = { email: user?.email || undefined, custom: { user_id: userId } }
  // Apply the launch discount if the user redeemed it and it hasn't expired.
  if (user?.discount_percent && user.discount_expires_at && new Date(user.discount_expires_at) > new Date()) {
    checkoutData.discount_code = LS_DISCOUNT_CODE
  }

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: checkoutData,
        product_options: { redirect_url: 'https://askdesk.app/app/settings?billing=success' },
        test_mode: c.env.LEMONSQUEEZY_LIVE !== 'true',
      },
      relationships: {
        store: { data: { type: 'stores', id: String(LS_STORE_ID) } },
        variant: { data: { type: 'variants', id: String(variant_id) } },
      },
    },
  }

  const res = await fetch(`${LS_API}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    return c.json({ error: data.errors?.[0]?.detail || 'Checkout oluşturulamadı' }, 500)
  }
  return c.json({ url: data.data?.attributes?.url })
})

// ─── POST /webhook (public, signature-verified) ──────────────────────────────
async function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('')
  // constant-time-ish compare
  if (hex.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

async function logOrder(db, { userId, email, event, plan, pack, amount, currency }) {
  try {
    await db.prepare(
      `INSERT INTO orders (id, user_id, email, event, plan, pack, amount, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, email || null, event, plan || null, pack || null,
      amount ?? null, currency || 'USD').run()
  } catch { /* orders table not migrated yet; ignore */ }
}

billing.post('/webhook', async (c) => {
  const raw = await c.req.text()
  const signature = c.req.header('X-Signature') || ''
  const ok = await verifySignature(raw, signature, c.env.LEMON_WEBHOOK_SECRET)
  if (!ok) return c.json({ error: 'invalid signature' }, 401)

  let body
  try { body = JSON.parse(raw) } catch { return c.json({ error: 'bad json' }, 400) }

  const event = body?.meta?.event_name
  const userId = body?.meta?.custom_data?.user_id
  const attrs = body?.data?.attributes || {}
  if (!userId) return c.json({ ok: true }) // nothing to attribute

  try {
    if (event === 'subscription_created' || event === 'subscription_updated') {
      const variant = VARIANTS[String(attrs.variant_id)]
      const status = attrs.status
      if (variant?.plan && (status === 'active' || status === 'on_trial')) {
        await setPlanAndReset(c.env.DB, userId, variant.plan)
        if (event === 'subscription_created') {
          await logOrder(c.env.DB, { userId, email: attrs.user_email, event, plan: variant.plan, amount: attrs.total != null ? attrs.total / 100 : null, currency: attrs.currency })
        }
      } else if (status === 'expired' || status === 'unpaid') {
        await setPlanAndReset(c.env.DB, userId, 'free')
      }
    } else if (event === 'subscription_expired' || event === 'subscription_cancelled') {
      // cancelled subscriptions stay active until period end; only drop on expiry.
      if (event === 'subscription_expired') await setPlanAndReset(c.env.DB, userId, 'free')
    } else if (event === 'order_created') {
      const variantId = attrs.first_order_item?.variant_id
      const variant = VARIANTS[String(variantId)]
      if (variant?.kind === 'onetime') {
        await addCredits(c.env.DB, userId, variant.pool, variant.amount)
        await logOrder(c.env.DB, { userId, email: attrs.user_email, event, pack: `${variant.pool}+${variant.amount}`, amount: attrs.total != null ? attrs.total / 100 : null, currency: attrs.currency })
      }
    }
  } catch { /* never fail the webhook on a downstream error */ }

  return c.json({ ok: true })
})

export default billing
