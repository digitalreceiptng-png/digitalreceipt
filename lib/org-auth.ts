// Staff PIN hashing and short-lived JWT signing for branded generate pages.
// Uses Web Crypto API — Edge runtime compatible, no external dependencies.

const SECRET = process.env.STAFF_SESSION_SECRET ?? 'change-me-in-production-use-a-long-random-string'

// ---------------------------------------------------------------------------
// PIN hashing — SHA-256 with sub-account ID as salt
// ---------------------------------------------------------------------------

export async function hashPin(pin: string, subAccountId: string): Promise<string> {
  const data = new TextEncoder().encode(`${subAccountId}:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(pin: string, subAccountId: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin, subAccountId)
  return hash === storedHash
}

// ---------------------------------------------------------------------------
// Minimal HS256 JWT — sign and verify staff session tokens
// ---------------------------------------------------------------------------

export interface OrgTokenPayload {
  orgSlug: string
  subAccountId: string
  ownerUserId: string
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromb64url(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

export async function signOrgToken(
  payload: OrgTokenPayload,
  expiresInSeconds = 8 * 3600
): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  const sig = b64url(String.fromCharCode(...new Uint8Array(sigBuf)))
  return `${header}.${body}.${sig}`
}

export async function verifyOrgToken(token: string): Promise<OrgTokenPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = Uint8Array.from(fromb64url(sig), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      sigBytes,
      new TextEncoder().encode(`${header}.${body}`)
    )
    if (!valid) return null

    const payload = JSON.parse(fromb64url(body))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null

    return {
      orgSlug: payload.orgSlug,
      subAccountId: payload.subAccountId,
      ownerUserId: payload.ownerUserId,
    }
  } catch {
    return null
  }
}
