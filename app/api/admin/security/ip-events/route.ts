import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.nextUrl.searchParams.get('ip')
  if (!ip) return NextResponse.json({ error: 'ip required' }, { status: 400 })

  const db = createAdminClient()
  const [{ data: events }, { data: blocked }, { data: threat }] = await Promise.all([
    db.from('security_events')
      .select('id, event_type, details, path, user_agent, created_at')
      .eq('ip', ip)
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('blocked_ips')
      .select('reason, score, blocked_at, expires_at, country')
      .eq('ip', ip)
      .order('blocked_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('threat_scores')
      .select('score, reason, last_seen')
      .eq('ip', ip)
      .maybeSingle(),
  ])

  return NextResponse.json({ events: events ?? [], blocked, threat })
}
