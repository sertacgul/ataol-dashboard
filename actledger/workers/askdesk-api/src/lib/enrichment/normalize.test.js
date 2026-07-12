import { describe, it, expect } from 'vitest'
import { mapSeniority, mapDepartment, mapVerification, mergePeople } from './normalize.js'

describe('mapSeniority', () => {
  it('prefers specific classified over Staff', () => {
    expect(mapSeniority('junior', 'Director')).toBe('Director')
  })
  it('maps Hunter executive when classified is Staff', () => {
    expect(mapSeniority('executive', 'Staff')).toBe('C-Level')
  })
})

describe('mapDepartment', () => {
  it('maps Hunter it to Engineering', () => {
    expect(mapDepartment('it', 'Other')).toBe('Engineering')
  })
  it('falls back to classified when unmapped', () => {
    expect(mapDepartment('', 'Sales')).toBe('Sales')
  })
})

describe('mapVerification', () => {
  it('valid status => verified', () => {
    expect(mapVerification('valid', 50)).toBe('verified')
  })
  it('accept_all => risky', () => {
    expect(mapVerification('accept_all', 95)).toBe('risky')
  })
  it('no status high confidence => verified', () => {
    expect(mapVerification(null, 92)).toBe('verified')
  })
  it('no status mid confidence => likely', () => {
    expect(mapVerification(null, 60)).toBe('likely')
  })
  it('no status low confidence => risky', () => {
    expect(mapVerification(null, 20)).toBe('risky')
  })
  it('no data => unknown', () => {
    expect(mapVerification(null, null)).toBe('unknown')
  })
})

describe('mergePeople', () => {
  it('dedupes by email, primary wins', () => {
    const primary = [{ name: 'A', email: 'a@x.com', source: 'hunter' }]
    const secondary = [{ name: 'A2', email: 'A@x.com', source: 'website' }, { name: 'B', email: 'b@x.com', source: 'website' }]
    const out = mergePeople(primary, secondary)
    expect(out).toHaveLength(2)
    expect(out[0].source).toBe('hunter')
    expect(out[1].email).toBe('b@x.com')
  })
  it('dedupes by name when email missing', () => {
    const primary = [{ name: 'Ahmet Yilmaz', email: null, source: 'hunter' }]
    const secondary = [{ name: 'ahmet  yilmaz', email: null, source: 'website' }]
    expect(mergePeople(primary, secondary)).toHaveLength(1)
  })
})
