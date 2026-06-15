import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormBuilder from '@/components/dashboard/FormBuilder'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewFormPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/forms" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-forest transition-colors mb-4">
          <ArrowLeft size={15} />
          Back to Form Links
        </Link>
        <h1 className="font-heading text-2xl text-ink">Create Form Link</h1>
        <p className="text-sm text-ink-muted mt-1">Configure your receipt request form. The shareable link will be generated when you save.</p>
      </div>
      <FormBuilder />
    </div>
  )
}
