import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const db = createAdminClient()
  let user: any = null
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    user = data.user ?? null
  }
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await req.json()

  const { data: profile } = await db.from('profiles').select('issuer_type, is_verified').eq('id', user.id).single()

  if (!profile?.is_verified) {
    return NextResponse.json(
      { error: 'You must complete identity verification before funding your wallet. Go to your profile to verify.' },
      { status: 403 }
    )
  }

  const minTopup = profile?.issuer_type === 'business' ? 1000 : 500
  const MAX_TOPUP = 10_000_000
  if (
    !amount || typeof amount !== 'number' ||
    !isFinite(amount) || isNaN(amount) ||
    amount < minTopup || amount > MAX_TOPUP
  ) {
    return NextResponse.json({ error: `Minimum top-up is ₦${minTopup.toLocaleString()}` }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? 'https://digitalreceipt.ng'
  const callbackUrl = `${origin}/dashboard/wallet`

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: amount * 100,
      callback_url: callbackUrl,
      metadata: { user_id: user.id, purpose: 'wallet_topup' },
    }),
  })

  const data = await res.json()
  if (!data.status) return NextResponse.json({ error: data.message ?? 'Could not initialize payment' }, { status: 400 })

  return NextResponse.json({
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  })
}
