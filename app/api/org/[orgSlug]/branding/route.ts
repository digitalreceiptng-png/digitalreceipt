import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public endpoint — returns org branding (never PIN hash or owner ID)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params
  const db = createAdminClient()

  const { data: org } = await db
    .from('user_sub_accounts')
    .select('id, business_name, logo_url, primary_color, secondary_color, receipt_footer_text, address, phone, email, rc_number')
    .eq('slug', orgSlug)
    .single()

  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })

  return NextResponse.json({ org }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
