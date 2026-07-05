import { NextRequest, NextResponse } from 'next/server'

// Supabase calls this webhook when it needs to send a phone OTP.
// It POSTs { phone, otp } and we forward it to Termii.
export async function POST(request: NextRequest) {
  const secret = process.env.SMS_WEBHOOK_SECRET
  if (secret) {
    const authHeader = request.headers.get('authorization') ?? ''
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await request.json()
  const { phone, otp } = body

  if (!phone || !otp) {
    return NextResponse.json({ error: 'Missing phone or otp' }, { status: 400 })
  }

  const apiKey = process.env.TERMII_API_KEY
  // Use N-Alert sender ID between 10pm–6am (gets through DND numbers)
  const hour = new Date().getUTCHours() + 1 // WAT = UTC+1
  const isNight = hour >= 22 || hour < 6
  const senderId = isNight
    ? (process.env.TERMII_SENDER_ID_NIGHT ?? process.env.TERMII_SENDER_ID ?? 'N-Alert')
    : (process.env.TERMII_SENDER_ID ?? 'DReceipt')

  if (!apiKey) {
    return NextResponse.json({ error: 'SMS not configured' }, { status: 500 })
  }

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to: phone,
      from: senderId,
      sms: `Your DigitalReceipt.ng verification code is: ${otp}. Valid for 10 minutes.`,
      type: 'plain',
      channel: 'generic',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Termii SMS error:', err)
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
