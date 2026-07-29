import { describe, it, expect, vi } from 'vitest'
import { createEnrichment, sortPeople } from './index.js'

vi.mock('./hunter.js', () => ({
  createHunterProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'H' }, people: [{ email: 'h@x.com', source: 'hunter' }] }),
    findEmail: vi.fn().mockResolvedValue({ email: 'h@x.com', confidence: 90, source: 'hunter' }),
    verifyEmail: vi.fn().mockResolvedValue({ status: 'verified', confidence: 95, source: 'hunter' }),
  }),
}))
vi.mock('./free.js', () => ({
  createFreeProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'F' }, people: [{ email: 'f@x.com', source: 'website' }] }),
    findEmail: vi.fn().mockResolvedValue({ email: 'f@x.com', confidence: 40, source: 'pattern' }),
    verifyEmail: vi.fn().mockResolvedValue({ status: 'likely', confidence: 72, source: 'pattern' }),
  }),
}))
vi.mock('./prospeo.js', () => ({
  createProspeoProvider: () => ({
    domainSearch: vi.fn().mockResolvedValue({ company: { name: 'P' }, people: [{ prospeo_person_id: 'p1', name: 'Ali Veli', seniority: 'Manager', email: null, source: 'prospeo' }] }),
    revealEmail: vi.fn().mockResolvedValue({ email: 'ali@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' }),
    findEmail: vi.fn().mockResolvedValue({ email: 'p@x.com', confidence: 90, source: 'prospeo' }),
  }),
}))

const helpers = { classifySeniority: () => 'Staff', classifyDepartment: () => 'Other' }

describe('createEnrichment waterfall', () => {
  it('uses Hunter when key present and results non-empty', async () => {
    const e = createEnrichment({ HUNTER_API_KEY: 'k' }, helpers)
    const r = await e.domainSearch('x.com')
    expect(r.provider).toBe('hunter')
    expect(r.people[0].email).toBe('h@x.com')
  })
  it('uses Free when no key', async () => {
    const e = createEnrichment({}, helpers)
    const r = await e.domainSearch('x.com')
    expect(r.provider).toBe('free')
  })
})

describe('sortPeople', () => {
  it('ranks personal decision-maker emails above generic mailboxes and no-email entries', () => {
    const input = [
      { name: 'Info', email: 'info@x.com', email_type: 'generic', seniority: 'Staff' },
      { name: 'Staffer', email: 'joe@x.com', email_type: 'personal', seniority: 'Staff' },
      { name: 'Nobody', email: null, seniority: 'C-Level' },
      { name: 'Boss', email: 'ceo@x.com', email_type: 'personal', seniority: 'C-Level' },
    ]
    const sorted = sortPeople(input).map(p => p.name)
    expect(sorted).toEqual(['Boss', 'Staffer', 'Info', 'Nobody'])
  })

  it('ranks reachable decision-makers (Director/Manager) above C-Level', () => {
    const input = [
      { name: 'Ceo', email: 'ceo@x.com', email_type: 'personal', seniority: 'C-Level' },
      { name: 'Dir', email: 'dir@x.com', email_type: 'personal', seniority: 'Director' },
      { name: 'Mgr', email: 'mgr@x.com', email_type: 'personal', seniority: 'Manager' },
    ]
    const sorted = sortPeople(input).map(p => p.name)
    expect(sorted).toEqual(['Dir', 'Mgr', 'Ceo'])
  })

  it('does not mutate the input array', () => {
    const input = [
      { name: 'Info', email: 'info@x.com', email_type: 'generic', seniority: 'Staff' },
      { name: 'Boss', email: 'ceo@x.com', email_type: 'personal', seniority: 'C-Level' },
    ]
    sortPeople(input)
    expect(input[0].name).toBe('Info')
  })
})

describe('createEnrichment — Prospeo second tier', () => {
  const helpers = { classifySeniority: () => 'Staff', classifyDepartment: () => 'Other' }

  it('uses Prospeo (tagging provider) when Hunter is not configured', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    const r = await enrichment.domainSearch('acme.com')
    expect(r.provider).toBe('prospeo')
    expect(r.people[0].prospeo_person_id).toBe('p1')
  })

  it('findEmail uses Prospeo when Hunter is not configured', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    expect(await enrichment.findEmail('Ali', 'Veli', 'acme.com')).toMatchObject({ email: 'p@x.com', source: 'prospeo' })
  })

  it('revealProviderEmail routes prospeo persons to enrich-person', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    const found = await enrichment.revealProviderEmail({ source: 'prospeo', prospeo_person_id: 'p1' })
    expect(found).toEqual({ email: 'ali@acme.com', verification_status: 'verified', confidence: 90, source: 'prospeo' })
  })

  it('revealProviderEmail returns null for non-prospeo persons', async () => {
    const enrichment = createEnrichment({ PROSPEO_API_KEY: 'p' }, helpers)
    expect(await enrichment.revealProviderEmail({ source: 'hunter', email: 'x@y.com' })).toBeNull()
  })
})
