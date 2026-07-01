import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const admin = createAdminClient()

  // Look up by unique_identifier only (manual verification)
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('id, receipt_number, unique_identifier, receipt_type, seller_name, seller_phone, seller_email, seller_rc_number, buyer_name, buyer_phone, subtotal, discount, tax, total_amount, payment_method, transaction_date, status, notes, column_labels, verification_expires_at, items:receipt_items(description, quantity, unit_price, total_price, sort_order)')
    .eq('unique_identifier', identifier)
    .maybeSingle()

  if (error || !receipt) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  // Check for previous verifications
  const { data: previousVerifications } = await admin
    .from('verifications')
    .select('verified_at, method')
    .eq('unique_identifier', receipt.unique_identifier)
    .order('verified_at', { ascending: false })
    .limit(5)

  const forceVerify = request.nextUrl.searchParams.get('force') === '1'
  const hasPrevious = previousVerifications && previousVerifications.length > 0

  // If previously verified and not forcing, return previous info without logging
  if (hasPrevious && !forceVerify) {
    return NextResponse.json({
      found: true,
      receipt,
      previouslyVerified: true,
      lastVerifiedAt: previousVerifications[0].verified_at,
      verificationCount: previousVerifications.length,
    })
  }

  // Log the verification
  await admin.from('verifications').insert({
    receipt_id: receipt.id,
    unique_identifier: receipt.unique_identifier,
    method: 'search',
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
    user_agent: request.headers.get('user-agent'),
  })

  return NextResponse.json({ found: true, receipt, previouslyVerified: false })
}
