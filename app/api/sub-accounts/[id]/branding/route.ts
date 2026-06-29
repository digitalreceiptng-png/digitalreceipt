import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashPin } from '@/lib/org-auth'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verify the requesting user owns this sub-account
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: existing } = await db
    .from('user_sub_accounts')
    .select('id, owner_user_id, business_name')
    .eq('id', id)
    .single()

  if (!existing || existing.owner_user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* empty body */ }

  const updates: Record<string, unknown> = {}

  if (body.primary_color !== undefined) updates.primary_color = body.primary_color
  if (body.secondary_color !== undefined) updates.secondary_color = body.secondary_color
  if (body.receipt_footer_text !== undefined) updates.receipt_footer_text = body.receipt_footer_text
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.email !== undefined) updates.email = body.email
  if (body.address !== undefined) updates.address = body.address

  // Handle slug: validate and ensure uniqueness
  if (body.slug !== undefined) {
    const raw = String(body.slug).trim()
    if (!/^[a-z0-9-]{3,50}$/.test(raw)) {
      return NextResponse.json(
        { error: 'Slug must be 3–50 characters: lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      )
    }
    const { data: conflict } = await db
      .from('user_sub_accounts')
      .select('id')
      .eq('slug', raw)
      .neq('id', id)
      .maybeSingle()
    if (conflict) {
      return NextResponse.json({ error: 'That slug is already taken. Choose a different one.' }, { status: 409 })
    }
    updates.slug = raw
  }

  // Handle PIN change: hash before storing
  if (body.pin !== undefined) {
    const pin = String(body.pin)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 6 digits.' }, { status: 400 })
    }
    updates.staff_pin_hash = await hashPin(pin, id)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { data: updated, error } = await db
    .from('user_sub_accounts')
    .update(updates)
    .eq('id', id)
    .select('id, business_name, logo_url, slug, primary_color, secondary_color, receipt_footer_text, phone, email, address, staff_pin_hash')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Never return the pin hash to the client
  const { staff_pin_hash, ...safe } = updated
  return NextResponse.json({ subAccount: { ...safe, hasPin: !!staff_pin_hash } })
}
