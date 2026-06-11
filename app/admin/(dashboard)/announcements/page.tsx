import { createAdminClient } from '@/lib/supabase/admin'
import { Megaphone } from 'lucide-react'
import AnnouncementsManager from './AnnouncementsManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Announcements | Admin Console' }

export default async function AdminAnnouncementsPage() {
  const db = createAdminClient()
  const { data: announcements } = await db
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Announcements</h1>
        <p className="text-sm text-ink-muted mt-0.5">Site-wide banners shown to all visitors</p>
      </div>
      <AnnouncementsManager announcements={announcements ?? []} />
    </div>
  )
}
