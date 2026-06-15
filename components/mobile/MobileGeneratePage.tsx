'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Plus, Trash2, Loader2,
  UserPlus, LogIn, CheckCircle, RotateCcw, User, BadgeCheck,
  Eye, EyeOff, ChevronLeft, AlertCircle, CheckCircle2, X,
} from 'lucide-react'
import { formatNaira } from '@/lib/formatters'
import { createClient } from '@/lib/supabase/client'

/* ── Types & constants ────────────────────────────────────────────── */

interface Item {
  id: string
  description: string
  quantity: string
  unitPrice: string
  totalPrice: number
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Mobile Money', 'Other']

const INPUT = 'w-full px-3 py-3 bg-white border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

function newItem(): Item {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '', totalPrice: 0 }
}

const STEPS = ['Account', 'Customer', 'Items', 'Payment', 'Review']

/* ── Main component ───────────────────────────────────────────────── */

export default function MobileGeneratePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  /* Account state */
  const [userType, setUserType] = useState<'new' | 'returning' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [issuerPhone, setIssuerPhone] = useState('')

  const [signingIn, setSigningIn] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [profile, setProfile] = useState<{ full_name: string; business_name?: string; nin?: string; is_verified?: boolean; issuer_type: string; phone?: string } | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resent, setResent] = useState(false)
  const [otpError, setOtpError] = useState('')

  /* Buyer state */
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')

  /* Items state */
  const [items, setItems] = useState<Item[]>([newItem()])
  const [vatPercent, setVatPercent] = useState('')

  /* Payment state */
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  /* Identity + submit state */
  const [issuerMode, setIssuerMode] = useState<'individual' | 'business'>('individual')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  /* Derived */
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const passwordRules = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', ok: /\d/.test(password) },
  ]
  const passwordValid = passwordRules.every(r => r.ok)
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const vatAmount = parseFloat(vatPercent) > 0
    ? parseFloat((subtotal * parseFloat(vatPercent) / 100).toFixed(2))
    : 0
  const total = subtotal + vatAmount

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? '')
        setUserType('returning')
        setSignedIn(true)
        setAutoDetected(true)
        const { data } = await supabase
          .from('profiles')
          .select('full_name, business_name, nin, is_verified, issuer_type, phone')
          .eq('id', user.id)
          .single()
        setProfile(data ?? { full_name: user.email?.split('@')[0] ?? '', issuer_type: 'individual' })
      }
      setSessionChecked(true)
    })
  }, [])

  /* ── Helpers ──────────────────────────────────────────────────────── */

  function updateItem(id: string, field: keyof Omit<Item, 'id' | 'totalPrice'>, value: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      updated.totalPrice = parseFloat(
        ((parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitPrice) || 0)).toFixed(2)
      )
      return updated
    }))
  }

  function resetAccount() {
    setUserType(null)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setIssuerPhone('')
    setSignedIn(false)
    setProfile(null)
    setLoginError('')
    setCodeSent(false)
    setCodeVerified(false)
    setOtpCode(['', '', '', '', '', ''])
    setOtpError('')
  }

  /* ── OTP handlers ─────────────────────────────────────────────────── */

  async function handleSendCode() {
    if (!isValidEmail) return
    setOtpError('')
    setSendingCode(true)
    try {
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const checkData = await checkRes.json()
      if (checkData.exists) {
        setOtpError('This email already has an account. Use "Existing user" to sign in instead.')
        setSendingCode(false)
        return
      }

      const supabase = createClient()
      const { error: otpErr } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
      setSendingCode(false)
      if (otpErr) { setOtpError(otpErr.message); return }
      setCodeSent(true)
    } catch {
      setSendingCode(false)
      setOtpError('Failed to send code. Check your connection and try again.')
    }
  }

  async function handleResendCode() {
    setResent(false)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  async function handleVerifyCode() {
    const token = otpCode.join('')
    if (token.length < 6) { setOtpError('Enter the full 6-digit code.'); return }
    setOtpError('')
    setVerifyingCode(true)
    const supabase = createClient()
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
    setVerifyingCode(false)
    if (verifyErr) { setOtpError('Invalid or expired code. Please try again.'); return }
    setCodeVerified(true)
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpCode]
    next[index] = value.slice(-1)
    setOtpCode(next)
    if (value && index < 5) document.getElementById(`m-otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0)
      document.getElementById(`m-otp-${index - 1}`)?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) setOtpCode(pasted.split(''))
  }

  /* ── Sign-in handler ──────────────────────────────────────────────── */

  async function handleReturningLogin() {
    if (!isValidEmail || !password) return
    setLoginError('')
    setSigningIn(true)
    const supabase = createClient()
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr || !data.user) {
      setLoginError('Incorrect email or password.')
      setSigningIn(false)
      return
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, business_name, nin, is_verified, issuer_type, phone')
      .eq('id', data.user.id)
      .single()
    setProfile(profileData ?? { full_name: email.split('@')[0], issuer_type: 'individual' })
    setSignedIn(true)
    setSigningIn(false)
  }

  /* ── Step validation ──────────────────────────────────────────────── */

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!userType) return 'Choose whether you are new or returning.'
      if (!isValidEmail) return 'Enter a valid email address.'
      if (userType === 'new' && !codeVerified) return 'Please verify your email first.'
      if (userType === 'new' && !issuerPhone.trim()) return 'Phone number is required.'
      if (userType === 'new' && !passwordValid) { setPasswordTouched(true); return 'Your password does not meet the requirements.' }
      if (userType === 'new' && password !== confirmPassword) return 'Passwords do not match.'
      if (userType === 'returning' && !signedIn) return 'Please sign in to your account first.'
    }
    if (s === 2) {
      if (!buyerName.trim()) return 'Customer name is required.'
    }
    if (s === 3) {
      const allValid = items.every(i => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitPrice) > 0)
      if (!allValid) return 'Each item needs a description, quantity, and unit price.'
      if (subtotal <= 0) return 'Total must be greater than zero.'
    }
    if (s === 4) {
      if (!transactionDate) return 'Transaction date is required.'
      if (!paymentMethod) return 'Payment method is required.'
    }
    return null
  }

  function goNext() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function goBack() {
    setError('')
    if (step === 1) { router.push('/'); return }
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  /* ── Final submit ─────────────────────────────────────────────────── */

  async function handleSubmit() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    if (userType === 'new') {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) { setError('Could not set password. Please try again.'); setLoading(false); return }
    }
    sessionStorage.setItem('dr_generate', JSON.stringify({
      email, userType, issuerMode, issuerPhone,
      buyerName, buyerPhone, buyerEmail, buyerAddress,
      items, transactionDate, paymentMethod, referenceNumber, notes,
      sellerDisplayName: '', tradingName: '',
      vatPercent, vatAmount, subtotal, total,
    }))
    setLoading(false)
    router.push('/generate/verify')
  }

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-surface flex flex-col">

      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-border px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:bg-surface transition-colors shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-xs text-ink-dim font-medium">Step {step} of {STEPS.length}</p>
            <p className="text-sm font-semibold text-ink leading-tight">{STEPS[step - 1]}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i < step ? 'oklch(0.42 0.145 145)' : 'oklch(0.9 0.01 145)' }}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-5 pb-28 space-y-4">

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl text-ink">Your account</h1>
              <p className="text-sm text-ink-muted mt-1">Sign in or create a free account to issue receipts.</p>
            </div>

            {autoDetected && signedIn && profile ? (
              <MSignedInCard profile={profile} email={email} />
            ) : !sessionChecked ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
                <Loader2 size={14} className="animate-spin text-forest" />
                Checking session…
              </div>
            ) : userType === null ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setUserType('new'); setError('') }}
                  className="flex flex-col items-center gap-3 p-5 border-2 border-border rounded-2xl hover:border-forest/40 hover:bg-white bg-white transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-forest-light flex items-center justify-center">
                    <UserPlus size={20} className="text-forest" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">New here</p>
                    <p className="text-xs text-ink-dim mt-0.5">Create account</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setUserType('returning'); setError('') }}
                  className="flex flex-col items-center gap-3 p-5 border-2 border-border rounded-2xl hover:border-forest/40 hover:bg-white bg-white transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-forest-light flex items-center justify-center">
                    <LogIn size={20} className="text-forest" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Existing user</p>
                    <p className="text-xs text-ink-dim mt-0.5">Sign in</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">
                    {userType === 'new' ? 'Create your account' : signedIn ? 'Signed in' : 'Sign in'}
                  </p>
                  <button type="button" onClick={resetAccount} className="text-xs text-forest hover:underline">
                    Change
                  </button>
                </div>

                {/* Email */}
                {!(userType === 'returning' && signedIn) && (
                  <MField label="Email address" required>
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        if (codeSent) { setCodeSent(false); setCodeVerified(false); setOtpCode(['','','','','','']); setOtpError('') }
                      }}
                      className={INPUT}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={codeVerified}
                      inputMode="email"
                    />
                  </MField>
                )}

                {/* New user: OTP flow */}
                {userType === 'new' && (
                  <>
                    {!codeVerified && (
                      <>
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={!isValidEmail || sendingCode || codeSent}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium transition-colors disabled:opacity-50 text-ink-muted hover:border-forest/50 hover:text-forest"
                        >
                          {sendingCode ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : codeSent ? 'Code sent to email' : 'Send verification code'}
                        </button>
                        {otpError && !codeSent && (
                          <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-xl px-3 py-2">{otpError}</p>
                        )}
                      </>
                    )}

                    {codeSent && !codeVerified && (
                      <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink">Enter the 6-digit code</p>
                          <button type="button" onClick={handleResendCode} className="flex items-center gap-1.5 text-xs text-forest">
                            <RotateCcw size={11} />
                            {resent ? 'Sent!' : 'Resend'}
                          </button>
                        </div>
                        <p className="text-xs text-ink-dim">Sent to <span className="font-medium text-ink">{email}</span></p>
                        <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                          {otpCode.map((digit, i) => (
                            <input
                              key={i}
                              id={`m-otp-${i}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={e => handleOtpInput(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)}
                              className="w-11 h-13 text-center text-lg font-semibold bg-surface border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                              autoFocus={i === 0}
                            />
                          ))}
                        </div>
                        {otpError && <p className="text-xs text-danger">{otpError}</p>}
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verifyingCode || otpCode.join('').length < 6}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 text-white bg-forest"
                        >
                          {verifyingCode ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : 'Verify code'}
                        </button>
                      </div>
                    )}

                    {codeVerified && (
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-forest-light border border-forest/20 rounded-xl">
                        <CheckCircle size={16} className="text-forest shrink-0" />
                        <p className="text-sm font-medium text-forest">Email verified</p>
                      </div>
                    )}

                    <MField label="Phone number" required>
                      <input type="tel" value={issuerPhone} onChange={e => setIssuerPhone(e.target.value)} className={INPUT} placeholder="08012345678" inputMode="tel" />
                    </MField>

                    <MField label="Create a password" required>
                      <PasswordField value={password} onChange={v => { setPassword(v); setPasswordTouched(true) }} show={showPassword} onToggle={() => setShowPassword(v => !v)} placeholder="Min. 6 characters" autoComplete="new-password" invalid={passwordTouched && !passwordValid} />
                      {passwordTouched && (
                        <div className="mt-2 space-y-1.5">
                          {passwordRules.map(rule => (
                            <div key={rule.label} className={`flex items-center gap-2 text-xs font-medium ${rule.ok ? 'text-forest' : 'text-danger'}`}>
                              {rule.ok ? <CheckCircle2 size={12} className="shrink-0" /> : <X size={12} className="shrink-0" />}
                              {rule.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </MField>
                    <MField label="Confirm password" required>
                      <PasswordField value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} placeholder="Re-enter password" autoComplete="new-password" />
                    </MField>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-ink">Issuer identity</p>
                      <p className="text-xs text-ink-dim">How should this receipt identify you?</p>
                      <div className="flex rounded-xl border border-border overflow-hidden">
                        <button type="button" onClick={() => setIssuerMode('individual')} className={`flex-1 py-3 text-sm font-medium transition-colors ${issuerMode === 'individual' ? 'bg-forest text-white' : 'bg-white text-ink-muted'}`}>
                          Individual
                        </button>
                        <button type="button" onClick={() => setIssuerMode('business')} className={`flex-1 py-3 text-sm font-medium border-l border-border transition-colors ${issuerMode === 'business' ? 'bg-forest text-white' : 'bg-white text-ink-muted'}`}>
                          Business
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Returning: password + sign in */}
                {userType === 'returning' && !signedIn && (
                  <div className="space-y-3">
                    <MField label="Password" required>
                      <PasswordField value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword(v => !v)} placeholder="Your password" autoComplete="current-password" onEnter={handleReturningLogin} />
                    </MField>
                    {loginError && <p className="text-xs text-danger">{loginError}</p>}
                    <button
                      type="button"
                      onClick={handleReturningLogin}
                      disabled={signingIn || !isValidEmail || !password}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 text-white bg-forest"
                    >
                      {signingIn ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : 'Sign in'}
                    </button>
                  </div>
                )}

                {/* Signed-in profile card */}
                {userType === 'returning' && signedIn && profile && (
                  <MSignedInCard profile={profile} email={email} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Customer ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl text-ink">Customer details</h1>
              <p className="text-sm text-ink-muted mt-1">Who is this receipt for?</p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
              <MField label="Customer name" required>
                <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className={INPUT} placeholder="Full name of buyer" autoFocus />
              </MField>
              <MField label="Phone number" hint="optional">
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className={INPUT} placeholder="08012345678" inputMode="tel" />
              </MField>
              <MField label="Email address" hint="optional">
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} className={INPUT} placeholder="buyer@example.com" inputMode="email" />
              </MField>
              <MField label="Address" hint="optional">
                <input type="text" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className={INPUT} placeholder="Street, City, State" />
              </MField>
            </div>
          </div>
        )}

        {/* ── Step 3: Items ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl text-ink">Items</h1>
              <p className="text-sm text-ink-muted mt-1">What was purchased?</p>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-white rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Item {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)}
                      disabled={items.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Description"
                    className={INPUT}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Qty</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm text-center text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Price (₦)</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, 'unitPrice', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm text-right text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Total</label>
                      <div className="px-3 py-2.5 bg-surface border border-border rounded-xl text-xs text-right text-ink-muted tabular-nums">
                        {item.totalPrice > 0 ? formatNaira(item.totalPrice) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setItems(prev => [...prev, newItem()])}
                className="flex items-center gap-2 text-sm text-forest font-medium py-2 px-1"
              >
                <Plus size={15} />
                Add another item
              </button>
            </div>

            {/* Totals */}
            <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
              <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Totals</p>
              {subtotal > 0 && (
                <div className="flex justify-between text-sm text-ink-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatNaira(subtotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">VAT (%)</span>
                  <div className="relative w-20">
                    <input
                      type="number"
                      value={vatPercent}
                      onChange={e => setVatPercent(e.target.value)}
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0"
                      className="w-full pl-3 pr-6 py-2 border border-border rounded-xl text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-forest/20 transition-colors"
                      inputMode="decimal"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-dim pointer-events-none">%</span>
                  </div>
                </div>
                <span className="text-sm text-ink-muted tabular-nums">
                  {vatAmount > 0 ? `+ ${formatNaira(vatAmount)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center font-semibold text-ink border-t border-border pt-3">
                <span className="text-sm">Total</span>
                <span className="font-heading text-lg tabular-nums">{formatNaira(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Payment ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl text-ink">Payment details</h1>
              <p className="text-sm text-ink-muted mt-1">When and how was payment made?</p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
              <MField label="Transaction date" required>
                <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className={INPUT} />
              </MField>
              <MField label="Payment method" required>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT}>
                  <option value="">Select method…</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </MField>
              <MField label="Reference number" hint="optional">
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={INPUT} placeholder="e.g. TRF-2026-001" />
              </MField>
              <MField label="Notes" hint="optional">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${INPUT} resize-none`} placeholder="Any additional notes…" />
              </MField>
            </div>
          </div>
        )}

        {/* ── Step 5: Review & identity ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-heading text-2xl text-ink">Review</h1>
              <p className="text-sm text-ink-muted mt-1">
                {signedIn && profile?.is_verified ? 'Check everything before generating your receipt.' : 'Check everything before continuing to identity verification.'}
              </p>
            </div>

            {/* Summary cards */}
            <ReviewRow label="Email" value={email} />
            <ReviewRow label="Buyer" value={buyerName} />
            <ReviewRow
              label="Items"
              value={`${items.length} item${items.length !== 1 ? 's' : ''} · ${formatNaira(total)}`}
            />
            <ReviewRow
              label="Payment"
              value={`${paymentMethod || 'Not set'} · ${transactionDate ? new Date(transactionDate + 'T00:00').toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}`}
            />

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border px-4 py-3">
        {step < 5 ? (
          <button
            onClick={goNext}
            className="w-full flex items-center justify-center gap-2 py-4 bg-forest text-white rounded-xl font-semibold text-sm"
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-forest text-white rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Please wait…</> : <>{(signedIn && profile?.is_verified) ? 'Continue' : 'Continue to verification'} <ArrowRight size={16} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────── */

function MField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {hint && <span className="text-ink-dim font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function PasswordField({ value, onChange, show, onToggle, placeholder, autoComplete, onEnter, invalid }: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
  autoComplete?: string
  onEnter?: () => void
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full pl-3 pr-11 py-3 bg-white border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 transition-colors ${invalid ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : 'border-border focus:border-forest/60 focus:ring-forest/20'}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onKeyDown={onEnter ? e => e.key === 'Enter' && onEnter() : undefined}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-sm text-ink-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-ink text-right truncate">{value}</span>
    </div>
  )
}

function MSignedInCard({ profile, email }: {
  profile: { full_name: string; business_name?: string; nin?: string; is_verified?: boolean; issuer_type: string; phone?: string }
  email: string
}) {
  const verified = profile.is_verified
  return (
    <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-forest-light border border-forest/20 flex items-center justify-center shrink-0">
          <User size={20} className="text-forest" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{profile.full_name || email}</p>
          <p className="text-xs text-ink-dim truncate">{email}</p>
        </div>
        {verified && (
          <div className="flex items-center gap-1 text-xs font-medium text-forest bg-forest-light px-2.5 py-1 rounded-full border border-forest/15 shrink-0">
            <BadgeCheck size={12} />
            Verified
          </div>
        )}
      </div>
      {!verified && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">Identity verification required — complete it on the next step.</p>
        </div>
      )}
    </div>
  )
}
