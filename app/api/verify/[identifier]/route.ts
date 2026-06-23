import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params
  const admin = createAdminClient()

  // Look up by unique_identifier only (manual verification)
  const { data: receipt, error } = await admin
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .eq('unique_identifier', identifier)
    .maybeSingle()

  if (error || !receipt) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  // Log the verification
  await admin.from('verifications').insert({
    receipt_id: receipt.id,
    unique_identifier: receipt.unique_identifier,
    method: 'search',
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
    user_agent: request.headers.get('user-agent'),
  })

  return NextResponse.json({ found: true, receipt })
}
