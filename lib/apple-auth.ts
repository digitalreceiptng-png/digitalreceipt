import { SignJWT, importPKCS8 } from 'jose'

// Apple's token endpoint expects a client_secret that is itself a short-lived
// JWT, signed with your Sign in with Apple private key (ES256) — there's no
// static secret like Google's. Regenerated fresh on every token exchange
// rather than cached, since it's cheap to sign and avoids expiry bookkeeping.
export async function makeAppleClientSecret(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_KEY_ID
  const clientId = process.env.APPLE_CLIENT_ID
  const rawKey = process.env.APPLE_PRIVATE_KEY
  if (!teamId || !keyId || !clientId || !rawKey) {
    throw new Error('Apple sign-in is not configured (missing APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_CLIENT_ID / APPLE_PRIVATE_KEY).')
  }

  // The .p8 file's PEM content, usually stored as an env var with literal
  // "\n" sequences (real newlines don't survive most env var UIs) — restore them.
  const pkcs8 = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey
  const privateKey = await importPKCS8(pkcs8, 'ES256')

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .sign(privateKey)
}
