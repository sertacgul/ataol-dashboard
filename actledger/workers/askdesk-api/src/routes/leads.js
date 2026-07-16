import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const leads = new Hono()
leads.use('*', authMiddleware)

leads.get('/', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { sector, country, source, q } = c.req.query()

  let sql = 'SELECT * FROM companies'
  const conditions = []
  const params = []

  if (role !== 'superadmin') {
    conditions.push('user_id = ?')
    params.push(userId)
  }
  if (sector) { conditions.push('sector = ?'); params.push(sector) }
  if (country) { conditions.push('country = ?'); params.push(country) }
  if (source) { conditions.push('source = ?'); params.push(source) }
  if (q) { conditions.push('name LIKE ?'); params.push(`%${q}%`) }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ companies: result.results })
})

leads.get('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const company = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  const contacts = await c.env.DB.prepare('SELECT * FROM contacts WHERE company_id = ?').bind(id).all()
  return c.json({ company, contacts: contacts.results })
})

leads.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const companyId = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO companies (id, user_id, name, website, sector, country, source, notes, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(companyId, userId, body.name, body.website || null, body.sector || null, body.country || null, body.source || 'manual', body.notes || null, body.phone || null).run()

  if (body.contact_name || body.contact_email) {
    const contactId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO contacts (id, company_id, user_id, name, email, title, seniority) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(contactId, companyId, userId, body.contact_name || '', body.contact_email || null, body.contact_title || null, body.contact_seniority || null).run()
  }

  return c.json({ id: companyId }, 201)
})

leads.put('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')
  const body = await c.req.json()

  const company = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.prepare(
    'UPDATE companies SET name = ?, website = ?, sector = ?, country = ?, notes = ?, phone = COALESCE(?, phone) WHERE id = ?'
  ).bind(body.name, body.website || null, body.sector || null, body.country || null, body.notes || null, body.phone ?? null, id).run()

  return c.json({ ok: true })
})

leads.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const id = c.req.param('id')

  const company = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: 'Firma bulunamadı' }, 404)
  if (role !== 'superadmin' && company.user_id !== userId) return c.json({ error: 'Yetkisiz' }, 403)

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM contacts WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM pipeline_items WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM emails WHERE company_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM companies WHERE id = ?').bind(id),
  ])

  return c.json({ ok: true })
})

export default leads
