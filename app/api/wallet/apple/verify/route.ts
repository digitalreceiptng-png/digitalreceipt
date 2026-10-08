import { NextRequest, NextResponse } from 'next/server'
import { importPKCS8, SignJWT } from 'jose'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APPLE_BUNDLE_ID = 'new.digitalreceipt'
const WALLET_PRODUCTS: Record<string, number> = {
  'new.digitalreceipt.wallet.500': 500,
  'new.digitalreceipt.wallet.1000': 1000,
  'new.digitalreceipt.wallet.2000': 2000,
  'new.digitalreceipt.wallet.5000': 5000,
  'new.digitalreceipt.wallet.10000': 10000,
}

async function createAppleApiToken(): Promise<string> {
  const issuerId = process.env.APPLE_IAP_ISSUER_ID
  const keyId = process.env.APPLE_IAP_KEY_ID
  const privateKey = process.env.APPLE_IAP_PRIVATE_KEY?.replaceAll(String.raw`\n`, '\n')
  if (!issuerId || !keyId || !privateKey) throw new Error('Apple IAP server credentials are not configured.')

  return new SignJWT({ bid: APPLE_BUNDLE_ID })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(await importPKCS8(privateKey, 'ES256'))
}

function decodeSignedTransaction(signedTransaction: string): Record<string, unknown> {
  const payload = signedTransaction.split('.')[1]
  if (!payload) throw new Error('Apple returned an invalid transaction.')
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

async function getAppleTransaction(transactionId: string, token: string): Promise<Record<string, unknown> | null> {
  const hosts = [
    'https://api.storekit.itunes.apple.com',
    'https://api.storekit-sandbox.itunes.apple.com',
  ]

  for (const host of hosts) {
    const response = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (response.status === 404) continue
    if (!response.ok) throw new Error('Apple could not verify this purchase.')

    const result = await response.json()
    if (typeof result.signedTransactionInfo !== 'string') throw new Error('Apple returned no signed transaction.')
    return decodeSignedTransaction(result.signedTransactionInfo)
  }

  return null
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  let user: any = null
  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, transactionId } = await request.json().catch(() => ({}))
  if (typeof productId !== 'string' || typeof transactionId !== 'string' || !transactionId.trim()) {
    return NextResponse.json({ error: 'Missing purchase information.' }, { status: 400 })
  }

  const creditAmount = WALLET_PRODUCTS[productId]
  if (!creditAmount) return NextResponse.json({ error: 'Unknown in-app purchase product.' }, { status: 400 })

  let appleTransaction: Record<string, unknown> | null
  try {
    appleTransaction = await getAppleTransaction(transactionId, await createAppleApiToken())
  } catch (error) {
    console.error('[wallet/apple/verify]', error instanceof Error ? error.message : 'Apple verification failed')
    return NextResponse.json({ error: 'Could not verify your purchase yet. It has not been credited.' }, { status: 502 })
  }

  if (!appleTransaction) return NextResponse.json({ error: 'Purchase was not found in Apple’s store.' }, { status: 400 })
  if (
    appleTransaction.bundleId !== APPLE_BUNDLE_ID ||
    appleTransaction.transactionId !== transactionId ||
    appleTransaction.productId !== productId ||
    typeof appleTransaction.appAccountToken !== 'string' ||
    appleTransaction.appAccountToken.toLowerCase() !== user.id.toLowerCase() ||
    appleTransaction.revocationDate
  ) {
    return NextResponse.json({ error: 'Apple purchase details do not match this account.' }, { status: 403 })
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email: user.email ?? null,
    full_name: String(user.user_metadata?.full_name ?? 'Guest issuer'),
    issuer_type: 'individual',
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (profileError) return NextResponse.json({ error: 'Could not prepare your wallet.' }, { status: 500 })

  const { error: walletError } = await admin
    .from('wallets')
    .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (walletError) return NextResponse.json({ error: 'Could not prepare your wallet.' }, { status: 500 })

  const { data, error } = await admin.rpc('credit_wallet_from_apple_purchase', {
    p_user_id: user.id,
    p_transaction_id: transactionId,
    p_product_id: productId,
    p_credit_amount: creditAmount,
  })
  if (error) {
    console.error('[wallet/apple/verify] Wallet credit failed:', error.message)
    return NextResponse.json({ error: 'Purchase verified, but wallet credit failed. Contact support with your Apple transaction ID.' }, { status: 500 })
  }

  const result = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    success: true,
    alreadyCredited: result?.credited === false,
    creditAmount,
    balance: result?.balance ?? 0,
  })
}