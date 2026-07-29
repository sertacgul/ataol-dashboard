import { describe, it, expect, vi, afterEach } from 'vitest'
import { createProspeoProvider } from './prospeo.js'

const helpers = {
  classifySeniority: (title) => (/cto|ceo|founder/i.test(title || '') ? 'C-Level' : 'Staff'),
  classifyDepartment: (title) => (/engineer|cto/i.test(title || '') ? 'Engineering' : 'Other'),
}

afterEach(() => { vi.restoreAllMocks() })

function mockFetch(json, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => json })
  return globalThis.fetch
}

describe('ProspeoProvider.domainSearch', () => {
  it('maps search-person results to people with no email + person_id', async () => {
    mockFetch({
      error: false,
      results: [{
        person: {
          person_id: 'p_123', first_name: 'Ahmet', last_name: 'Yilmaz', full_name: 'Ahmet Yilmaz',
          linkedin_url: 'https://linkedin.com/in/ahmet', current_job_title: 'CTO',
          job_history: [{ title: 'CTO', current: true, seniority: 'C-Suite', departments: ['Engineering'] }],
        },
        company: { name: 'Acme', website: 'https://acme.com', industry: 'Software' },
      }],
      pagination: { current_page: 1, per_page: 25, total_page: 1, total_count: 1 },
    })
    const p = createProspeoProvider('key', helpers)
    const { company, people } = await p.domainSearch('acme.com')
    expect(company.name).toBe('Acme')
    expect(people[0].email).toBeNull()
    expect(people[0].prospeo_person_id).toBe('p_123')
    expect(people[0].name).toBe('Ahmet Yilmaz')
    expect(people[0].seniority).toBe('C-Level')
    expect(people[0].source).toBe('prospeo')
  })

  it('returns empty people when no results', async () => {
    mockFetch({ error: false, results: [], pagination: {} })
    const p = createProspeoProvider('key', helpers)
    const { people } = await p.domainSearch('acme.com')
    expect(people).toEqual([])
  })
})

describe('ProspeoProvider.revealEmail', () => {
  it('returns verified email when status VERIFIED', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: true, email: 'ahmet@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' }))
      .toEqual({ email: 'ahmet@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' })
  })

  it('returns null when email UNAVAILABLE', async () => {
    mockFetch({ error: false, person: { email: { status: 'UNAVAILABLE', revealed: false, email: null } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' })).toBeNull()
  })

  it('returns null for masked email (no credit spent / privacy masked)', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: false, email: 'ahmet.****@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({ prospeo_person_id: 'p_123' })).toBeNull()
  })

  it('returns null when no person_id', async () => {
    const p = createProspeoProvider('key', helpers)
    expect(await p.revealEmail({})).toBeNull()
  })
})

describe('ProspeoProvider.findEmail', () => {
  it('returns email + confidence via enrich-person', async () => {
    mockFetch({ error: false, person: { email: { status: 'VERIFIED', revealed: true, email: 'a@acme.com' } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.findEmail('Ahmet', 'Yilmaz', 'acme.com'))
      .toEqual({ email: 'a@acme.com', confidence: 90, source: 'prospeo' })
  })

  it('returns null when unavailable', async () => {
    mockFetch({ error: false, person: { email: { status: 'UNAVAILABLE', email: null } } })
    const p = createProspeoProvider('key', helpers)
    expect(await p.findEmail('X', 'Y', 'acme.com')).toBeNull()
  })
})

describe('ProspeoProvider errors', () => {
  it('throws with status on non-ok', async () => {
    mockFetch({}, false, 429)
    const p = createProspeoProvider('key', helpers)
    await expect(p.domainSearch('acme.com')).rejects.toMatchObject({ status: 429 })
  })

  it('throws when body signals error on 200', async () => {
    mockFetch({ error: true, message: 'quota exhausted' }, true, 200)
    const p = createProspeoProvider('key', helpers)
    await expect(p.domainSearch('acme.com')).rejects.toThrow()
  })
})
