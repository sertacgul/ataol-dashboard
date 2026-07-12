import { describe, it, expect } from 'vitest'
import { nameParts, derivePattern, applyPattern } from './patterns.js'

describe('nameParts', () => {
  it('splits first/last and transliterates Turkish', () => {
    expect(nameParts('Şükrü Güneş')).toEqual({ first: 'sukru', last: 'gunes' })
  })
  it('returns null for single word', () => {
    expect(nameParts('Ahmet')).toBeNull()
  })
})

describe('derivePattern', () => {
  it('detects first.last', () => {
    expect(derivePattern('ahmet.yilmaz@acme.com', 'Ahmet Yilmaz')).toBe('first.last')
  })
  it('detects flast', () => {
    expect(derivePattern('ayilmaz@acme.com', 'Ahmet Yilmaz')).toBe('flast')
  })
  it('returns null when no pattern matches', () => {
    expect(derivePattern('info@acme.com', 'Ahmet Yilmaz')).toBeNull()
  })
})

describe('applyPattern', () => {
  it('builds email from learned pattern', () => {
    expect(applyPattern('f.last', 'Ahmet Yilmaz', 'acme.com')).toBe('a.yilmaz@acme.com')
  })
  it('returns null for unknown token', () => {
    expect(applyPattern('bogus', 'Ahmet Yilmaz', 'acme.com')).toBeNull()
  })
})
