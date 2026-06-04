import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
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

  if (!receipt) {
    return (
      <div className="py-16 px-4 flex flex-col items-center gap-4 text-center">
        <div className="text-5xl">❌</div>
        <h1 className="font-heading text-2xl text-[#0f1f13]">Receipt Not Found</h1>
        <p className="text-[#4a6b55] max-w-sm">
          No receipt exists for identifier <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">{identifier}</code>.
          It may have been entered incorrectly.
        </p>
      </div>
    )
  }

  // Log the verification
  const hdrs = await headers()
  await admin.from('verifications').insert({
    receipt_id: receipt.id,
    unique_identifier: receipt.unique_identifier,
    method: 'qr',
    ip_address: hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip'),
    user_agent: hdrs.get('user-agent'),
  })

  const verifiedAt = new Date().toISOString()
  const fullReceipt = receipt as Receipt & { items: ReceiptItem[] }

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl text-[#0f1f13]">Receipt Verification</h1>
        <p className="text-sm text-[#4a6b55] mt-1">Powered by DigitalReceipt.ng</p>
      </div>
      <VerificationCard receipt={fullReceipt} verifiedAt={verifiedAt} method="qr" />
    </div>
  )
}
