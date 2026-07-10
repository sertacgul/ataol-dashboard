import { Hono } from 'hono'
import { hashSync, compareSync } from 'bcryptjs'
import { createToken } from '../middleware/auth.js'

const auth = new Hono()

auth.post('/register', async (c) => {
  const { email, password, name, company_name } = await c.req.json()
  if (!email || !password || !name) {
    return c.json({ error: 'Email, şifre ve isim gerekli' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Bu email zaten kayıtlı' }, 409)

  const id = crypto.randomUUID()
  const password_hash = hashSync(password, 10)

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, company_name, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, email, password_hash, name, company_name || null, 'member').run()

  const token = await createToken(id, 'member', c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id, email, name, company_name, role: 'member' }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Email ve şifre gerekli' }, 400)

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user || !compareSync(password, user.password_hash)) {
    return c.json({ error: 'Geçersiz email veya şifre' }, 401)
  }

  const token = await createToken(user.id, user.role, c.env.JWT_SECRET)
  c.header('Set-Cookie', `askdesk_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id: user.id, email: user.email, name: user.name, company_name: user.company_name, role: user.role })
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
      'SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?'
    ).bind(payload.sub).first()
    return c.json({ user: user || null })
  } catch {
    return c.json({ user: null })
  }
})

export default auth
