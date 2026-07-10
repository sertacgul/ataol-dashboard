import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
  return corsMiddleware(c, next)
})

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
