'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2, Loader2, Smartphone, Mail, X } from 'lucide-react'

type IssuerType = 'individual' | 'business'
type VerifyStep = 'input' | 'channel' | 'otp' | 'done'

interface OtpChannel { type: 'sms' | 'email'; masked: string }
interface VerifyState {
  step: VerifyStep
  sessionToken: string
  channels: OtpChannel[]
  selectedChannel: OtpChannel | null
  otpDestination: string  // masked, shown to user
  otpCode: string[]
  sending: boolean
  verifying: boolean
  error: string
  result: { name: string; identifier: string } | null
}

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

function initVerify(): VerifyState {
  return {
    step: 'input', sessionToken: '', channels: [], selectedChannel: null,
    otpDestination: '', otpCode: ['', '', '', '', '', ''],
    sending: false, verifying: false, error: '', result: null,
  }
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromGoogle = searchParams.get('from') === 'google'

  const [issuerType, setIssuerType] = useState<IssuerType>('individual')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [nin, setNin] = useState('')
  const [rcNumber, setRcNumber] = useState('')

  // Email OTP (account email verification via Supabase)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState('')

  // NIN verification state
  const [ninLooking, setNinLooking] = useState(false)
  const [ninLookupError, setNinLookupError] = useState('')
  const [ninVerify, setNinVerify] = useState<VerifyState>(initVerify())

  // CAC verification state
  const [cacLooking, setCacLooking] = useState(false)
  const [cacLookupError, setCacLookupError] = useState('')
  const [cacVerify, setCacVerify] = useState<VerifyState>(initVerify())

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isGoogleUser, setIsGoogleUser] = useState(false)

  // If coming back from Google OAuth, pre-fill email and mark it verified
  useEffect(() => {
    if (!fromGoogle) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email)
        setEmailVerified(true)
        setIsGoogleUser(true)
      }
    })
  }, [fromGoogle])

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    window.location.href = '/auth/google?next=/auth/register?from=google'
  }

  // ── Email OTP (Supabase account verification) ─────────────────────────────

  async function sendOtp() {
    if (!email) return
    setSendingOtp(true); setOtpError('')

    // Check if email is already registered
    const checkRes = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const checkData = await checkRes.json()
    if (checkData.exists) {
      setOtpError('This email has already been used to create an account. Please sign in instead.')
      setSendingOtp(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setSendingOtp(false)
    if (error) { setOtpError(error.message); return }
    setOtpSent(true); setOtpCode(['', '', '', '', '', ''])
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpCode]; next[index] = value.slice(-1); setOtpCode(next)
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
    setVerifyingOtp(true); setOtpError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    if (error) { setVerifyingOtp(false); setOtpError('Invalid or expired code. Try again.'); return }

    // Eagerly create the profile row with issuer_type so it's never missing.
    // This is an upsert — safe to call again on final submit with full data.
    await fetch('/api/auth/setup-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          email,
          issuer_type: issuerType,
          ...(phone ? { phone } : {}),
          is_verified: false,
        },
      }),
    })

    setVerifyingOtp(false)
    setEmailVerified(true)
    setOtpSent(false)
  }

  // ── NIN / CAC verification helpers ────────────────────────────────────────

  function patchNin(patch: Partial<VerifyState>) {
    setNinVerify(s => ({ ...s, ...patch }))
  }
  function patchCac(patch: Partial<VerifyState>) {
    setCacVerify(s => ({ ...s, ...patch }))
  }

  // Step 1: lookup NIN on QoreID — returns session token + masked channels
  async function lookupNin() {
    if (!/^\d{11}$/.test(nin)) { setNinLookupError('Enter a valid 11-digit NIN.'); return }
    setNinLooking(true); setNinLookupError(''); setNinVerify(initVerify())
    try {
      const res = await fetch('/api/nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin }),
      })
      const data = await res.json()
      if (!res.ok) { setNinLookupError(data.error ?? 'Verification failed.'); return }
      patchNin({ step: 'channel', sessionToken: data.sessionToken, channels: data.channels, error: '' })
    } catch {
      setNinLookupError('Could not reach verification service.')
    } finally {
      setNinLooking(false)
    }
  }

  // Step 1: lookup CAC
  async function lookupCac() {
    if (!rcNumber.trim()) { setCacLookupError('Enter your RC or BN number.'); return }
    setCacLooking(true); setCacLookupError(''); setCacVerify(initVerify())
    try {
      const res = await fetch(`/api/cac?rc=${encodeURIComponent(rcNumber.trim())}`)
      const data = await res.json()
      if (!res.ok) { setCacLookupError(data.error ?? 'Verification failed.'); return }
      patchCac({ step: 'channel', sessionToken: data.sessionToken, channels: data.channels, error: '' })
    } catch {
      setCacLookupError('Could not reach verification service.')
    } finally {
      setCacLooking(false)
    }
  }

  // Step 2: user picks a channel → send OTP
  async function sendNinOtp(ch: OtpChannel) {
    patchNin({ sending: true, error: '', selectedChannel: ch })
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: ninVerify.sessionToken, channel: ch.type }),
      })
      const data = await res.json()
      if (!res.ok) { patchNin({ sending: false, error: data.error ?? 'Failed to send code.' }); return }
      patchNin({ step: 'otp', sending: false, otpDestination: data.masked, otpCode: ['', '', '', '', '', ''], error: '' })
    } catch {
      patchNin({ sending: false, error: 'Could not send code. Please try again.' })
    }
  }

  async function sendCacOtp(ch: OtpChannel) {
    patchCac({ sending: true, error: '', selectedChannel: ch })
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: cacVerify.sessionToken, channel: ch.type }),
      })
      const data = await res.json()
      if (!res.ok) { patchCac({ sending: false, error: data.error ?? 'Failed to send code.' }); return }
      patchCac({ step: 'otp', sending: false, otpDestination: data.masked, otpCode: ['', '', '', '', '', ''], error: '' })
    } catch {
      patchCac({ sending: false, error: 'Could not send code. Please try again.' })
    }
  }

  // Step 3: verify the OTP code
  async function verifyNinOtp() {
    const code = ninVerify.otpCode.join('')
    if (code.length < 6) { patchNin({ error: 'Enter the full 6-digit code.' }); return }
    patchNin({ verifying: true, error: '' })
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: ninVerify.sessionToken, code }),
      })
      const data = await res.json()
      if (!res.ok) { patchNin({ verifying: false, error: data.error ?? 'Invalid code.' }); return }
      const p = data.person
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Verified'
      patchNin({ step: 'done', verifying: false, result: { name, identifier: data.identifier }, error: '' })
    } catch {
      patchNin({ verifying: false, error: 'Verification failed. Please try again.' })
    }
  }

  async function verifyCacOtp() {
    const code = cacVerify.otpCode.join('')
    if (code.length < 6) { patchCac({ error: 'Enter the full 6-digit code.' }); return }
    patchCac({ verifying: true, error: '' })
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: cacVerify.sessionToken, code }),
      })
      const data = await res.json()
      if (!res.ok) { patchCac({ verifying: false, error: data.error ?? 'Invalid code.' }); return }
      const p = data.person
      const name = p.companyName || 'Verified'
      patchCac({ step: 'done', verifying: false, result: { name, identifier: data.identifier }, error: '' })
    } catch {
      patchCac({ verifying: false, error: 'Verification failed. Please try again.' })
    }
  }

  function handleNinOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...ninVerify.otpCode]; next[index] = value.slice(-1)
    patchNin({ otpCode: next })
    if (value && index < 5) document.getElementById(`nin-otp-${index + 1}`)?.focus()
  }

  function handleNinOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !ninVerify.otpCode[index] && index > 0)
      document.getElementById(`nin-otp-${index - 1}`)?.focus()
  }

  function handleCacOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...cacVerify.otpCode]; next[index] = value.slice(-1)
    patchCac({ otpCode: next })
    if (value && index < 5) document.getElementById(`cac-otp-${index + 1}`)?.focus()
  }

  function handleCacOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !cacVerify.otpCode[index] && index > 0)
      document.getElementById(`cac-otp-${index - 1}`)?.focus()
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!emailVerified) { setError('Please verify your email address first.'); return }
    if (!isGoogleUser) {
      if (!passwordValid) { setPasswordTouched(true); setError('Please set a password that meets all requirements.'); return }
      if (!passwordsMatch) { setError('Passwords do not match.'); return }
    }

    setLoading(true)
    const supabase = createClient()

    if (!isGoogleUser) {
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) { setError(pwError.message); setLoading(false); return }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
        if (checkData.conflict) { setError(checkData.message); setLoading(false); return }
      }

      const profileData: Record<string, string | boolean> = {
        email: user.email ?? email,
        issuer_type: issuerType,
      }
      if (phone) profileData.phone = phone

      if (issuerType === 'individual' && ninVerify.result) {
        profileData.nin = nin
        profileData.full_name = ninVerify.result.name
        profileData.is_verified = true
      }
      if (issuerType === 'business' && cacVerify.result) {
        profileData.rc_number = rcNumber
        profileData.business_name = cacVerify.result.name
        profileData.full_name = cacVerify.result.name
        profileData.is_verified = true
      }

      // Use admin-backed route: creates profile + wallet if trigger didn't fire
      await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profileData }),
      })

      if (issuerType === 'individual' && ninVerify.result && nin) {
        fetch('/api/identity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'nin', identifier: `****${nin.slice(-4)}`, verified_name: ninVerify.result.name }),
        }).catch(() => {})
      }
      if (issuerType === 'business' && cacVerify.result && rcNumber) {
        fetch('/api/identity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cac', identifier: rcNumber.trim(), verified_name: cacVerify.result.name }),
        }).catch(() => {})
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  const ninDone  = ninVerify.step === 'done'
  const cacDone  = cacVerify.step === 'done'

  const passwordRules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', ok: /\d/.test(password) },
  ]
  const passwordValid = passwordRules.every(r => r.ok)
  const passwordsMatch = confirmPassword === password

  return (
    <div className="w-full max-w-md space-y-4">
      <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors">
        <ArrowLeft size={15} /> Back to home
      </Link>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-8">
        <h1 className="font-heading text-2xl text-ink mb-1">Create your account</h1>
        <p className="text-sm text-ink-muted mb-5">Free for individuals and businesses. No card required.</p>

        {/* Google sign-up */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg text-sm font-semibold text-ink hover:bg-surface transition-colors disabled:opacity-60 mb-5"
        >
          {googleLoading ? (
            <svg className="animate-spin w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting…' : 'Sign up with Google'}
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-ink-dim">or sign up with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Account type */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Account type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['individual', 'business'] as IssuerType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setIssuerType(type)
                    setNinVerify(initVerify()); setNinLookupError('')
                    setCacVerify(initVerify()); setCacLookupError('')
                  }}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium text-left transition-all ${
                    issuerType === type ? 'border-forest bg-forest-light text-forest' : 'border-border text-ink-muted hover:border-border-bright'
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
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className={INPUT} placeholder="" />
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
                <button type="button" onClick={sendOtp} disabled={sendingOtp}
                  className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                  {sendingOtp ? <Loader2 size={13} className="animate-spin" /> : null}
                  {otpSent ? 'Resend' : 'Send code'}
                </button>
              )}
              {emailVerified && (
                <div className="shrink-0 flex items-center gap-1.5 text-forest text-xs font-semibold px-2">
                  <CheckCircle2 size={16} /> {isGoogleUser ? 'Google' : 'Verified'}
                </div>
              )}
            </div>
            {otpSent && !emailVerified && (
              <div className="pt-1 space-y-2">
                <p className="text-xs text-ink-muted">Enter the 6-digit code sent to {email}</p>
                <div className="flex gap-1.5" onPaste={handleOtpPaste}>
                  {otpCode.map((digit, i) => (
                    <input key={i} id={`reg-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                      value={digit} onChange={e => handleOtpInput(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={OTP_INPUT} autoFocus={i === 0} />
                  ))}
                  <button type="button" onClick={verifyOtp} disabled={verifyingOtp}
                    className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                    {verifyingOtp ? <Loader2 size={13} className="animate-spin" /> : null}
                    Verify
                  </button>
                </div>
                {otpError && <p className="text-xs text-danger">{otpError}</p>}
              </div>
            )}
          </div>

          {/* Password — hidden for Google sign-up users */}
          {!isGoogleUser && <><div>
            <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordTouched(true) }}
                required
                autoComplete="new-password"
                className={`${INPUT} pr-10 ${passwordTouched && !passwordValid ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : ''}`}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordTouched && (
              <div className="mt-2.5 space-y-1.5">
                {passwordRules.map(rule => (
                  <div key={rule.label} className={`flex items-center gap-2 text-xs font-medium transition-colors ${rule.ok ? 'text-forest' : 'text-danger'}`}>
                    {rule.ok
                      ? <CheckCircle2 size={13} className="shrink-0" />
                      : <X size={13} className="shrink-0" />
                    }
                    {rule.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`${INPUT} pr-10 ${confirmPassword && !passwordsMatch ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : ''}`}
                placeholder="Re-enter your password"
              />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
                <X size={13} className="shrink-0" /> Passwords do not match
              </p>
            )}
            {confirmPassword && passwordsMatch && passwordValid && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-forest">
                <CheckCircle2 size={13} className="shrink-0" /> Passwords match
              </p>
            )}
          </div></>}

          {/* ── NIN verification (individual) ── */}
          {issuerType === 'individual' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink">NIN</label>

              {/* Input + lookup */}
              {(ninVerify.step === 'input' || ninVerify.step === 'channel' || ninVerify.step === 'otp') && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nin}
                    onChange={e => { setNin(e.target.value); setNinVerify(initVerify()); setNinLookupError('') }}
                    maxLength={11}
                    inputMode="numeric"
                    disabled={ninVerify.step !== 'input'}
                    className={INPUT + (ninVerify.step !== 'input' ? ' opacity-60' : '')}
                    placeholder="12345678901"
                  />
                  {ninVerify.step === 'input' && (
                    <button type="button" onClick={lookupNin} disabled={ninLooking}
                      className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                      {ninLooking ? <Loader2 size={13} className="animate-spin" /> : null}
                      Verify
                    </button>
                  )}
                </div>
              )}
              {ninLookupError && <p className="text-xs text-danger">{ninLookupError}</p>}
              {ninVerify.step === 'input' && !ninLookupError && (
                <p className="text-xs text-ink-dim">Your 11-digit National Identification Number.</p>
              )}

              {/* Channel picker */}
              {ninVerify.step === 'channel' && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <p className="text-xs font-semibold text-ink-muted">Choose where to receive your verification code:</p>
                  <div className="space-y-2">
                    {ninVerify.channels.map(ch => (
                      <button
                        key={ch.type}
                        type="button"
                        onClick={() => sendNinOtp(ch)}
                        disabled={ninVerify.sending}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white hover:border-forest/50 hover:bg-forest-light transition-colors text-left disabled:opacity-60"
                      >
                        {ch.type === 'sms'
                          ? <Smartphone size={16} className="text-forest shrink-0" />
                          : <Mail size={16} className="text-forest shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {ch.type === 'sms' ? 'Text message (SMS)' : 'Email'}
                          </p>
                          <p className="text-xs text-ink-muted">Send code to {ch.masked}</p>
                        </div>
                        {ninVerify.sending && ninVerify.selectedChannel?.type === ch.type && (
                          <Loader2 size={14} className="animate-spin text-forest ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  {ninVerify.error && <p className="text-xs text-danger">{ninVerify.error}</p>}
                </div>
              )}

              {/* OTP entry */}
              {ninVerify.step === 'otp' && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <p className="text-xs text-ink-muted">
                    Enter the 6-digit code sent to <span className="font-semibold text-ink">{ninVerify.otpDestination}</span>
                  </p>
                  <div className="flex gap-1.5">
                    {ninVerify.otpCode.map((digit, i) => (
                      <input key={i} id={`nin-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                        value={digit} onChange={e => handleNinOtpInput(i, e.target.value)} onKeyDown={e => handleNinOtpKeyDown(i, e)}
                        className={OTP_INPUT} autoFocus={i === 0} />
                    ))}
                    <button type="button" onClick={verifyNinOtp} disabled={ninVerify.verifying}
                      className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                      {ninVerify.verifying ? <Loader2 size={13} className="animate-spin" /> : null}
                      Verify
                    </button>
                  </div>
                  {ninVerify.error && <p className="text-xs text-danger">{ninVerify.error}</p>}
                  <div className="flex items-center gap-3 pt-0.5">
                    <button type="button" onClick={() => ninVerify.selectedChannel && sendNinOtp(ninVerify.selectedChannel)}
                      disabled={ninVerify.sending} className="text-xs text-forest hover:underline disabled:opacity-50">
                      Resend code
                    </button>
                    <span className="text-ink-dim text-xs">·</span>
                    <button type="button" onClick={() => patchNin({ step: 'channel', error: '' })}
                      className="text-xs text-ink-muted hover:text-ink transition-colors">
                      Use a different channel
                    </button>
                  </div>
                </div>
              )}

              {/* Done */}
              {ninVerify.step === 'done' && ninVerify.result && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-forest shrink-0" />
                  <p className="text-sm text-forest font-semibold">{ninVerify.result.name}</p>
                </div>
              )}
            </div>
          )}

          {/* ── CAC verification (business) ── */}
          {issuerType === 'business' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-ink">CAC RC / BN Number</label>

              {/* Input + lookup */}
              {(cacVerify.step === 'input' || cacVerify.step === 'channel' || cacVerify.step === 'otp') && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rcNumber}
                    onChange={e => { setRcNumber(e.target.value); setCacVerify(initVerify()); setCacLookupError('') }}
                    disabled={cacVerify.step !== 'input'}
                    className={INPUT + (cacVerify.step !== 'input' ? ' opacity-60' : '')}
                    placeholder="RC1234567 or BN1234567"
                  />
                  {cacVerify.step === 'input' && (
                    <button type="button" onClick={lookupCac} disabled={cacLooking}
                      className="shrink-0 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                      {cacLooking ? <Loader2 size={13} className="animate-spin" /> : null}
                      Verify
                    </button>
                  )}
                </div>
              )}
              {cacLookupError && <p className="text-xs text-danger">{cacLookupError}</p>}
              {cacVerify.step === 'input' && !cacLookupError && (
                <p className="text-xs text-ink-dim">Your CAC registration or business name number.</p>
              )}

              {/* Channel picker */}
              {cacVerify.step === 'channel' && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <p className="text-xs font-semibold text-ink-muted">Choose where to receive your verification code:</p>
                  <div className="space-y-2">
                    {cacVerify.channels.map(ch => (
                      <button
                        key={ch.type}
                        type="button"
                        onClick={() => sendCacOtp(ch)}
                        disabled={cacVerify.sending}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white hover:border-forest/50 hover:bg-forest-light transition-colors text-left disabled:opacity-60"
                      >
                        {ch.type === 'sms'
                          ? <Smartphone size={16} className="text-forest shrink-0" />
                          : <Mail size={16} className="text-forest shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {ch.type === 'sms' ? 'Text message (SMS)' : 'Email'}
                          </p>
                          <p className="text-xs text-ink-muted">Send code to {ch.masked}</p>
                        </div>
                        {cacVerify.sending && cacVerify.selectedChannel?.type === ch.type && (
                          <Loader2 size={14} className="animate-spin text-forest ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  {cacVerify.error && <p className="text-xs text-danger">{cacVerify.error}</p>}
                </div>
              )}

              {/* OTP entry */}
              {cacVerify.step === 'otp' && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  <p className="text-xs text-ink-muted">
                    Enter the 6-digit code sent to <span className="font-semibold text-ink">{cacVerify.otpDestination}</span>
                  </p>
                  <div className="flex gap-1.5">
                    {cacVerify.otpCode.map((digit, i) => (
                      <input key={i} id={`cac-otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                        value={digit} onChange={e => handleCacOtpInput(i, e.target.value)} onKeyDown={e => handleCacOtpKeyDown(i, e)}
                        className={OTP_INPUT} autoFocus={i === 0} />
                    ))}
                    <button type="button" onClick={verifyCacOtp} disabled={cacVerify.verifying}
                      className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:cursor-not-allowed flex items-center gap-1.5">
                      {cacVerify.verifying ? <Loader2 size={13} className="animate-spin" /> : null}
                      Verify
                    </button>
                  </div>
                  {cacVerify.error && <p className="text-xs text-danger">{cacVerify.error}</p>}
                  <div className="flex items-center gap-3 pt-0.5">
                    <button type="button" onClick={() => cacVerify.selectedChannel && sendCacOtp(cacVerify.selectedChannel)}
                      disabled={cacVerify.sending} className="text-xs text-forest hover:underline disabled:opacity-50">
                      Resend code
                    </button>
                    <span className="text-ink-dim text-xs">·</span>
                    <button type="button" onClick={() => patchCac({ step: 'channel', error: '' })}
                      className="text-xs text-ink-muted hover:text-ink transition-colors">
                      Use a different channel
                    </button>
                  </div>
                </div>
              )}

              {/* Done */}
              {cacVerify.step === 'done' && cacVerify.result && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-forest shrink-0" />
                  <p className="text-sm text-forest font-semibold">{cacVerify.result.name}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !emailVerified || (!isGoogleUser && (!passwordValid || !passwordsMatch))}
            className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : <>Create account <ArrowRight size={15} /></>}
          </button>
          {!emailVerified && (
            <p className="text-xs text-center text-ink-dim -mt-2">Verify your email to continue</p>
          )}
          {!isGoogleUser && emailVerified && !passwordValid && passwordTouched && (
            <p className="text-xs text-center text-danger -mt-2">Set a valid password to continue</p>
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
