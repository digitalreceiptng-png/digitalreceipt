'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Loader2, Phone, Mail, Lock } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

type Step = 'contact' | 'otp' | 'login-code' | 'setup'

export default function StaffLoginPage() {
  const router = useRouter()
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [step, setStep] = useState<Step>('contact')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [pendingTokenHash, setPendingTokenHash] = useState('')
  const [pendingNext, setPendingNext] = useState('/dashboard')

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!contact.trim()) { setError('Enter your phone number or email.'); return }
    setLoading(true)
    try {
      if (contactType === 'phone') {
        const res = await fetch('/api/staff/login/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: contact.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not send OTP.')
        if (data.hasLoginCode) {
          setStep('login-code')
        } else {
          setSessionToken(data.sessionToken)
          setStep('otp')
        }
      } else {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOtp({ email: contact.trim() })
        if (error) throw error
        setStep('otp')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!otp.trim() || otp.length < 6) { setError('Enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      if (contactType === 'phone') {
        const res = await fetch('/api/staff/login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'otp', sessionToken, code: otp.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Verification failed.')

        // Exchange token for session
        const supabase = createClient()
        const { error: sessionErr } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: 'magiclink',
        })
        if (sessionErr) throw new Error(sessionErr.message)

        if (data.isFirstLogin) {
          setPendingNext(data.next)
          setStep('setup')
        } else {
          router.push(data.next)
        }
      } else {
        const supabase = createClient()
        const { error } = await supabase.auth.verifyOtp({
          email: contact.trim(),
          token: otp.trim(),
          type: 'email',
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!loginCode.trim()) { setError('Enter your login code.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/staff/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login_code', phone: contact.trim(), code: loginCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Incorrect login code.')

      const supabase = createClient()
      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      })
      if (sessionErr) throw new Error(sessionErr.message)
      router.push(data.next)
    } catch (err: any) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newCode.length < 4) { setError('Login code must be at least 4 characters.'); return }
    if (newCode !== confirmCode) { setError('Codes do not match.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/staff/login/set-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save login code.')
      router.push(pendingNext)
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Link href="/auth/login" className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} /> Back to login
      </Link>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
            <span className="text-xl">🔗</span>
          </div>
          <div>
            <h1 className="font-heading text-xl text-ink">Staff Login</h1>
            <p className="text-xs text-ink-muted">
              {step === 'setup' ? 'Set up your personal login code' : 'Enter using your assigned contact'}
            </p>
          </div>
        </div>

        {/* Step 1: Enter contact */}
        {step === 'contact' && (
          <form onSubmit={handleContactSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-xl border border-border">
              {(['phone', 'email'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setContactType(t); setContact(''); setError('') }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    contactType === t ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t === 'phone' ? <Phone size={14} /> : <Mail size={14} />}
                  {t === 'phone' ? 'Phone' : 'Email'}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {contactType === 'phone' ? 'Phone number' : 'Email address'}
              </label>
              <input
                type={contactType === 'phone' ? 'tel' : 'email'}
                value={contact}
                onChange={e => setContact(e.target.value)}
                required
                autoFocus
                className={INPUT}
                placeholder={contactType === 'phone' ? '+234 80...' : 'you@example.com'}
              />
              <p className="text-xs text-ink-dim mt-1.5">
                Use the {contactType === 'phone' ? 'phone number' : 'email'} your employer added you with
              </p>
            </div>

            {error && <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Checking…</> : <>Continue <ArrowRight size={15} /></>}
            </button>
          </form>
        )}

        {/* Step 2a: Enter OTP (first-time / phone) */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-3.5 bg-forest/5 rounded-xl border border-forest/15 text-sm text-ink-muted">
              A 6-digit OTP was sent to <strong className="text-ink">{contact}</strong>.
              {' '}<button type="button" onClick={() => { setStep('contact'); setOtp(''); setError('') }} className="text-forest underline text-xs">Change</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                maxLength={6}
                className={INPUT + ' text-center text-2xl font-bold tracking-widest'}
                placeholder="------"
              />
            </div>

            {error && <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Verifying…</> : <>Verify OTP <ArrowRight size={15} /></>}
            </button>

            <button
              type="button"
              onClick={handleContactSubmit as any}
              disabled={loading}
              className="w-full text-xs text-ink-dim hover:text-forest transition-colors py-1"
            >
              Didn't receive it? Resend OTP
            </button>
          </form>
        )}

        {/* Step 2b: Enter personal login code (returning staff) */}
        {step === 'login-code' && (
          <form onSubmit={handleLoginCodeSubmit} className="space-y-5">
            <div className="p-3.5 bg-forest/5 rounded-xl border border-forest/15 text-sm text-ink-muted">
              Signing in as <strong className="text-ink">{contact}</strong>.
              {' '}<button type="button" onClick={() => { setStep('contact'); setLoginCode(''); setError('') }} className="text-forest underline text-xs">Change</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5 flex items-center gap-1.5">
                <Lock size={13} /> Your login code
              </label>
              <input
                type="password"
                value={loginCode}
                onChange={e => setLoginCode(e.target.value)}
                required
                autoFocus
                className={INPUT}
                placeholder="Enter your login code"
              />
            </div>

            {error && <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Signing in…</> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>
        )}

        {/* Step 3: Set up personal login code (after first OTP) */}
        {step === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-5">
            <div className="p-3.5 bg-forest/5 rounded-xl border border-forest/15 text-sm text-ink-muted">
              OTP verified! Set a personal login code so you won't need an OTP next time.
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Choose a login code</label>
              <input
                type="password"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                required
                autoFocus
                className={INPUT}
                placeholder="At least 4 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Confirm login code</label>
              <input
                type="password"
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value)}
                required
                className={INPUT}
                placeholder="Re-enter your code"
              />
            </div>

            {error && <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <>Save & Go to Dashboard <ArrowRight size={15} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
