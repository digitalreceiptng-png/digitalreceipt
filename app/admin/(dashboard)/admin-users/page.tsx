import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { adminHref } from '@/lib/admin-url'
import AdminUsersManager from './AdminUsersManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin Users | Admin Console' }

export default async function AdminUsersPage() {
  const me = await getAdminUser()
  if (!me) redirect(adminHref('/login'))

  const db = createAdminClient()
  const { data: admins } = await db
    .from('admins')
    .select('id, role, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: true })

  const list = (admins ?? []).map((a: any) => ({
    id: a.id,
    role: a.role,
    created_at: a.created_at,
    full_name: a.profiles?.full_name ?? 'Unknown',
    email: a.profiles?.email ?? '',
  }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Admin Users</h1>
        <p className="text-sm text-ink-muted mt-0.5">Manage console access and roles</p>
      </div>
      <AdminUsersManager admins={list} currentId={me.id} isSuperAdmin={me.role === 'super_admin'} />
    </div>
  )
}
