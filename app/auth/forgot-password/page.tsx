'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#e0ede5] p-8 text-center">
        <div className="w-12 h-12 bg-[#f4faf6] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#1a6b2f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-heading text-xl text-[#0f1f13] mb-2">Check your email</h2>
        <p className="text-sm text-[#4a6b55] mb-6">
          We sent a password reset link to <strong className="text-[#0f1f13]">{email}</strong>. The link expires in 1 hour.
        </p>
        <Link href="/auth/login" className="text-sm text-[#1a6b2f] font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#e0ede5] p-8">
      <h1 className="font-heading text-2xl text-[#0f1f13] mb-1">Reset your password</h1>
      <p className="text-sm text-[#4a6b55] mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#0f1f13] mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b2f]/30 focus:border-[#1a6b2f] transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-[#dc2626] bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a6b2f] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#155a27] active:bg-[#124d23] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-sm text-center text-[#4a6b55] mt-6">
        Remembered it?{' '}
        <Link href="/auth/login" className="text-[#1a6b2f] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
