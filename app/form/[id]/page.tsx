import { createAdminClient } from '@/lib/supabase/admin'
import CustomerForm from './CustomerForm'
import { Link2 } from 'lucide-react'

export default async function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: form } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(id, label, sort_order), issuer:profiles!receipt_forms_user_id_fkey(full_name, business_name, issuer_type)')
    .eq('id', id)
    .single()

  if (!form) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Link2 size={32} className="text-ink-dim mx-auto mb-3" />
          <h1 className="font-heading text-xl text-ink mb-2">Form Not Found</h1>
          <p className="text-sm text-ink-muted">This form link doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (!form.is_active) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Link2 size={32} className="text-ink-dim mx-auto mb-3" />
          <h1 className="font-heading text-xl text-ink mb-2">Form Closed</h1>
          <p className="text-sm text-ink-muted">This form is no longer accepting submissions.</p>
        </div>
      </div>
    )
  }

  const issuer = form.issuer as { full_name: string; business_name: string | null; issuer_type: string } | null
  const issuerName = issuer?.issuer_type === 'business'
    ? (issuer.business_name || issuer.full_name)
    : issuer?.full_name ?? 'the issuer'

  const sortedPurposes = (form.purposes ?? [])
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-forest px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link2 size={18} className="text-white/70" />
          <span className="text-white/80 text-sm font-medium">DigitalReceipt.ng</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Form header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-ink">{form.title || 'Receipt Request Form'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Issued by <strong className="text-ink">{issuerName}</strong>
          </p>
          {form.additional_instructions && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              {form.additional_instructions}
            </div>
          )}
        </div>

        <CustomerForm
          formId={id}
          fieldLabels={form.field_labels ?? {}}
          fieldConfig={form.field_config ?? {}}
          purposeType={form.purpose_type}
          fixedPurpose={form.fixed_purpose}
          purposes={sortedPurposes}
          requireEvidence={form.require_payment_evidence}
          vatEnabled={form.vat_enabled}
          vatRate={form.vat_rate ?? 7.5}
        />
      </main>

      <footer className="text-center py-8 text-xs text-ink-dim">
        <p>Powered by <a href="https://digitalreceipt.ng" className="text-forest hover:underline" target="_blank" rel="noopener noreferrer">DigitalReceipt.ng</a> — Nigeria&apos;s Verifiable Digital Receipt Platform</p>
      </footer>
    </div>
  )
}
