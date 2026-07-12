const TR = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u' }

function ascii(s) {
  return (s || '').split('').map(c => TR[c] || c).join('').toLowerCase().replace(/[^a-z\s]/g, '').trim()
}

export function nameParts(name) {
  const parts = ascii(name).split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null
  return { first: parts[0], last: parts[parts.length - 1] }
}

function patternMap(first, last) {
  const f = first[0], l = last[0]
  return {
    'first.last': `${first}.${last}`,
    'firstlast': `${first}${last}`,
    'first_last': `${first}_${last}`,
    'f.last': `${f}.${last}`,
    'flast': `${f}${last}`,
    'first.l': `${first}.${l}`,
    'first': first,
    'last': last,
    'last.first': `${last}.${first}`,
  }
}

export function derivePattern(email, name) {
  const np = nameParts(name)
  if (!np || !email) return null
  const local = email.split('@')[0].toLowerCase()
  const map = patternMap(np.first, np.last)
  for (const [token, val] of Object.entries(map)) {
    if (val === local) return token
  }
  return null
}

export function applyPattern(token, name, domain) {
  const np = nameParts(name)
  if (!np || !token || !domain) return null
  const local = patternMap(np.first, np.last)[token]
  return local ? `${local}@${domain}` : null
}
