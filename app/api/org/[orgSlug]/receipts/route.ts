import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrgToken } from '@/lib/org-auth'
import { calculateCharge, deductWallet } from '@/lib/wallet'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'

// Collision-safe ID helpers (same pattern as the main receipt route)
async function uniqueId(db: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await db.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber()
    const { data } = await db.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params

  // Verify staff session JWT from cookie
  const token = req.cookies.get(`org_session_${orgSlug}`)?.value
  const session = token ? await verifyOrgToken(token) : null
  if (!session || session.orgSlug !== orgSlug) {
    return NextResponse.json({ error: 'Unauthorized. Please enter your staff PIN.' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty body */ }

  const {
    items,
    buyer_name,
    buyer_email,
    buyer_phone,
    buyer_address,
    total_amount,
    amount_paid = 0,
    payment_method = 'Cash',
    transaction_date,
    receipt_type = 'silver',
    currency = 'NGN',
    notes,
    reference_number,
  } = body as {
    items: { description: string; quantity: number; unitPrice: number }[]
    buyer_name: string
    buyer_email?: string
    buyer_phone?: string
    buyer_address?: string
    total_amount: number
    amount_paid?: number
    payment_method?: string
    transaction_date?: string
    receipt_type?: string
    currency?: string
    notes?: string
    reference_number?: string
  }

  if (!items?.length || !buyer_name || !total_amount) {
    return NextResponse.json({ error: 'buyer_name, total_amount, and at least one item are required.' }, { status: 400 })
  }

  const db = createAdminClient()

  // Fetch org details for seller info
  const { data: org } = await db
    .from('user_sub_accounts')
    .select('id, business_name, logo_url, rc_number, address, phone, email, receipt_footer_text, primary_color, secondary_color')
    .eq('slug', orgSlug)
    .single()

  if (!org) return NextResponse.json({ error: 'Organisation not found.' }, { status: 404 })

  const ownerId = session.ownerUserId

  // Calculate charge from owner's monthly quota
  const { chargedAmount, freeType } = await calculateCharge(ownerId, receipt_type)

  // Pre-check wallet balance to return a clean error before creating the receipt
  if (chargedAmount > 0) {
    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', ownerId).single()
    if (!wallet || wallet.balance < chargedAmount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance. Please top up to continue issuing receipts.', code: 'INSUFFICIENT_BALANCE' },
        { status: 402 }
      )
    }
  }

  // Fetch owner profile for NIN/RC fallback
  const { data: ownerProfile } = await db
    .from('profiles')
    .select('nin, rc_number, phone, email, address')
    .eq('id', ownerId)
    .single()

  const receiptNumber = (reference_number as string) || await uniqueReceiptNumber(db)
  const uniqueIdentifier = await uniqueId(db)

  const { data: receipt, error: receiptErr } = await db
    .from('receipts')
    .insert({
      user_id: ownerId,
      sub_account_id: org.id,
      receipt_number: receiptNumber,
      unique_identifier: uniqueIdentifier,
      receipt_type,
      seller_name: org.business_name,
      seller_phone: org.phone ?? ownerProfile?.phone ?? null,
      seller_email: org.email ?? ownerProfile?.email ?? null,
      seller_address: org.address ?? ownerProfile?.address ?? null,
      seller_rc_number: org.rc_number ?? ownerProfile?.rc_number ?? null,
      seller_nin: ownerProfile?.nin ?? null,
      buyer_name,
      buyer_email: buyer_email ?? null,
      buyer_phone: buyer_phone ?? null,
      buyer_address: buyer_address ?? null,
      total_amount,
      amount_paid,
      balance_due: total_amount - (amount_paid as number),
      payment_method,
      currency,
      transaction_date: transaction_date ?? new Date().toISOString().split('T')[0],
      notes: notes ?? null,
      charged_amount: chargedAmount,
      free_type: freeType,
    })
    .select()
    .single()

  if (receiptErr || !receipt) {
    console.error('[org-receipt] insert error:', receiptErr?.message)
    return NextResponse.json({ error: 'Failed to create receipt.' }, { status: 500 })
  }

  // Insert line items
  await db.from('receipt_items').insert(
    items.map((item, i) => ({
      receipt_id: receipt.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
      sort_order: i,
    }))
  )

  // Deduct wallet if this receipt is charged
  if (chargedAmount > 0) {
    const deduction = await deductWallet(ownerId, chargedAmount, `${receipt_type} receipt — ${buyer_name}`)
    if (!deduction.success) {
      // Receipt was created but deduction failed — log but don't fail the request
      console.error('[org-receipt] wallet deduction failed:', deduction.error)
    }
  }

  return NextResponse.json({ receipt }, { status: 201 })
}
