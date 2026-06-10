import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira, formatDate, formatDateTime } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'

const TIER_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  silver:   { label: 'Silver',   color: 'oklch(0.42 0.18 145)', bg: 'oklch(0.96 0.02 145)', border: 'oklch(0.82 0.06 145)' },
  gold:     { label: 'Gold',     color: 'oklch(0.58 0.15 75)',  bg: 'oklch(0.97 0.025 75)', border: 'oklch(0.84 0.08 75)'  },
  diamond:  { label: 'Diamond',  color: 'oklch(0.48 0.14 230)', bg: 'oklch(0.96 0.02 230)', border: 'oklch(0.82 0.06 230)' },
  platinum: { label: 'Platinum', color: 'oklch(0.48 0.10 295)', bg: 'oklch(0.97 0.015 295)',border: 'oklch(0.84 0.05 295)' },
  standard: { label: 'Standard', color: 'oklch(0.42 0.18 145)', bg: 'oklch(0.96 0.02 145)', border: 'oklch(0.82 0.06 145)' },
  smart:    { label: 'Smart',    color: 'oklch(0.48 0.14 230)', bg: 'oklch(0.96 0.02 230)', border: 'oklch(0.82 0.06 230)' },
}

import {
  ArrowLeft,
  Receipt,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  CreditCard,
  FileText,
  Eye,
  Monitor,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getReceiptData(id: string) {
  const db = createAdminClient()

  const [{ data: receipt }, { data: verifications, count: verificationCount }] = await Promise.all([
    db
      .from('receipts')
      .select(
        '*, items:receipt_items(*), profiles!receipts_user_id_fkey(id, full_name, email, phone, issuer_type, business_name, is_verified)'
      )
      .eq('id', id)
      .single(),
    db
      .from('verifications')
      .select('id, method, ip_address, user_agent, verified_at', { count: 'exact' })
      .eq('receipt_id', id)
      .order('verified_at', { ascending: false })
      .limit(50),
  ])

  return {
    receipt,
    verifications: verifications ?? [],
    verificationCount: verificationCount ?? 0,
  }
}

function Field({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-ink-dim w-32 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-ink flex-1 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

export default async function AdminReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { receipt, verifications, verificationCount } = await getReceiptData(id)

  if (!receipt) notFound()

  const profile = receipt.profiles as any
  const items = (receipt.items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://digitalreceipt.ng'}/r/${receipt.unique_identifier}`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href={adminHref('/receipts')}
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-forest transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Back to receipts
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="font-heading text-2xl text-ink"
                style={{ letterSpacing: '-0.02em' }}
              >
                {receipt.receipt_number}
              </h1>
              {(() => {
                const tier = TIER_STYLES[receipt.receipt_type ?? 'standard'] ?? TIER_STYLES.standard
                return (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ color: tier.color, background: tier.bg, border: `1px solid ${tier.border}` }}
                  >
                    {tier.label}
                  </span>
                )
              })()}
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                  receipt.status === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : receipt.status === 'cancelled'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {receipt.status}
              </span>
            </div>
            <p className="text-xs text-ink-dim mt-1 font-mono">{receipt.unique_identifier}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={publicUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
            >
              <Globe size={13} />
              Public page
            </Link>
            <Link
              href={`/api/receipts/${receipt.id}/pdf`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: 'oklch(0.42 0.18 145)' }}
            >
              <FileText size={13} />
              Download PDF
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Issuer */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
              Issuer
            </h2>
            {profile ? (
              <div>
                <Link
                  href={adminHref(`/users/${profile.id}`)}
                  className="flex items-center gap-2.5 mb-3 group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'oklch(0.42 0.18 145)' }}
                  >
                    {profile.full_name
                      ?.split(' ')
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-forest group-hover:underline truncate">
                      {profile.full_name}
                    </p>
                    <p className="text-xs text-ink-dim truncate">{profile.email}</p>
                  </div>
                  <ChevronRight size={13} className="text-ink-dim shrink-0 ml-auto" />
                </Link>
                <div className="border-t border-border pt-3 space-y-0">
                  <Field label="Seller name" value={receipt.seller_name} />
                  <Field label="Phone" value={receipt.seller_phone} />
                  {receipt.seller_email && <Field label="Email" value={receipt.seller_email} />}
                  {receipt.seller_address && <Field label="Address" value={receipt.seller_address} />}
                  {receipt.seller_rc_number && <Field label="CAC / RC" value={receipt.seller_rc_number} mono />}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-dim">Issuer profile not found</p>
            )}
          </div>

          {/* Buyer */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
              Customer
            </h2>
            <Field label="Name" value={receipt.buyer_name} />
            <Field label="Phone" value={receipt.buyer_phone} />
            {receipt.buyer_email && <Field label="Email" value={receipt.buyer_email} />}
          </div>

          {/* Transaction */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-3">
              Transaction
            </h2>
            <Field label="Date" value={formatDate(receipt.transaction_date)} />
            <Field label="Payment method" value={receipt.payment_method} />
            {receipt.reference_number && (
              <Field label="Reference" value={receipt.reference_number} mono />
            )}
            <Field label="Created" value={formatDateTime(receipt.created_at)} />
            {receipt.verification_expires_at && (
              <Field label="Expires" value={formatDateTime(receipt.verification_expires_at)} />
            )}
          </div>

          {/* Verification stats */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-forest" />
              <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider">
                Verifications
              </h2>
            </div>
            <p className="font-heading text-3xl text-ink" style={{ letterSpacing: '-0.02em' }}>
              {verificationCount.toLocaleString()}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Total times this receipt was verified
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm text-ink">Line Items</h2>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">No items recorded</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-xs font-medium text-ink-dim"
                        style={{
                          background: 'oklch(0.97 0.006 145)',
                          borderBottom: '1px solid oklch(0.875 0.020 145)',
                        }}
                      >
                        <th className="text-left px-5 py-3">Description</th>
                        <th className="text-right px-5 py-3">Qty</th>
                        <th className="text-right px-5 py-3">Unit price</th>
                        <th className="text-right px-5 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-5 py-3 text-ink">{item.description}</td>
                          <td className="px-5 py-3 text-right text-ink-muted">{item.quantity}</td>
                          <td className="px-5 py-3 text-right text-ink-muted">
                            {formatNaira(item.unit_price)}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-ink">
                            {formatNaira(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="px-5 py-4 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-muted">Subtotal</span>
                    <span className="text-ink">{formatNaira(receipt.subtotal)}</span>
                  </div>
                  {receipt.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Discount</span>
                      <span className="text-red-600">−{formatNaira(receipt.discount)}</span>
                    </div>
                  )}
                  {receipt.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Tax</span>
                      <span className="text-ink">{formatNaira(receipt.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-border">
                    <span className="text-ink">Total</span>
                    <span className="text-ink">{formatNaira(receipt.total_amount)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className="text-xs font-semibold text-ink-dim uppercase tracking-wider mb-2">
                Notes
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{receipt.notes}</p>
            </div>
          )}

          {/* Verification history */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Eye size={15} className="text-forest" />
              <h2 className="font-semibold text-sm text-ink">
                Verification History
                <span className="ml-1.5 text-xs font-normal text-ink-dim">
                  ({verificationCount} total)
                </span>
              </h2>
            </div>

            {verifications.length === 0 ? (
              <div className="text-center py-12">
                <Eye size={24} className="text-ink-dim mx-auto mb-2" />
                <p className="text-sm text-ink-muted">Not yet verified</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {verifications.map((v: any) => (
                  <div key={v.id} className="px-5 py-3.5 flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'oklch(0.42 0.18 145 / 0.12)' }}
                    >
                      {v.method === 'qr' ? (
                        <Hash size={11} style={{ color: 'oklch(0.42 0.18 145)' }} />
                      ) : (
                        <Globe size={11} style={{ color: 'oklch(0.42 0.18 145)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-ink capitalize">{v.method}</span>
                        <span className="text-xs text-ink-dim">·</span>
                        <span className="text-xs text-ink-muted">{formatDateTime(v.verified_at)}</span>
                      </div>
                      {v.ip_address && (
                        <p className="text-xs text-ink-dim font-mono mt-0.5">{v.ip_address}</p>
                      )}
                      {v.user_agent && (
                        <p className="text-xs text-ink-dim mt-0.5 truncate">{v.user_agent}</p>
                      )}
                    </div>
                  </div>
                ))}
                {verificationCount > 50 && (
                  <p className="px-5 py-3 text-xs text-ink-dim text-center">
                    Showing 50 most recent of {verificationCount.toLocaleString()} total
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
