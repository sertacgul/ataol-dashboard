import { createHunterProvider } from './hunter.js'
import { createFreeProvider } from './free.js'

export function createEnrichment(env, helpers) {
  const free = createFreeProvider(env, helpers)
  const hunter = env.HUNTER_API_KEY ? createHunterProvider(env.HUNTER_API_KEY, helpers) : null

  return {
    async domainSearch(domain, opts) {
      if (hunter) {
        try {
          const r = await hunter.domainSearch(domain, opts)
          if (r.people && r.people.length) return { ...r, provider: 'hunter' }
        } catch { /* fall back */ }
      }
      const r = await free.domainSearch(domain, opts)
      return { ...r, provider: 'free' }
    },
    async findEmail(first, last, domain) {
      if (hunter) {
        try {
          const r = await hunter.findEmail(first, last, domain)
          if (r && r.email) return r
        } catch { /* fall back */ }
      }
      return free.findEmail(first, last, domain)
    },
    async verifyEmail(email) {
      if (hunter) {
        try { return await hunter.verifyEmail(email) } catch { /* fall back */ }
      }
      return free.verifyEmail(email)
    },
  }
}
