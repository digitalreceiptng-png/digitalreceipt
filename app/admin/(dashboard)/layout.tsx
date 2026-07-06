import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: 'Admin Console | DigitalReceipt.ng' }

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminUser()

  if (!admin) {
    redirect('/admin/login')
  }

  const db = createAdminClient()
  const { count: notifCount } = await db
    .from('system_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('resolved', false)

  return (
    <div className="flex min-h-screen" style={{ background: 'oklch(0.97 0.006 145)' }}>
      <AdminSidebar admin={admin} notifCount={notifCount ?? 0} />
      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
