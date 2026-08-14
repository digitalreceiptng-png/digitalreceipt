import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const admin = createAdminClient()

  // Look up by unique_identifier only (manual verification)
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('id, receipt_number, unique_identifier, receipt_type, seller_name, seller_phone, seller_email, seller_rc_number, buyer_name, buyer_phone, subtotal, discount, tax, total_amount, payment_method, transaction_date, status, notes, column_labels, verification_expires_at, user_id, sub_account_id, items:receipt_items(description, quantity, unit_price, total_price, sort_order)')
    .eq('unique_identifier', identifier)
    .maybeSingle()

  if (error || !receipt) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  // Seller branding — sub-account logo takes priority over profile logo, same
  // resolution order as the /r/[identifier] direct-link verify page.
  let sellerLogoUrl: string | null = null
  let sellerIssuerType: string | null = null
  if (receipt.sub_account_id) {
    const { data: sub } = await admin
      .from('user_sub_accounts')
      .select('logo_url')
      .eq('id', receipt.sub_account_id)
      .maybeSingle()
    sellerLogoUrl = sub?.logo_url ?? null
  }
  if (!sellerLogoUrl) {
    const { data: profile } = await admin
      .from('profiles')
      .select('logo_url, issuer_type')
      .eq('id', receipt.user_id)
      .maybeSingle()
    sellerLogoUrl = profile?.logo_url ?? null
    sellerIssuerType = profile?.issuer_type ?? null
  }

  // Don't leak internal account IDs to the client — they were only needed above
  // to resolve the branding.
  const { user_id: _userId, sub_account_id: _subAccountId, ...publicReceipt } = receipt

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
      receipt: publicReceipt,
      sellerLogoUrl,
      sellerIssuerType,
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

  return NextResponse.json({ found: true, receipt: publicReceipt, sellerLogoUrl, sellerIssuerType, previouslyVerified: false })
}
