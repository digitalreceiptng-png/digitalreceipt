import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'
import { calculateCharge, deductWallet } from '@/lib/wallet'
import { cookies } from 'next/headers'
import { logActivity } from '@/lib/activity'


async function uniqueId(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await admin.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber()
    const { data } = await admin.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Check if this user is a staff member acting on behalf of a business owner
  const { data: staffRow } = await adminDb
    .from('staff_members')
    .select('owner_id, can_create_receipts')
    .eq('staff_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (staffRow && !staffRow.can_create_receipts) {
    return NextResponse.json({ error: 'You do not have permission to create receipts' }, { status: 403 })
  }

  // Use owner's account if staff member, otherwise use their own
  const billingUserId = staffRow ? staffRow.owner_id : user.id
  const issuedByStaffId = staffRow ? user.id : null

  const { data: profile } = await adminDb.from('profiles').select('*').eq('id', billingUserId).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' }, { status: 404 })

  // Check for active sub-account (company profile switcher)
  const jar = await cookies()
  const activeSubId = jar.get('active_sub_account')?.value ?? null
  let activeSubAccount: { id: string; business_name: string; rc_number: string; phone?: string | null; email?: string | null; address?: string | null; logo_url?: string | null } | null = null
  if (activeSubId && !staffRow) {
    const { data: sub } = await adminDb
      .from('user_sub_accounts')
      .select('id, business_name, rc_number, phone, email, address, logo_url')
      .eq('id', activeSubId)
      .eq('owner_user_id', billingUserId)
      .single()
    activeSubAccount = sub ?? null
  }

  const body = await request.json()
  const { items, currency = 'NGN', attachment_urls, ...rest } = body
  const receiptType: string = rest.receipt_type ?? 'silver'

  // ── Wallet / free quota logic ──────────────────────────────────────────────
  const { chargedAmount, freeType } = await calculateCharge(billingUserId, receiptType)

  if (chargedAmount > 0) {
    const { data: wallet } = await adminDb
      .from('wallets')
      .select('balance')
      .eq('user_id', billingUserId)
      .single()

    const balance = wallet?.balance ?? 0
    if (balance < chargedAmount) {
      return NextResponse.json(
        {
          error: 'Insufficient wallet balance',
          code: 'INSUFFICIENT_BALANCE',
          required: chargedAmount,
          balance,
          shortfall: chargedAmount - balance,
        },
        { status: 402 }
      )
    }
  }

  // ── Insert receipt ─────────────────────────────────────────────────────────
  const receiptFields = {
    ...rest,
    buyer_phone:   rest.buyer_phone   ?? '',
    buyer_email:   rest.buyer_email   ?? '',
    buyer_address: rest.buyer_address ?? '',
  }

  const unique_identifier = await uniqueId(adminDb)
  // Use reference number as receipt number if provided, otherwise auto-generate
  const receipt_number = rest.reference_number?.trim()
    ? rest.reference_number.trim()
    : await uniqueReceiptNumber(adminDb)

  // If a company sub-account is active, use its details as the seller
  const sellerName = activeSubAccount
    ? activeSubAccount.business_name
    : profile.issuer_type === 'business'
      ? (profile.business_name || profile.full_name)
      : profile.full_name

  const sellerRc = activeSubAccount ? activeSubAccount.rc_number : (profile.rc_number ?? null)

  const { data: newReceipt, error: receiptError } = await adminDb
    .from('receipts')
    .insert({
      user_id: billingUserId,
      issued_by_staff_id: issuedByStaffId,
      sub_account_id: activeSubAccount?.id ?? null,
      receipt_number,
      unique_identifier,
      receipt_type: receiptType,
      seller_name: sellerName,
      seller_phone: activeSubAccount?.phone || profile.phone || '',
      seller_email: activeSubAccount?.email || profile.email,
      seller_address: activeSubAccount?.address || profile.address,
      seller_rc_number: sellerRc,
      seller_nin: profile.nin,
      charged_amount: chargedAmount,
      free_type: freeType,
      currency,
      attachment_urls: attachment_urls ?? null,
      ...receiptFields,
    })
    .select()
    .single()

  if (receiptError) return NextResponse.json({ error: receiptError.message }, { status: 500 })

  // ── Deduct wallet if charged ───────────────────────────────────────────────
  if (chargedAmount > 0) {
    const tierLabel = receiptType.charAt(0).toUpperCase() + receiptType.slice(1)
    const deduction = await deductWallet(
      billingUserId,
      chargedAmount,
      `${tierLabel} Receipt — ${receipt_number}`,
      newReceipt.id
    )
    if (!deduction.success) {
      console.error('Wallet deduction failed after receipt insert:', deduction.error, newReceipt.id)
    }
  }

  // ── Insert line items ──────────────────────────────────────────────────────
  if (items?.length > 0) {
    await adminDb.from('receipt_items').insert(
      items.map((item: { description: string; quantity: number; unitPrice: number; totalPrice: number }, idx: number) => ({
        receipt_id: newReceipt.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        sort_order: idx,
      }))
    )
  }

  await logActivity({
    userId: billingUserId,
    type: 'receipt_created',
    title: `Receipt issued to ${newReceipt.buyer_name}`,
    description: `${receiptType.charAt(0).toUpperCase() + receiptType.slice(1)} receipt ${receipt_number}`,
    entityId: newReceipt.id,
    entityType: 'receipt',
    meta: { receipt_number, receipt_type: receiptType, amount: newReceipt.total_amount },
  })

  // Send a copy to the issuer's email — prefer sub-account email if available
  const issuerEmail = activeSubAccount?.email || profile.email
  if (issuerEmail) {
    const origin = request.nextUrl.origin
    fetch(`${origin}/api/receipts/${newReceipt.id}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({ email: issuerEmail, issuerCopy: true }),
    }).catch(() => {})
  }

  return NextResponse.json({ receipt: newReceipt }, { status: 201 })
}
