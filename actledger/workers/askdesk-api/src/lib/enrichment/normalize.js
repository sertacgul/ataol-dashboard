const HUNTER_SENIORITY = { executive: 'C-Level', senior: 'Manager', junior: 'Staff' }

const HUNTER_DEPARTMENT = {
  executive: 'Other', it: 'Engineering', finance: 'Finance', management: 'Operations',
  sales: 'Sales', hr: 'HR', marketing: 'Marketing', operations: 'Operations',
  support: 'Operations', communication: 'Marketing', legal: 'Legal',
}

export function mapSeniority(hunterSeniority, classified) {
  if (classified && classified !== 'Staff') return classified
  return HUNTER_SENIORITY[hunterSeniority] || classified || 'Staff'
}

export function mapDepartment(hunterDepartment, classified) {
  if (HUNTER_DEPARTMENT[hunterDepartment]) return HUNTER_DEPARTMENT[hunterDepartment]
  return classified || 'Other'
}

export function mapVerification(status, confidence) {
  if (status === 'valid') return 'verified'
  if (status === 'accept_all' || status === 'disposable' || status === 'invalid') return 'risky'
  if (status === 'webmail') return 'likely'
  if (status === 'unknown' || status === 'pending') return 'unknown'
  if (typeof confidence !== 'number') return 'unknown'
  if (confidence >= 90) return 'verified'
  if (confidence >= 50) return 'likely'
  return 'risky'
}

const keyName = n => (n || '').toLowerCase().replace(/\s+/g, ' ').trim()

export function mergePeople(primary, secondary) {
  const byEmail = new Set()
  const byName = new Set()
  const out = []
  const add = p => {
    out.push(p)
    if (p.email) byEmail.add(p.email.toLowerCase())
    if (p.name) byName.add(keyName(p.name))
  }
  for (const p of primary) add(p)
  for (const p of secondary) {
    if (p.email && byEmail.has(p.email.toLowerCase())) continue
    if (p.name && byName.has(keyName(p.name))) continue
    add(p)
  }
  return out
}
