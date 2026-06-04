'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT = 'w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-colors'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-surface-raised border border-border rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-xl text-ink mb-2">Check your email</h2>
        <p className="text-sm text-ink-muted mb-6">
          We sent a reset link to <strong className="text-ink">{email}</strong>. The link expires in 1 hour.
        </p>
        <Link href="/auth/login" className="text-sm text-gold-muted font-medium hover:text-gold transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8">
      <h1 className="font-heading text-2xl text-ink mb-1">Reset your password</h1>
      <p className="text-sm text-ink-muted mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={INPUT}
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-lg px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-bg py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-sm text-center text-ink-muted mt-6">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-gold-muted font-medium hover:text-gold transition-colors">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
