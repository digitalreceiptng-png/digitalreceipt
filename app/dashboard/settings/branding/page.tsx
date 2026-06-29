import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Palette } from 'lucide-react'
import BrandingPanel from './BrandingPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branding Settings — DigitalReceipt.ng' }

export default async function BrandingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: subAccounts } = await db
    .from('user_sub_accounts')
    .select('id, business_name, logo_url, slug, primary_color, secondary_color, receipt_footer_text, staff_pin_hash, phone, email, address, rc_number')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Palette size={22} className="text-forest shrink-0" />
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
            Branding Settings
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Set up your branded receipt page for staff
          </p>
        </div>
      </div>

      {!subAccounts || subAccounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">No company sub-accounts found</p>
          <p className="text-amber-700">
            You need to create a company profile first.{' '}
            <Link href="/dashboard/profile" className="underline font-medium">
              Set up your company
            </Link>
          </p>
        </div>
      ) : (
        <BrandingPanel subAccounts={subAccounts as any[]} />
      )}
    </div>
  )
}
