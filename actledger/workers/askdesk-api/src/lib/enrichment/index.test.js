import { describe, it, expect, vi } from 'vitest'
import { createEnrichment } from './index.js'

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
