import { mapSeniority, mapDepartment, mapVerification } from './normalize.js'

const BASE = 'https://api.hunter.io/v2'

export function createHunterProvider(apiKey, { classifySeniority, classifyDepartment }) {
  async function call(path, params) {
    const url = new URL(`${BASE}${path}`)
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v)
    url.searchParams.set('api_key', apiKey)
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const err = new Error(`hunter ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }

  function mapEmail(e) {
    const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || (e.value?.split('@')[0] || '')
    return {
      first_name: e.first_name || '',
      last_name: e.last_name || '',
      name,
      title: e.position || '',
      department: mapDepartment(e.department, classifyDepartment(e.position)),
      seniority: mapSeniority(e.seniority, classifySeniority(e.position)),
      email: e.value || null,
      email_type: e.type || 'personal',
      confidence: typeof e.confidence === 'number' ? e.confidence : 0,
      phone: e.phone_number || null,
      linkedin: e.linkedin || null,
      sources: (e.sources || []).map(s => s.uri).filter(Boolean),
      verification_status: mapVerification(e.verification?.status, e.confidence),
      source: 'hunter',
    }
  }

  return {
    // Hunter's Free plan caps domain-search at 10 results and returns HTTP 400
    // (pagination_error) for any higher limit. A limit >10 made every call fail
    // and silently fall back to the weaker scrape engine. Keep the default at 10
    // so Hunter is actually used; raise it only alongside a paid Hunter plan.
    async domainSearch(domain, { limit = 10 } = {}) {
      const data = await call('/domain-search', { domain, limit })
      const d = data?.data || {}
      const people = (d.emails || []).map(mapEmail)
      const company = {
        name: d.organization || domain,
        domain,
        description: '',
        sector: d.industry || '',
        location: [d.city, d.country].filter(Boolean).join(', '),
        employee_count: '',
        company_phones: [],
        mx_valid: true,
      }
      return { company, people }
    },
    async findEmail(firstName, lastName, domain) {
      const data = await call('/email-finder', { domain, first_name: firstName, last_name: lastName })
      const d = data?.data
      if (!d || !d.email) return null
      return { email: d.email, confidence: typeof d.score === 'number' ? d.score : 0, source: 'hunter' }
    },
    async verifyEmail(email) {
      const data = await call('/email-verifier', { email })
      const d = data?.data || {}
      return { status: mapVerification(d.status, d.score), confidence: typeof d.score === 'number' ? d.score : 0, source: 'hunter' }
    },
  }
}
