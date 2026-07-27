import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHunterProvider } from './hunter.js'

const helpers = {
  classifySeniority: () => 'Staff',
  classifyDepartment: () => 'Other',
}

afterEach(() => { vi.restoreAllMocks() })

function mockFetch(json, ok = true, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok, status, json: async () => json,
  })
  return globalThis.fetch
}

describe('HunterProvider.domainSearch', () => {
  it('maps Hunter emails to NormalizedPerson', async () => {
    mockFetch({ data: { organization: 'Acme', industry: 'Software', city: 'Istanbul', country: 'TR',
      emails: [{ value: 'ahmet.yilmaz@acme.com', type: 'personal', confidence: 95, first_name: 'Ahmet',
        last_name: 'Yilmaz', position: 'CTO', seniority: 'executive', department: 'it',
        phone_number: null, verification: { status: 'valid' } }] } })
    const p = createHunterProvider('key', helpers)
    const { company, people } = await p.domainSearch('acme.com')
    expect(company.name).toBe('Acme')
    expect(people[0].email).toBe('ahmet.yilmaz@acme.com')
    expect(people[0].seniority).toBe('C-Level')
    expect(people[0].department).toBe('Engineering')
    expect(people[0].verification_status).toBe('verified')
    expect(people[0].source).toBe('hunter')
  })

  it('requests at most 10 results so Hunter Free plan does not 400', async () => {
    const fetchMock = mockFetch({ data: { organization: 'Acme', emails: [] } })
    const p = createHunterProvider('key', helpers)
    await p.domainSearch('acme.com')
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(Number(url.searchParams.get('limit'))).toBeLessThanOrEqual(10)
  })
})

describe('HunterProvider.findEmail', () => {
  it('returns email + score', async () => {
    mockFetch({ data: { email: 'a@acme.com', score: 88 } })
    const p = createHunterProvider('key', helpers)
    expect(await p.findEmail('Ahmet', 'Yilmaz', 'acme.com')).toEqual({ email: 'a@acme.com', confidence: 88, source: 'hunter' })
  })
  it('returns null when no email', async () => {
    mockFetch({ data: { email: null } })
    const p = createHunterProvider('key', helpers)
    expect(await p.findEmail('X', 'Y', 'acme.com')).toBeNull()
  })
})

describe('HunterProvider errors', () => {
  it('throws with status on non-ok', async () => {
    mockFetch({}, false, 429)
    const p = createHunterProvider('key', helpers)
    await expect(p.domainSearch('acme.com')).rejects.toMatchObject({ status: 429 })
  })
})
