'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react'

type IssuerType = 'individual' | 'business'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function RegisterPage() {
  const router = useRouter()

  const [issuerType, setIssuerType] = useState<IssuerType>('individual')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nin, setNin] = useState('')
  const [rcNumber, setRcNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const metadata: Record<string, string> = {
      issuer_type: issuerType,
      ...(phone && { phone }),
      ...(issuerType === 'individual' && nin ? { nin } : {}),
      ...(issuerType === 'business' && rcNumber ? { rc_number: rcNumber } : {}),
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    setLoading(false)

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered') || signUpError.message.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Sign in instead.')
      } else {
        setError(signUpError.message)
      }
      return
    }

    // Save extended profile fields if session is immediately available
    if (data.session && data.user) {
      const updates: Record<string, string> = {}
      if (phone) updates.phone = phone
      if (issuerType === 'individual' && nin) updates.nin = nin
      if (issuerType === 'business' && rcNumber) updates.rc_number = rcNumber
      if (Object.keys(updates).length) {
        await supabase.from('profiles').update(updates).eq('id', data.user.id)
      }
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Email confirmation required
    setDone(true)
  }

  if (done) {
    return (
      <div className="w-full max-w-md space-y-4">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
          <ArrowLeft size={16} /> Back to home
        </button>
        <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
            <Mail size={22} className="text-forest" />
          </div>
          <h1 className="font-heading text-2xl text-ink">Check your email</h1>
          <p className="text-sm text-ink-muted">
            We sent a confirmation link to <span className="font-semibold text-ink">{email}</span>. Click the link to activate your account.
          </p>
          <Link href="/auth/login" className="inline-block text-sm text-forest font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-8">
        <h1 className="font-heading text-2xl text-ink mb-1">Create your account</h1>
        <p className="text-sm text-ink-muted mb-7">Free for individuals and businesses. No card required.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account type */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Account type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['individual', 'business'] as IssuerType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIssuerType(type)}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium text-left transition-all ${
                    issuerType === type
                      ? 'border-forest bg-forest-light text-forest'
                      : 'border-border text-ink-muted hover:border-border-bright'
                  }`}
                >
                  <span className="block font-semibold capitalize">{type}</span>
                  <span className="text-xs font-normal opacity-70">
                    {type === 'individual' ? 'Freelancer, tutor, landlord…' : 'School, hospital, SME…'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              className={INPUT}
              placeholder="08012345678"
            />
          </div>

          {/* Email */}
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={INPUT + ' pr-10'}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* NIN (individual) */}
          {issuerType === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">NIN</label>
              <input
                type="text"
                value={nin}
                onChange={e => setNin(e.target.value)}
                maxLength={11}
                inputMode="numeric"
                className={INPUT}
                placeholder="12345678901"
              />
              <p className="text-xs text-ink-dim mt-1">Your 11-digit National Identification Number.</p>
            </div>
          )}

          {/* RC / BN (business) */}
          {issuerType === 'business' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">CAC RC / BN Number</label>
              <input
                type="text"
                value={rcNumber}
                onChange={e => setRcNumber(e.target.value)}
                className={INPUT}
                placeholder="RC1234567 or BN1234567"
              />
              <p className="text-xs text-ink-dim mt-1">Your CAC registration or business name number.</p>
            </div>
          )}

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading ? 'Creating account…' : <>Create account <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="text-sm text-center text-ink-muted mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-forest font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
