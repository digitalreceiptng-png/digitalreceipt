import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { formatNaira, formatDate } from '@/lib/formatters'
import RequestActions from './RequestActions'

const APP_URL = 'https://digitalreceipt.ng'

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: sub } = await db
    .from('receipt_form_submissions')
    .select('*, form:receipt_forms(id, title, field_labels, vat_enabled, vat_rate), receipt:receipts(id, receipt_number, unique_identifier)')
    .eq('id', id)
    .eq('issuer_id', user.id)
    .single()

  if (!sub) redirect('/dashboard/receipt-requests')

  const form = sub.form as { id: string; title: string | null; field_labels: Record<string, string>; vat_enabled: boolean; vat_rate: number | null } | null
  const receipt = sub.receipt as { id: string; receipt_number: string; unique_identifier: string } | null
  const fieldLabels = form?.field_labels ?? {}

  function label(key: string, fallback: string) {
    return fieldLabels[key] || fallback
  }

  const vatEnabled = form?.vat_enabled ?? false
  const vatRate = form?.vat_rate ?? 7.5
  const subtotal = Number(sub.total_amount ?? 0)
  const tax = vatEnabled ? Math.round(subtotal * (vatRate / 100) * 100) / 100 : 0
  const total = subtotal + tax

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <Link href="/dashboard/receipt-requests" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-forest transition-colors mb-4">
          <ArrowLeft size={15} />
          Back to Receipt Requests
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl text-ink">Receipt Request</h1>
            {form?.title && <p className="text-sm text-ink-muted mt-0.5">via {form.title}</p>}
          </div>
          <StatusBadge status={sub.status} />
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-ink">Customer Details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Full Name" value={sub.customer_name} />
          {sub.customer_email && <Row label="Email" value={sub.customer_email} />}
          {sub.customer_phone && <Row label="Phone" value={sub.customer_phone} />}
          <Row label="Submitted" value={formatDate(sub.submitted_at)} />
        </dl>
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-ink">Payment Details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {sub.purpose_of_payment && <Row label="Purpose of Payment" value={sub.purpose_of_payment} />}
          {sub.item_description && <Row label={label('item_description', 'Item Description')} value={sub.item_description} />}
          {sub.unit_value && <Row label={sub.unit_label || label('unit_of_item', 'Unit of Item')} value={sub.unit_value} />}
          {sub.unit_price != null && <Row label={label('unit_price', 'Unit Price')} value={formatNaira(sub.unit_price)} />}
          {sub.payment_method && <Row label="Payment Method" value={sub.payment_method} />}
          {sub.payment_date && <Row label="Payment Date" value={formatDate(sub.payment_date)} />}
          {sub.additional_notes && <Row label={label('additional_notes', 'Additional Notes')} value={sub.additional_notes} span />}
        </dl>

        <div className="border-t border-border pt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink">{formatNaira(subtotal)}</span>
          </div>
          {vatEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">VAT ({vatRate}%)</span>
              <span className="text-ink">{formatNaira(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
            <span className="text-ink">Total</span>
            <span className="text-forest">{formatNaira(total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Evidence */}
      {sub.payment_evidence_url && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <h2 className="font-semibold text-ink">Payment Evidence</h2>
          <a
            href={sub.payment_evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-forest font-medium hover:text-forest-bright transition-colors"
          >
            <ExternalLink size={14} />
            {sub.payment_evidence_name || 'View uploaded file'}
          </a>
          {sub.payment_evidence_url.match(/\.(jpg|jpeg|png|webp)$/i) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sub.payment_evidence_url}
              alt="Payment evidence"
              className="max-w-full max-h-64 object-contain rounded-lg border border-border"
            />
          )}
        </div>
      )}

      {/* Generated Receipt (if confirmed) */}
      {receipt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-green-800">Receipt Generated</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            <Row label="Receipt Number" value={receipt.receipt_number} />
            <Row label="Identifier" value={receipt.unique_identifier} />
          </dl>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/receipts/${receipt.id}`}
              className="flex items-center gap-1.5 text-sm font-medium text-forest hover:text-forest-bright transition-colors"
            >
              View Receipt →
            </Link>
            <a
              href={`${APP_URL}/r/${receipt.unique_identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-forest transition-colors"
            >
              <ExternalLink size={13} />
              Verify
            </a>
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {sub.status === 'rejected' && sub.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="font-semibold text-red-800 mb-2">Rejection Reason</h2>
          <p className="text-sm text-red-700">{sub.rejection_reason}</p>
        </div>
      )}

      {/* Actions */}
      {sub.status === 'pending' && (
        <RequestActions submissionId={id} />
      )}
    </div>
  )
}

function Row({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-ink-dim font-medium uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm border font-medium capitalize ${map[status] ?? map.pending}`}>
      {status}
    </span>
  )
}
