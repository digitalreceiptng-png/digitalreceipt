import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueIdentifier, generateReceiptNumber } from '@/lib/generateIds'

const MONTHLY_LIMIT = 10

function extractStateCode(address?: string | null): string {
  if (!address) return 'NG'
  const a = address.toLowerCase()
  if (a.includes('abuja') || a.includes('fct')) return 'ABJ'
  if (a.includes('lagos')) return 'LGS'
  if (a.includes('kano')) return 'KAN'
  if (a.includes('port harcourt') || a.includes('rivers')) return 'PH'
  if (a.includes('ibadan') || a.includes('oyo')) return 'IBD'
  if (a.includes('enugu')) return 'ENU'
  if (a.includes('benin') || a.includes('edo')) return 'BEN'
  if (a.includes('kaduna')) return 'KAD'
  if (a.includes('jos') || a.includes('plateau')) return 'JOS'
  return 'NG'
}

async function uniqueId(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateUniqueIdentifier()
    const { data } = await admin.from('receipts').select('id').eq('unique_identifier', id).maybeSingle()
    if (!data) return id
  }
  throw new Error('Could not generate unique identifier')
}

async function uniqueReceiptNumber(admin: ReturnType<typeof createAdminClient>, stateCode: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const num = generateReceiptNumber(stateCode)
    const { data } = await admin.from('receipts').select('id').eq('receipt_number', num).maybeSingle()
    if (!data) return num
  }
  throw new Error('Could not generate unique receipt number')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Monthly limit check
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('receipts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', firstOfMonth)

  const limit = profile.monthly_limit_override ?? MONTHLY_LIMIT
  if ((count ?? 0) >= limit) {
    return NextResponse.json({ error: 'Monthly limit reached', code: 'LIMIT_REACHED' }, { status: 429 })
  }

  const body = await request.json()
  const { items, ...rest } = body

  // Coerce optional buyer fields to empty string so NOT NULL columns don't reject
  const receiptFields = {
    ...rest,
    buyer_phone:   rest.buyer_phone   ?? '',
    buyer_email:   rest.buyer_email   ?? '',
    buyer_address: rest.buyer_address ?? '',
  }

  const admin = createAdminClient()
  const stateCode = extractStateCode(profile.address)
  const unique_identifier = await uniqueId(admin)
  const receipt_number = await uniqueReceiptNumber(admin, stateCode)

  const sellerName = profile.issuer_type === 'business'
    ? (profile.business_name || profile.full_name)
    : profile.full_name

  const { data: newReceipt, error: receiptError } = await admin
    .from('receipts')
    .insert({
      user_id: user.id,
      receipt_number,
      unique_identifier,
      receipt_type: receiptFields.receipt_type ?? 'silver',
      seller_name: sellerName,
      seller_phone: profile.phone ?? '',
      seller_email: profile.email,
      seller_address: profile.address,
      seller_rc_number: profile.rc_number,
      seller_nin: profile.nin,
      ...receiptFields,
    })
    .select()
    .single()

  if (receiptError) return NextResponse.json({ error: receiptError.message }, { status: 500 })

  if (items?.length > 0) {
    await admin.from('receipt_items').insert(
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

  return NextResponse.json({ receipt: newReceipt }, { status: 201 })
}
