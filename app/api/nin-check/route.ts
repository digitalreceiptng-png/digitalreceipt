import { NextRequest, NextResponse } from 'next/server'

const TOKEN_URL = 'https://api.qoreid.com/token'
const BASE_URL  = 'https://api.qoreid.com'

export async function GET(req: NextRequest) {
  const nin       = req.nextUrl.searchParams.get('nin') ?? ''
  const firstname = req.nextUrl.searchParams.get('firstname') ?? ''
  const lastname  = req.nextUrl.searchParams.get('lastname') ?? ''

  const clientId = process.env.QOREID_CLIENT_ID
  const secret   = process.env.QOREID_SECRET

  // Step 1: get token
  let token = ''
  let tokenStatus = 0
  let tokenData: unknown = null
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, secret }),
      cache: 'no-store',
    })
    tokenStatus = tokenRes.status
    tokenData = await tokenRes.json().catch(() => null)
    token = (tokenData as Record<string, string>)?.accessToken ?? (tokenData as Record<string, string>)?.access_token ?? ''
  } catch (e) {
    return NextResponse.json({ step: 'token', error: String(e) })
  }

  if (!token) {
    return NextResponse.json({ step: 'token', tokenStatus, tokenData })
  }

  if (!nin) {
    return NextResponse.json({ step: 'token_ok', tokenStatus, tokenData, note: 'Add ?nin=XXXXXXXXXXX to test NIN lookup' })
  }

  // Step 2: NIN lookup
  const body = { firstname, lastname, dob: '', phone: '', gender: '' }

  let ninStatus = 0
  let ninData: unknown = null
  try {
    const ninRes = await fetch(`${BASE_URL}/v1/ng/identities/nin/${nin}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    ninStatus = ninRes.status
    ninData = await ninRes.json().catch(() => null)
  } catch (e) {
    return NextResponse.json({ step: 'nin', error: String(e) })
  }

  return NextResponse.json({ step: 'nin', ninStatus, ninData, sentBody: body })
}
