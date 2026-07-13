export async function logActivity(db, userId, { module, action, title, detail }) {
  try {
    const detailStr = detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail))
    await db.prepare(
      `INSERT INTO activity_log (id, user_id, module, action, title, detail) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), userId, module, action, title || null, detailStr).run()
  } catch { /* logging must never break the main action */ }
}
