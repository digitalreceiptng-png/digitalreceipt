'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Step 1: Sign in with Supabase auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Invalid email or password.')
        return
      }

      // Step 2: Verify admin status via API route (uses service role)
      const res = await fetch('/api/admin/verify', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.isAdmin) {
        await supabase.auth.signOut()
        setError('You do not have admin access. Contact your system administrator.')
        return
      }

      router.push('/admin/overview')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'oklch(0.14 0.044 145)' }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.22 0.14 145 / 0.6) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'oklch(0.42 0.18 145)' }}
          >
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1
              className="font-heading text-2xl font-bold"
              style={{ color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em' }}
            >
              Admin Console
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
              DigitalReceipt.ng
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-7"
          style={{
            background: 'oklch(0.18 0.08 145)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium block"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@digitalreceipt.ng"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'oklch(0.14 0.044 145)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.90)',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = 'oklch(0.42 0.18 145 / 0.8)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')
                }
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium block"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'oklch(0.14 0.044 145)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.90)',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'oklch(0.42 0.18 145 / 0.8)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.30)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm"
                style={{ background: 'oklch(0.52 0.20 25 / 0.15)', color: 'oklch(0.75 0.15 25)' }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 mt-1"
              style={{
                background: 'oklch(0.42 0.18 145)',
                color: 'white',
                boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in to Admin Console'
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'rgba(255,255,255,0.20)' }}
        >
          Restricted access. Unauthorised attempts are logged.
        </p>
      </div>
    </div>
  )
}
