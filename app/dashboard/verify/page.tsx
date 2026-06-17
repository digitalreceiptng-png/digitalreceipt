import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import VerifyForm from '@/components/dashboard/VerifyForm'

export default async function VerifyAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()

  // Already verified — redirect away
  if (profile?.is_verified) redirect('/dashboard/profile')

  return (
    <div className="p-6 max-w-lg mx-auto">
      <VerifyForm profile={profile} userEmail={user.email ?? ''} />
    </div>
  )
}
