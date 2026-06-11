import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, subject, message } = body

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('support_tickets').insert({ name, email, subject, message })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
