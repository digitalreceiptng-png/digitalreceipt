'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function StaffSignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined' && localStorage.getItem('dr_desktop') === '1') {
      window.location.replace('https://www.digitalreceipt.ng/?__drhome=1')
      return
    }
    router.push('/auth/staff-login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-danger border border-red-200 hover:bg-red-50 transition-colors"
    >
      <LogOut size={13} />
      Sign Out
    </button>
  )
}
