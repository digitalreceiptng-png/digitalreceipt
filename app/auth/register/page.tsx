'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type IssuerType = 'individual' | 'business'

const INPUT = 'w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold/50 transition-colors'

export default function RegisterPage() {
  const router = useRouter()

  const [issuerType, setIssuerType] = useState<IssuerType>('individual')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [nin, setNin] = useState('')
  const [rcNumber, setRcNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (issuerType === 'business' && !businessName.trim()) {
      setError('Business name is required for business accounts.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          issuer_type: issuerType,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      const updates: Record<string, string> = { phone }
      if (issuerType === 'individual' && nin) updates.nin = nin
      if (issuerType === 'business') {
        updates.business_name = businessName
        if (rcNumber) updates.rc_number = rcNumber
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user!.id)

      router.push('/dashboard')
      router.refresh()
      return
    }

    setEmailSent(true)
    setLoading(false)
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-surface-raised border border-border rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="font-heading text-xl text-ink mb-2">Check your email</h2>
        <p className="text-sm text-ink-muted mb-6">
          We sent a confirmation link to <strong className="text-ink">{email}</strong>. Click the link to activate your account.
        </p>
        <Link href="/auth/login" className="text-sm text-gold-muted font-medium hover:text-gold transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-8">
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
                    ? 'border-gold/60 bg-gold/10 text-gold'
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

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            autoComplete="name"
            className={INPUT}
            placeholder="Chukwuemeka Obi"
          />
        </div>

        {issuerType === 'business' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              className={INPUT}
              placeholder="Obi & Sons Ltd."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Phone number <span className="text-ink-dim font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
            className={INPUT}
            placeholder="08012345678"
          />
        </div>

        {issuerType === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              NIN <span className="text-ink-dim font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={nin}
              onChange={e => setNin(e.target.value)}
              maxLength={11}
              className={INPUT}
              placeholder="12345678901"
            />
            <p className="text-xs text-ink-dim mt-1">Stored securely. Used only for identity verification review.</p>
          </div>
        )}

        {issuerType === 'business' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              CAC RC Number <span className="text-ink-dim font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={rcNumber}
              onChange={e => setRcNumber(e.target.value)}
              className={INPUT}
              placeholder="RC1234567"
            />
            <p className="text-xs text-ink-dim mt-1">Your CAC registration number. Stored for verification review.</p>
          </div>
        )}

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

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className={INPUT}
            placeholder="At least 8 characters"
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
          className="w-full bg-gold text-bg py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-center text-ink-muted mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-gold-muted font-medium hover:text-gold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
