import { createAdminClient } from '@/lib/supabase/admin'
import { Handshake } from 'lucide-react'
import PartnersManager from './PartnersManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partners | Admin Console' }

export default async function AdminPartnersPage() {
  const db = createAdminClient()
  const { data: partners } = await db
    .from('partners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Partners</h1>
        <p className="text-sm text-ink-muted mt-0.5">Manage partner logos shown on the homepage</p>
      </div>
      <PartnersManager partners={partners ?? []} />
    </div>
  )
}
