import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Palette } from 'lucide-react'
import BrandingPanel from './BrandingPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branding Settings — DigitalReceipt.ng' }

export default async function BrandingSettingsPage({ searchParams }: { searchParams: Promise<{ sub?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const jar = await cookies()
  const cookieSubId = jar.get('active_sub_account')?.value ?? null
  const { sub: paramSubId } = await searchParams
  const activeSubId = paramSubId ?? cookieSubId

  const db = createAdminClient()

  // Fetch main profile
  const { data: profile } = await db
    .from('profiles')
    .select('full_name, business_name, logo_url, phone, email, address')
    .eq('id', user.id)
    .single()

  // Fetch all sub-accounts including primary
  const { data: allSubs } = await db
    .from('user_sub_accounts')
    .select('id, business_name, logo_url, slug, primary_color, secondary_color, receipt_footer_text, staff_pin_hash, phone, email, address, rc_number, is_primary_profile')
    .eq('owner_user_id', user.id)
    .order('is_primary_profile', { ascending: false }) // primary first
    .order('created_at', { ascending: true })

  const subAccounts = allSubs ?? []

  // Sort: primary profile always first, then by created_at
  subAccounts.sort((a, b) => ((b as any).is_primary_profile ? 1 : 0) - ((a as any).is_primary_profile ? 1 : 0))

  // Auto-create primary profile sub-account if it doesn't exist yet
  let finalSubs = subAccounts
  const hasPrimary = subAccounts.some(s => (s as any).is_primary_profile)
  if (!hasPrimary) {
    const businessName = profile?.business_name?.trim() || profile?.full_name?.trim() || 'My Business'
    const { data: created, error: createErr } = await db
      .from('user_sub_accounts')
      .insert({
        owner_user_id: user.id,
        business_name: businessName,
        rc_number: '',
        logo_url: profile?.logo_url ?? null,
        phone: profile?.phone ?? null,
        email: user.email ?? null,
        address: profile?.address ?? null,
        is_verified: true,
        is_primary_profile: true,
      })
      .select('id, business_name, logo_url, slug, primary_color, secondary_color, receipt_footer_text, staff_pin_hash, phone, email, address, rc_number, is_primary_profile')
      .single()
    if (created) finalSubs = [created, ...subAccounts]
    else console.error('[branding] primary profile auto-create failed:', createErr?.message)
  }

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

      {finalSubs.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">No company profiles found</p>
          <p className="text-amber-700">
            You need to create a company profile first.{' '}
            <Link href="/dashboard/profile" className="underline font-medium">
              Set up your company
            </Link>
          </p>
        </div>
      ) : (
        <BrandingPanel subAccounts={finalSubs as any[]} activeSubId={activeSubId} />
      )}
    </div>
  )
}
