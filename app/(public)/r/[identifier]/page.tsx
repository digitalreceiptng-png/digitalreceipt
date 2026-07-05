import BackButton from '@/components/BackButton'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

export default async function DirectVerifyPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = await params
  const admin = createAdminClient()

  const { data: receipt } = await admin
    .from('receipts')
    .select('*, items:receipt_items(*)')
    .or(`unique_identifier.eq.${identifier},receipt_number.eq.${identifier}`)
    .maybeSingle()

  // Fetch seller branding — sub-account logo takes priority over profile logo
  let sellerLogoUrl: string | null = null
  let sellerIssuerType: string | null = null
  if (receipt?.user_id) {
    if (receipt.sub_account_id) {
      const { data: sub } = await admin
        .from('user_sub_accounts')
        .select('logo_url')
        .eq('id', receipt.sub_account_id)
        .maybeSingle()
      sellerLogoUrl = sub?.logo_url ?? null
    }
    if (!sellerLogoUrl) {
      const { data: profile } = await admin
        .from('profiles')
        .select('logo_url, issuer_type')
        .eq('id', receipt.user_id)
        .maybeSingle()
      sellerLogoUrl = profile?.logo_url ?? null
      sellerIssuerType = profile?.issuer_type ?? null
    }
  }

  // Fetch staff display name if this receipt was issued by a staff member
  let issuedByStaffName: string | null = null
  if (receipt?.issued_by_staff_id) {
    const { data: staffMember } = await admin
      .from('staff_members')
      .select('display_name, profiles!staff_members_staff_id_fkey(full_name)')
      .eq('staff_id', receipt.issued_by_staff_id)
      .maybeSingle()
    if (staffMember) {
      const profileName = Array.isArray(staffMember.profiles)
        ? (staffMember.profiles[0] as any)?.full_name
        : (staffMember.profiles as any)?.full_name
      issuedByStaffName = staffMember.display_name || profileName || null
    }
  }

  if (!receipt) {
    return (
      <div className="py-16 px-4 flex flex-col items-center gap-4 text-center bg-white">
        <div className="w-14 h-14 bg-surface border border-border rounded-full flex items-center justify-center mx-auto">
          <span className="text-danger text-xl font-bold">✕</span>
        </div>
        <h1 className="font-heading text-2xl text-ink">Receipt Not Found</h1>
        <p className="text-ink-muted max-w-sm">
          No receipt exists for identifier{' '}
          <code className="bg-surface px-1.5 py-0.5 rounded text-sm border border-border">
            {identifier}
          </code>
          . It may have been entered incorrectly.
        </p>
      </div>
    )
  }

  const hdrs = await headers()
  const verifyMethod = receipt.receipt_type === 'silver' ? 'code' : 'qr'
  await admin.from('verifications').insert({
    receipt_id: receipt.id,
    unique_identifier: receipt.unique_identifier,
    method: verifyMethod,
    ip_address: hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip'),
    user_agent: hdrs.get('user-agent'),
  })

  const verifiedAt = new Date().toISOString()
  const fullReceipt = receipt as Receipt & { items: ReceiptItem[] }

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-6 bg-surface">
      <div className="w-full max-w-xl">
        <div className="mb-4"><BackButton href="/verify" label="Back to verify" /></div>
      </div>
      <div className="text-center">
        <h1 className="font-heading text-2xl text-ink">Receipt Verification</h1>
        <p className="text-sm text-ink-muted mt-1">Powered by DigitalReceipt.ng</p>
      </div>
      <VerificationCard receipt={fullReceipt} verifiedAt={verifiedAt} method={verifyMethod} sellerLogoUrl={sellerLogoUrl} sellerIssuerType={sellerIssuerType} issuedByStaffName={issuedByStaffName} />
    </div>
  )
}
