import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FormBuilder from '@/components/dashboard/FormBuilder'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const db = createAdminClient()
  const { data: form } = await db
    .from('receipt_forms')
    .select('*, purposes:receipt_form_purposes(id, label, sort_order)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!form) redirect('/dashboard/forms')

  // Sort purposes
  const sortedPurposes = (form.purposes ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/forms" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-forest transition-colors mb-4">
          <ArrowLeft size={15} />
          Back to Form Links
        </Link>
        <h1 className="font-heading text-2xl text-ink">Edit Form</h1>
        {form.title && <p className="text-sm text-ink-muted mt-1">{form.title}</p>}
      </div>
      <FormBuilder
        formId={id}
        initialData={{ ...form, purposes: sortedPurposes, vat_rate: form.vat_rate ?? undefined }}
      />
    </div>
  )
}
