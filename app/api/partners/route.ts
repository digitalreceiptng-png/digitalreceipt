import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('partners')
    .select('id, name, logo_url, website_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ partners: [] })
  return NextResponse.json({ partners: data ?? [] })
}
