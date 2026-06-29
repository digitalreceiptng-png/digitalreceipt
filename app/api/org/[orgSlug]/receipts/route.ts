import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrgToken } from '@/lib/org-auth'
import { calculateCharge, deductWallet } from '@/lib/wallet'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'

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

  const token = req.cookies.get(`org_session_${orgSlug}`)?.value
  const session = token ? await verifyOrgToken(token) : null
  if (!session || session.orgSlug !== orgSlug) {
    return NextResponse.json({ error: 'Unauthorized. Please enter your staff PIN.' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty body */ }

  const { items, currency = 'NGN', ...rest } = body
  const receipt_type: string = (rest.receipt_type as string) ?? 'silver'

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required.' }, { status: 400 })
  }
  if (!rest.buyer_name) {
    return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 })
  }
  if (!rest.total_amount) {
    return NextResponse.json({ error: 'Total amount is required.' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: org } = await db
    .from('user_sub_accounts')
    .select('id, business_name, rc_number, address, phone, email')
    .eq('slug', orgSlug)
    .single()

  if (!org) return NextResponse.json({ error: 'Organisation not found.' }, { status: 404 })

  const ownerId = session.ownerUserId
  const { chargedAmount, freeType } = await calculateCharge(ownerId, receipt_type)

  if (chargedAmount > 0) {
    const { data: wallet } = await db.from('wallets').select('balance').eq('user_id', ownerId).single()
    const balance = wallet?.balance ?? 0
    if (balance < chargedAmount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance.', code: 'INSUFFICIENT_BALANCE', required: chargedAmount, balance, shortfall: chargedAmount - balance },
        { status: 402 }
      )
    }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('nin, rc_number, phone, email, address')
    .eq('id', ownerId)
    .single()

  const unique_identifier = await uniqueId(db)
  const receipt_number = rest.reference_number
    ? String(rest.reference_number).trim()
    : await uniqueReceiptNumber(db)

  // Match main route insert shape exactly — spread rest fields so all columns go through
  const receiptFields = {
    buyer_phone:      rest.buyer_phone      ?? '',
    buyer_email:      rest.buyer_email      ?? '',
    buyer_address:    rest.buyer_address    ?? '',
    buyer_name:       rest.buyer_name,
    total_amount:     rest.total_amount,
    amount_paid:      rest.amount_paid      ?? 0,
    balance_due:      rest.balance_due      ?? null,
    overpaid:         rest.overpaid         ?? null,
    payment_method:   rest.payment_method   ?? 'Cash',
    transaction_date: rest.transaction_date ?? new Date().toISOString().split('T')[0],
    notes:            rest.notes            ?? null,
    subtotal:         rest.subtotal         ?? rest.total_amount,
    discount:         rest.discount         ?? 0,
    tax:              rest.tax              ?? 0,
    reference_label:  rest.reference_label  ?? null,
    column_labels:    rest.column_labels    ?? null,
  }

  const { data: newReceipt, error: receiptError } = await db
    .from('receipts')
    .insert({
      user_id:          ownerId,
      sub_account_id:   org.id,
      receipt_number,
      unique_identifier,
      receipt_type,
      seller_name:      org.business_name,
      seller_phone:     org.phone  ?? profile?.phone  ?? '',
      seller_email:     org.email  ?? profile?.email  ?? '',
      seller_address:   org.address ?? profile?.address ?? '',
      seller_rc_number: org.rc_number ?? profile?.rc_number ?? null,
      seller_nin:       profile?.nin ?? null,
      charged_amount:   chargedAmount,
      free_type:        freeType,
      currency,
      ...receiptFields,
    })
    .select()
    .single()

  if (receiptError) {
    console.error('[org-receipt] insert error:', receiptError.message)
    return NextResponse.json({ error: receiptError.message }, { status: 500 })
  }

  if (items.length > 0) {
    await db.from('receipt_items').insert(
      (items as { description: string; quantity: number; unitPrice: number; totalPrice: number }[]).map((item, idx) => ({
        receipt_id:  newReceipt.id,
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unitPrice,
        total_price: item.totalPrice ?? item.quantity * item.unitPrice,
        sort_order:  idx,
      }))
    )
  }

  if (chargedAmount > 0) {
    const tierLabel = receipt_type.charAt(0).toUpperCase() + receipt_type.slice(1)
    const deduction = await deductWallet(ownerId, chargedAmount, `${tierLabel} Receipt — ${receipt_number}`, newReceipt.id)
    if (!deduction.success) {
      console.error('[org-receipt] wallet deduction failed:', deduction.error, newReceipt.id)
    }
  }

  return NextResponse.json({ receipt: newReceipt }, { status: 201 })
}
