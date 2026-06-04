'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message
      )
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border p-8">
      <h1 className="font-heading text-2xl text-ink mb-1">Sign in</h1>
      <p className="text-sm text-ink-muted mb-7">Welcome back. Enter your details to continue.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={INPUT} placeholder="you@example.com" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-ink">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-forest/70 hover:text-forest transition-colors">
              Forgot password?
            </Link>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className={INPUT} placeholder="••••••••" />
        </div>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright active:bg-forest transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-center text-ink-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-forest font-medium hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
