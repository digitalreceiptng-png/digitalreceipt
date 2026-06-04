import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import BackButton from '@/components/BackButton'

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <BackButton href="/auth/login" label="Back to sign in" />
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-8 text-center">
      <div className="w-12 h-12 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto mb-5">
        <KeyRound size={22} className="text-forest" />
      </div>
      <h1 className="font-heading text-2xl text-ink mb-2">No password needed</h1>
      <p className="text-sm text-ink-muted mb-6 max-w-xs mx-auto">
        DigitalReceipt.ng uses one-time codes sent to your email instead of passwords. Just sign in with your email address.
      </p>
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 bg-forest text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
      >
        Sign in with email
      </Link>
      <p className="text-sm text-ink-dim mt-6">
        New here?{' '}
        <Link href="/auth/register" className="text-forest font-medium hover:underline">Create a free account</Link>
      </p>
      </div>
    </div>
  )
}
