import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'

const analytics = new Hono()
analytics.use('*', authMiddleware)

analytics.get('/overview', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { from, to } = c.req.query()
  const isSuperadmin = role === 'superadmin'

  const userFilter = isSuperadmin ? '' : 'WHERE user_id = ?'
  const userParams = isSuperadmin ? [] : [userId]

  const totalCompanies = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM companies ${userFilter}`
  ).bind(...userParams).first()

  const totalEmails = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM emails ${userFilter}`
  ).bind(...userParams).first()

  let sentSql = `SELECT COUNT(*) as count FROM emails WHERE status = 'sent'`
  let replySql = `SELECT COUNT(*) as count FROM emails WHERE status IN ('replied', 'converted')`

  const sentParams = []
  const replyParams = []

  if (!isSuperadmin) {
    sentSql += ' AND user_id = ?'
    replySql += ' AND user_id = ?'
    sentParams.push(userId)
    replyParams.push(userId)
  }

  if (from && to) {
    sentSql += ' AND sent_at BETWEEN ? AND ?'
    sentParams.push(from, to)
  }

  const [sentResult, replyResult] = await Promise.all([
    c.env.DB.prepare(sentSql).bind(...sentParams).first(),
    c.env.DB.prepare(replySql).bind(...replyParams).first(),
  ])

  const sentCount = sentResult?.count ?? 0

  return c.json({
    total_companies: totalCompanies?.count ?? 0,
    total_emails: totalEmails?.count ?? 0,
    sent_emails: sentCount,
    reply_count: replyResult?.count ?? 0,
  })
})

analytics.get('/email-trend', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { from, to } = c.req.query()
  const isSuperadmin = role === 'superadmin'

  let sql = `SELECT DATE(sent_at) as date, COUNT(*) as count FROM emails WHERE status = 'sent'`
  const params = []

  if (!isSuperadmin) {
    sql += ' AND user_id = ?'
    params.push(userId)
  }

  if (from && to) {
    sql += ' AND sent_at BETWEEN ? AND ?'
    params.push(from, to)
  }

  sql += ' GROUP BY DATE(sent_at) ORDER BY date'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ data: result.results })
})

analytics.get('/social-stats', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const isSuperadmin = role === 'superadmin'

  let sql = 'SELECT platform, COUNT(*) as count FROM social_posts'
  const params = []

  if (!isSuperadmin) {
    sql += ' WHERE user_id = ?'
    params.push(userId)
  }

  sql += ' GROUP BY platform'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ data: result.results })
})

analytics.get('/pipeline-stats', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const isSuperadmin = role === 'superadmin'

  let sql = `
    SELECT ps.name, COUNT(pi.id) as count
    FROM pipeline_stages ps
    LEFT JOIN pipeline_items pi ON ps.id = pi.stage_id
  `
  const params = []

  if (!isSuperadmin) {
    sql += ' WHERE ps.user_id = ?'
    params.push(userId)
  }

  sql += ' GROUP BY ps.id, ps.name ORDER BY ps.position'

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ data: result.results })
})

analytics.get('/content-trend', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { from, to } = c.req.query()
  const isSuperadmin = role === 'superadmin'

  const buildQuery = (table) => {
    let sql = `SELECT substr(created_at, 1, 7) as month, COUNT(*) as count FROM ${table}`
    const params = []
    if (!isSuperadmin) {
      sql += ' WHERE user_id = ?'
      params.push(userId)
      if (from && to) {
        sql += ' AND created_at BETWEEN ? AND ?'
        params.push(from, to)
      }
    } else if (from && to) {
      sql += ' WHERE created_at BETWEEN ? AND ?'
      params.push(from, to)
    }
    sql += ' GROUP BY substr(created_at, 1, 7) ORDER BY month'
    return { sql, params }
  }

  const seoQ = buildQuery('seo_articles')
  const socialQ = buildQuery('social_posts')
  const newsletterQ = buildQuery('newsletters')

  const [seoRes, socialRes, newsletterRes] = await Promise.all([
    c.env.DB.prepare(seoQ.sql).bind(...seoQ.params).all(),
    c.env.DB.prepare(socialQ.sql).bind(...socialQ.params).all(),
    c.env.DB.prepare(newsletterQ.sql).bind(...newsletterQ.params).all(),
  ])

  const mergeByMonth = (seo, social, newsletter) => {
    const monthMap = {}
    for (const r of seo) {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, seo: 0, social: 0, newsletter: 0 }
      monthMap[r.month].seo = r.count
    }
    for (const r of social) {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, seo: 0, social: 0, newsletter: 0 }
      monthMap[r.month].social = r.count
    }
    for (const r of newsletter) {
      if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, seo: 0, social: 0, newsletter: 0 }
      monthMap[r.month].newsletter = r.count
    }
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  }

  return c.json({ data: mergeByMonth(seoRes.results, socialRes.results, newsletterRes.results) })
})

analytics.get('/top-outreach', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  const { limit = '10' } = c.req.query()
  const isSuperadmin = role === 'superadmin'

  let sql = `
    SELECT e.*, c.name as company_name
    FROM emails e
    LEFT JOIN companies c ON e.company_id = c.id
    WHERE e.status = 'sent'
  `
  const params = []

  if (!isSuperadmin) {
    sql += ' AND e.user_id = ?'
    params.push(userId)
  }

  sql += ' ORDER BY e.created_at DESC LIMIT ?'
  params.push(parseInt(limit, 10))

  const result = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ data: result.results })
})

export default analytics
