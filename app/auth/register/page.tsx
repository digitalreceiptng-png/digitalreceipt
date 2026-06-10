'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'

type IssuerType = 'individual' | 'business'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function RegisterPage() {
  const router = useRouter()

  const [issuerType, setIssuerType] = useState<IssuerType>('individual')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nin, setNin] = useState('')
  const [rcNumber, setRcNumber] = useState('')

  // Email OTP
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')

  // NIN verification
  const [ninVerifying, setNinVerifying] = useState(false)
  const [ninResult, setNinResult] = useState<{ name: string } | null>(null)
  const [ninError, setNinError] = useState('')

  // CAC verification
  const [cacVerifying, setCacVerifying] = useState(false)
  const [cacResult, setCacResult] = useState<{ name: string } | null>(null)
  const [cacError, setCacError] = useState('')

  // Form submit
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Email OTP ──────────────────────────────────────────────────────────────

  async function sendOtp() {
    if (!email) return
    setSendingOtp(true)
    setOtpError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setSendingOtp(false)
    if (error) { setOtpError(error.message); return }
    setOtpSent(true)
    setOtpCode(['', '', '', '', '', ''])
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpCode]
    next[index] = value.slice(-1)
    setOtpCode(next)
    if (value && index < 5) document.getElementById(`reg-otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0)
      document.getElementById(`reg-otp-${index - 1}`)?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) setOtpCode(pasted.split(''))
  }

  async function verifyOtp() {
    const token = otpCode.join('')
    if (token.length < 6) { setOtpError('Enter the full 6-digit code.'); return }
    setVerifyingOtp(true)
    setOtpError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setVerifyingOtp(false)
    if (error) { setOtpError('Invalid or expired code. Try again.'); return }
    setEmailVerified(true)
    setOtpSent(false)
  }

  // ── NIN verify ────────────────────────────────────────────────────────────

  async function verifyNin() {
    if (!/^\d{11}$/.test(nin)) { setNinError('Enter a valid 11-digit NIN.'); return }
    setNinVerifying(true)
    setNinError('')
    setNinResult(null)
    try {
      const res = await fetch('/api/nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin }),
      })
      const data = await res.json()
      if (!res.ok) { setNinError(data.error ?? 'Verification failed.'); return }
      const p = data.person
      setNinResult({ name: [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Verified' })
    } catch {
      setNinError('Could not reach verification service.')
    } finally {
      setNinVerifying(false)
    }
  }

  // ── CAC verify ────────────────────────────────────────────────────────────

  async function verifyCac() {
    if (!rcNumber.trim()) { setCacError('Enter your RC or BN number.'); return }
    setCacVerifying(true)
    setCacError('')
    setCacResult(null)
    try {
      const res = await fetch(`/api/cac?rc=${encodeURIComponent(rcNumber.trim())}`)
      const data = await res.json()
      if (!res.ok) { setCacError(data.error ?? 'Verification failed.'); return }
      setCacResult({ name: data.company?.name || 'Verified' })
    } catch {
      setCacError('Could not reach verification service.')
    } finally {
      setCacVerifying(false)
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!emailVerified) {
      setError('Please verify your email address first.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Email is already verified (OTP session exists); set the password
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) { setError(pwError.message); setLoading(false); return }

    // Save profile fields
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Guard against NIN/RC already used by another account
      const identityPayload: Record<string, string> = {}
      if (issuerType === 'individual' && nin) identityPayload.nin = nin
      if (issuerType === 'business' && rcNumber) identityPayload.rc_number = rcNumber

      if (Object.keys(identityPayload).length > 0) {
        const checkRes = await fetch('/api/identity-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(identityPayload),
        })
        const checkData = await checkRes.json()
        if (checkData.conflict) {
          setError(checkData.message)
          setLoading(false)
          return
        }
      }

      const updates: Record<string, string> = { issuer_type: issuerType }
      if (phone) updates.phone = phone
      if (issuerType === 'individual' && nin) updates.nin = nin
      if (issuerType === 'business' && rcNumber) updates.rc_number = rcNumber
      await supabase.from('profiles').update(updates).eq('id', user.id)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} /> Back to home
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
                  onClick={() => { setIssuerType(type); setNinResult(null); setNinError(''); setCacResult(null); setCacError('') }}
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

          {/* Email + OTP */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink">Email address</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailVerified(false); setOtpSent(false); setOtpError('') }}
                required
                autoComplete="email"
                disabled={emailVerified}
                className={INPUT + (emailVerified ? ' opacity-60' : '')}
                placeholder="you@example.com"
              />
              {!emailVerified && (
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {sendingOtp ? <Loader2 size={13} className="animate-spin" /> : null}
                  {otpSent ? 'Resend' : 'Send code'}
                </button>
              )}
              {emailVerified && (
                <div className="shrink-0 flex items-center gap-1.5 text-forest text-xs font-semibold px-2">
                  <CheckCircle2 size={16} /> Verified
                </div>
              )}
            </div>

            {otpSent && !emailVerified && (
              <div className="pt-1 space-y-2">
                <p className="text-xs text-ink-muted">Enter the 6-digit code sent to {email}</p>
                <div className="flex gap-1.5" onPaste={handleOtpPaste}>
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      id={`reg-otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={OTP_INPUT}
                      autoFocus={i === 0}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={verifyingOtp}
                    className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {verifyingOtp ? <Loader2 size={13} className="animate-spin" /> : null}
                    Verify
                  </button>
                </div>
                {otpError && <p className="text-xs text-danger">{otpError}</p>}
              </div>
            )}
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
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">NIN</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nin}
                  onChange={e => { setNin(e.target.value); setNinResult(null); setNinError('') }}
                  maxLength={11}
                  inputMode="numeric"
                  disabled={!!ninResult}
                  className={INPUT + (ninResult ? ' opacity-60' : '')}
                  placeholder="12345678901"
                />
                {!ninResult ? (
                  <button
                    type="button"
                    onClick={verifyNin}
                    disabled={ninVerifying}
                    className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {ninVerifying ? <Loader2 size={13} className="animate-spin" /> : null}
                    Verify
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-1.5 text-forest text-xs font-semibold px-2">
                    <CheckCircle2 size={16} /> Verified
                  </div>
                )}
              </div>
              {ninResult && <p className="text-xs text-forest font-medium">{ninResult.name}</p>}
              {ninError && <p className="text-xs text-danger">{ninError}</p>}
              {!ninResult && !ninError && <p className="text-xs text-ink-dim">Your 11-digit National Identification Number.</p>}
            </div>
          )}

          {/* RC / BN (business) */}
          {issuerType === 'business' && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-ink">CAC RC / BN Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rcNumber}
                  onChange={e => { setRcNumber(e.target.value); setCacResult(null); setCacError('') }}
                  disabled={!!cacResult}
                  className={INPUT + (cacResult ? ' opacity-60' : '')}
                  placeholder="RC1234567 or BN1234567"
                />
                {!cacResult ? (
                  <button
                    type="button"
                    onClick={verifyCac}
                    disabled={cacVerifying}
                    className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {cacVerifying ? <Loader2 size={13} className="animate-spin" /> : null}
                    Verify
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-1.5 text-forest text-xs font-semibold px-2">
                    <CheckCircle2 size={16} /> Verified
                  </div>
                )}
              </div>
              {cacResult && <p className="text-xs text-forest font-medium">{cacResult.name}</p>}
              {cacError && <p className="text-xs text-danger">{cacError}</p>}
              {!cacResult && !cacError && <p className="text-xs text-ink-dim">Your CAC registration or business name number.</p>}
            </div>
          )}

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !emailVerified}
            className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : <>Create account <ArrowRight size={15} /></>}
          </button>
          {!emailVerified && (
            <p className="text-xs text-center text-ink-dim -mt-2">Verify your email to continue</p>
          )}
        </form>

        <p className="text-sm text-center text-ink-muted mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-forest font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
