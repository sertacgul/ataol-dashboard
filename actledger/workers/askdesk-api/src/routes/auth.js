import { Hono } from 'hono'
import { createToken } from '../middleware/auth.js'

const auth = new Hono()

const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.com.tr', 'yandex.com', 'yandex.com.tr',
  'mail.com', 'protonmail.com', 'proton.me', 'icloud.com', 'me.com',
  'aol.com', 'zoho.com', 'gmx.com', 'gmx.de', 'mail.ru',
  'inbox.com', 'fastmail.com', 'tutanota.com', 'tuta.com',
  'msn.com', 'windowslive.com', 'mynet.com', 'superonline.com',
]

function getEmailDomain(email) {
  return email.split('@')[1]?.toLowerCase()
}

function isFreeEmailDomain(domain) {
  return FREE_EMAIL_DOMAINS.includes(domain)
}

// Password hashing using SHA-256 + salt (Workers-compatible)
function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const data = new TextEncoder().encode(salt + password)
  const hash = toHex(await crypto.subtle.digest('SHA-256', data))
  return salt + ':' + hash
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const data = new TextEncoder().encode(salt + password)
  const computed = toHex(await crypto.subtle.digest('SHA-256', data))
  return hash === computed
}

auth.post('/register', async (c) => {
  const { email, password, name, company_name } = await c.req.json()
  if (!email || !password || !name) {
    return c.json({ error: 'Email, şifre ve isim gerekli' }, 400)
  }

  const domain = getEmailDomain(email)
  if (!domain) return c.json({ error: 'Geçersiz email adresi' }, 400)

  if (isFreeEmailDomain(domain)) {
    return c.json({ error: 'Lütfen kurumsal email adresinizi kullanın. Gmail, Hotmail, Yahoo gibi kişisel email adresleri kabul edilmemektedir.' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Bu email zaten kayıtlı' }, 409)

  // Check if this domain already has a free account
  const domainUser = await c.env.DB.prepare(
    "SELECT id FROM users WHERE email_domain = ? AND plan = 'free'"
  ).bind(domain).first()
  if (domainUser) {
    return c.json({ error: 'Bu domain ile zaten bir ücretsiz hesap bulunuyor. Lütfen mevcut hesabınıza giriş yapın veya bir ücretli plana geçiş yapın.' }, 409)
  }

  const id = crypto.randomUUID()
  const password_hash = await hashPassword(password)
  const trialExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, company_name, role, email_domain, plan, trial_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, company_name || null, 'member', domain, 'free', trialExpires).run()

  const token = await createToken(id, 'member', c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id, email, name, company_name, role: 'member', plan: 'free', trial_expires_at: trialExpires }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email ve şifre gerekli' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Geçersiz email veya şifre' }, 401)
  }

  const token = await createToken(user.id, user.role, c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({
    id: user.id, email: user.email, name: user.name,
    company_name: user.company_name, role: user.role,
    plan: user.plan || 'free', trial_expires_at: user.trial_expires_at,
  })
})

auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'askdesk_token=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/askdesk_token=([^;]+)/)
  if (!match) return c.json({ user: null })

  try {
    const { jwtVerify } = await import('jose')
    const key = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(match[1], key)
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, company_name, role, plan, trial_expires_at, created_at FROM users WHERE id = ?'
    ).bind(payload.sub).first()
    return c.json({ user: user || null })
  } catch {
    return c.json({ user: null })
  }
})

// Password reset - request token
auth.post('/forgot-password', async (c) => {
  const { email } = await c.req.json()
  if (!email) return c.json({ error: 'Email gerekli' }, 400)

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (!user) {
    // Don't reveal if email exists
    return c.json({ ok: true, message: 'Eğer bu email ile kayıtlı bir hesap varsa, sıfırlama kodu gönderildi.' })
  }

  const resetToken = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min

  await c.env.DB.prepare(
    'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
  ).bind(resetToken, expires, user.id).run()

  // TODO: Send email with reset token when SMTP is configured
  // For now return the token in response (will be removed in production)
  return c.json({ ok: true, message: 'Sıfırlama kodu oluşturuldu.', reset_code: resetToken })
})

// Password reset - verify token and set new password
auth.post('/reset-password', async (c) => {
  const { email, reset_code, new_password } = await c.req.json()
  if (!email || !reset_code || !new_password) {
    return c.json({ error: 'Email, sıfırlama kodu ve yeni şifre gerekli' }, 400)
  }
  if (new_password.length < 6) {
    return c.json({ error: 'Şifre en az 6 karakter olmalı' }, 400)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, reset_token, reset_token_expires FROM users WHERE email = ?'
  ).bind(email).first()

  if (!user || user.reset_token !== reset_code) {
    return c.json({ error: 'Geçersiz sıfırlama kodu' }, 400)
  }
  if (new Date(user.reset_token_expires) < new Date()) {
    return c.json({ error: 'Sıfırlama kodunun süresi dolmuş. Lütfen yeni kod talep edin.' }, 400)
  }

  const password_hash = await hashPassword(new_password)
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
  ).bind(password_hash, user.id).run()

  return c.json({ ok: true, message: 'Şifreniz başarıyla güncellendi.' })
})

auth.post('/seed-admin', async (c) => {
  const { email, password, name } = await c.req.json()
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE role = ?').bind('superadmin').first()
  if (existing) return c.json({ error: 'Super Admin zaten var' }, 409)

  const id = crypto.randomUUID()
  const password_hash = await hashPassword(password)

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, plan) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, 'superadmin', 'growth').run()

  return c.json({ id, email, name, role: 'superadmin' }, 201)
})

export default auth
