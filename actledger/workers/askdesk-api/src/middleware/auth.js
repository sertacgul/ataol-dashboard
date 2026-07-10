import { SignJWT, jwtVerify } from 'jose'

export async function createToken(userId, role, secret) {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function authMiddleware(c, next) {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/askdesk_token=([^;]+)/)
  if (!match) return c.json({ error: 'Yetkisiz erişim' }, 401)

  try {
    const key = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(match[1], key)
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
    await next()
  } catch {
    return c.json({ error: 'Geçersiz token' }, 401)
  }
}
