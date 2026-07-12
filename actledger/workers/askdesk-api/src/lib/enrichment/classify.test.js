import { describe, it, expect } from 'vitest'
import { classifySeniority, classifyDepartment } from './free.js'

describe('classifySeniority', () => {
  it('does not treat "Director" as C-Level (cto substring bug)', () => {
    expect(classifySeniority('Director of Engineering')).toBe('Director')
  })
  it('classifies standalone CTO as C-Level', () => {
    expect(classifySeniority('CTO')).toBe('C-Level')
  })
  it('classifies Sales Manager as Manager', () => {
    expect(classifySeniority('Sales Manager')).toBe('Manager')
  })
  it('defaults to Staff', () => {
    expect(classifySeniority('Software Engineer')).toBe('Staff')
  })
})

describe('classifyDepartment', () => {
  it('does not treat "Building Manager" as Design (ui substring bug)', () => {
    expect(classifyDepartment('Building Manager')).toBe('Other')
  })
  it('classifies UX Designer as Design', () => {
    expect(classifyDepartment('UX Designer')).toBe('Design')
  })
  it('classifies Software Engineer as Engineering', () => {
    expect(classifyDepartment('Software Engineer')).toBe('Engineering')
  })
})
