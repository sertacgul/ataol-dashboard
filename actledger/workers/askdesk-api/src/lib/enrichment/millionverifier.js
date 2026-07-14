// MillionVerifier single-email verification.
// Docs: https://www.millionverifier.com/  (API v3 single verification)
// GET https://api.millionverifier.com/api/v3/?api=KEY&email=EMAIL
// result: ok | catch_all | unknown | invalid | disposable | error

const BASE = 'https://api.millionverifier.com/api/v3/'

// Map MillionVerifier's result to our verification vocabulary
// ('verified' | 'risky' | 'unknown'). We never surface an 'invalid'
// address, so callers use `result` to decide whether to keep trying.
function normalize(d) {
  const result = String(d?.result || '').toLowerCase()
  switch (result) {
    case 'ok':        return { result, status: 'verified', confidence: 95 }
    case 'catch_all': return { result, status: 'risky', confidence: 50 }
    case 'invalid':   return { result, status: 'unknown', confidence: 0 }
    case 'disposable':return { result, status: 'risky', confidence: 20 }
    default:          return { result: result || 'unknown', status: 'unknown', confidence: 15 }
  }
}

export function createVerifierProvider(apiKey) {
  async function verify(email) {
    const url = `${BASE}?api=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&timeout=10`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const err = new Error(`millionverifier ${res.status}`)
      err.status = res.status
      throw err
    }
    return normalize(await res.json())
  }
  return { verify }
}
