import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser(req: NextRequest) {
  const db = createAdminClient()
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(authHeader.slice(7))
    if (data.user) return data.user
  }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  // Verify ownership
  const { data: member } = await db.from('staff_members')
    .select('owner_id, staff_id, access_level, can_view_all_receipts, can_create_receipts, can_view_wallet, owner_id')
    .eq('id', id).single()
  if (!member || member.owner_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const allowed = ['can_create_receipts', 'can_view_all_receipts', 'can_view_wallet', 'role', 'is_active', 'display_name', 'otp_validity_minutes', 'access_level']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { error } = await db.from('staff_members').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync app_metadata so the JWT (and proxy) immediately reflects updated permissions
  if (member.staff_id) {
    const newAccessLevel = (update.access_level as string | undefined) ?? member.access_level
    const newCanViewAll = (update.can_view_all_receipts as boolean | undefined) ?? member.can_view_all_receipts
    const newCanCreate = (update.can_create_receipts as boolean | undefined) ?? member.can_create_receipts
    const newCanViewWallet = (update.can_view_wallet as boolean | undefined) ?? member.can_view_wallet

    await db.auth.admin.updateUserById(member.staff_id, {
      app_metadata: {
        is_staff: true,
        staff_member_id: id,
        access_level: newAccessLevel,
        owner_user_id: member.owner_id,
        can_view_all_receipts: newCanViewAll,
        can_create_receipts: newCanCreate,
        can_view_wallet: newCanViewWallet,
      },
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const { data: member } = await db.from('staff_members').select('owner_id').eq('id', id).single()
  if (!member || member.owner_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await db.from('staff_members').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
