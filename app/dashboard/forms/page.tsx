import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlusCircle, Link2, Copy, ToggleLeft, ToggleRight, Pencil, Trash2, Files } from 'lucide-react'
import FormsActions from './FormsActions'

const APP_URL = 'https://digitalreceipt.ng'

export default async function FormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: forms } = await db
    .from('receipt_forms')
    .select('id, title, is_active, purpose_type, fixed_purpose, vat_enabled, require_payment_evidence, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl text-ink">Form Links</h1>
        <Link
          href="/dashboard/forms/new"
          className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
        >
          <PlusCircle size={16} />
          Create Form
        </Link>
      </div>

      <p className="text-sm text-ink-muted">
        Create customizable receipt request forms and share the links with your customers. When they submit, you review and generate the official receipt.
      </p>

      {!forms?.length ? (
        <div className="bg-white rounded-xl border border-border py-16 text-center">
          <Link2 size={32} className="text-ink-dim mx-auto mb-3" />
          <p className="text-ink-muted mb-4">No form links yet.</p>
          <Link
            href="/dashboard/forms/new"
            className="inline-flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
          >
            <PlusCircle size={15} />
            Create your first form
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.map(form => {
            const formUrl = `${APP_URL}/form/${form.id}`
            return (
              <div key={form.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-ink truncate">{form.title || 'Untitled Form'}</h2>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        form.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {form.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-dim mb-3">
                      {form.purpose_type === 'fixed' && form.fixed_purpose && (
                        <span>Purpose: {form.fixed_purpose}</span>
                      )}
                      {form.purpose_type === 'multiple' && <span>Multiple purposes</span>}
                      {form.vat_enabled && <span className="text-amber-600">VAT enabled</span>}
                      {form.require_payment_evidence && <span>Evidence required</span>}
                    </div>
                    <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 border border-border">
                      <Link2 size={12} className="text-ink-dim shrink-0" />
                      <span className="text-xs text-ink-dim font-mono truncate flex-1">{formUrl}</span>
                      <FormsActions formId={form.id} formUrl={formUrl} isActive={form.is_active} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <Link
                    href={`/dashboard/forms/${form.id}/edit`}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-forest transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/receipt-requests?form=${form.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-forest transition-colors"
                  >
                    View Requests
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
