import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOrgToken } from '@/lib/org-auth'
import PinGate from './PinGate'
import ReceiptForm from './ReceiptForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const db = createAdminClient()
  const { data: org } = await db
    .from('user_sub_accounts')
    .select('business_name')
    .eq('slug', orgSlug)
    .single()
  return { title: org ? `Issue Receipt — ${org.business_name}` : 'Issue Receipt' }
}

export default async function GenerateReceiptPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const db = createAdminClient()

  const { data: org } = await db
    .from('user_sub_accounts')
    .select('id, business_name, logo_url, primary_color, secondary_color, receipt_footer_text, address, phone, email, rc_number, staff_pin_hash')
    .eq('slug', orgSlug)
    .single()

  // 404 if org doesn't exist or hasn't set up a PIN yet
  if (!org || !org.staff_pin_hash) notFound()

  // Check for a valid staff session
  const jar = await cookies()
  const token = jar.get(`org_session_${orgSlug}`)?.value
  const session = token ? await verifyOrgToken(token) : null
  const isAuthenticated = !!session && session.orgSlug === orgSlug

  const branding = {
    businessName: org.business_name as string,
    logoUrl: (org.logo_url as string | null) ?? null,
    primaryColor: (org.primary_color as string | null) ?? '#0d6b1e',
    secondaryColor: (org.secondary_color as string | null) ?? '#e8f5ec',
    address: (org.address as string | null) ?? null,
    phone: (org.phone as string | null) ?? null,
    email: (org.email as string | null) ?? null,
    rcNumber: (org.rc_number as string | null) ?? null,
    footerText: (org.receipt_footer_text as string | null) ?? null,
  }

  return (
    <div className="min-h-screen" style={{ background: `${branding.secondaryColor}55` }}>
      {isAuthenticated ? (
        <ReceiptForm orgSlug={orgSlug} branding={branding} />
      ) : (
        <PinGate orgSlug={orgSlug} branding={branding} />
      )}
    </div>
  )
}
