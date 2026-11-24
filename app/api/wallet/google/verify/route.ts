import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { importPKCS8, SignJWT } from 'jose'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ANDROID_PACKAGE_NAME = 'com.digitalreciept.final'
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const WALLET_PRODUCTS: Record<string, number> = {
  'new.digitalreceipt.wallet.500': 500,
  'new.digitalreceipt.wallet.1000': 1000,
  'new.digitalreceipt.wallet.2000': 2000,
  'new.digitalreceipt.wallet.5000': 5000,
  'new.digitalreceipt.wallet.10000': 10000,
}

type GoogleProductPurchase = {
  purchaseState?: number
  consumptionState?: number
  productId?: string
  purchaseToken?: string
  quantity?: number
  refundableQuantity?: number
  obfuscatedExternalAccountId?: string
}

function obfuscateAccountId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex')
}

async function getGoogleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY?.replaceAll(String.raw`\n`, '\n')
  if (!email || !privateKey) throw new Error('Google Play service account credentials are not configured.')

  const assertion = await new SignJWT({ scope: GOOGLE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(await importPKCS8(privateKey, 'RS256'))

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok || typeof result.access_token !== 'string') {
    throw new Error('Google Play authorization failed.')
  }
  return result.access_token
}

async function getProductPurchase(productId: string, purchaseToken: string): Promise<GoogleProductPurchase | null> {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  )

  if (response.status === 404) return null
  if (!response.ok) throw new Error('Google Play could not verify this purchase.')
  return response.json()
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  let user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null
  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(authHeader.slice(7))
    user = data.user
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const productId = body?.productId
  const purchaseToken = body?.purchaseToken
  if (
    typeof productId !== 'string' ||
    typeof purchaseToken !== 'string' ||
    purchaseToken.length === 0 ||
    purchaseToken.length > 8192
  ) {
    return NextResponse.json({ error: 'Missing or invalid purchase information.' }, { status: 400 })
  }

  const creditPerProduct = WALLET_PRODUCTS[productId]
  if (!creditPerProduct) return NextResponse.json({ error: 'Unknown in-app purchase product.' }, { status: 400 })

  let purchase: GoogleProductPurchase | null
  try {
    purchase = await getProductPurchase(productId, purchaseToken)
  } catch (error) {
    console.error('[wallet/google/verify]', error instanceof Error ? error.message : 'Google Play verification failed')
    return NextResponse.json({ error: 'Could not verify your purchase yet. It has not been credited.' }, { status: 502 })
  }

  if (!purchase) return NextResponse.json({ error: 'Purchase was not found in Google Play.' }, { status: 400 })
  if (
    purchase.purchaseState !== 0 ||
    purchase.consumptionState !== 0 ||
    purchase.productId !== productId ||
    purchase.purchaseToken !== purchaseToken ||
    purchase.obfuscatedExternalAccountId !== obfuscateAccountId(user.id) ||
    (purchase.quantity ?? 1) !== 1 ||
    purchase.refundableQuantity === 0
  ) {
    return NextResponse.json({ error: 'Google Play purchase details do not match this account.' }, { status: 403 })
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

  const { data, error } = await admin.rpc('credit_wallet_from_google_purchase', {
    p_user_id: user.id,
    p_purchase_token: purchaseToken,
    p_product_id: productId,
    p_credit_amount: creditPerProduct,
  })
  if (error) {
    console.error('[wallet/google/verify] Wallet credit failed:', error.message)
    return NextResponse.json({ error: 'Purchase verified, but wallet credit failed. Contact support with your Google Play order ID.' }, { status: 500 })
  }

  const result = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    success: true,
    alreadyCredited: result?.credited === false,
    creditAmount: creditPerProduct,
    balance: result?.balance ?? 0,
  })
}
