'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, ArrowRight, Loader2, UserPlus, LogIn, CheckCircle, RotateCcw, User, BadgeCheck, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { formatNaira } from '@/lib/formatters'
import { createClient } from '@/lib/supabase/client'

interface Item {
  id: string
  description: string
  quantity: string
  unitPrice: string
  totalPrice: number
}

const INPUT = 'w-full px-3 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque', 'Mobile Money', 'Other']

function newItem(): Item {
  return { id: Math.random().toString(36).slice(2), description: '', quantity: '1', unitPrice: '', totalPrice: 0 }
}

export default function DesktopGeneratePage() {
  const router = useRouter()

  const [userType, setUserType] = useState<'new' | 'returning' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [issuerPhone, setIssuerPhone] = useState('')

  const [passwordTouched, setPasswordTouched] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [profile, setProfile] = useState<{ full_name: string; business_name?: string; nin?: string; is_verified?: boolean; issuer_type: string; phone?: string } | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [resent, setResent] = useState(false)
  const [otpError, setOtpError] = useState('')

  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [items, setItems] = useState<Item[]>([newItem()])
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const sellerDisplayName = ''
  const tradingName = ''
  const [issuerMode, setIssuerMode] = useState<'individual' | 'business'>('individual')
  const [vatPercent, setVatPercent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)
  const vatAmount = parseFloat(vatPercent) > 0 ? parseFloat((subtotal * parseFloat(vatPercent) / 100).toFixed(2)) : 0
  const total = subtotal + vatAmount

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const passwordRules = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', ok: /\d/.test(password) },
  ]
  const passwordValid = passwordRules.every(r => r.ok)

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

  function resetUserType() {
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

  function updateItem(id: string, field: keyof Omit<Item, 'id' | 'totalPrice'>, value: string) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        updated.totalPrice = parseFloat(
          ((parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitPrice) || 0)).toFixed(2)
        )
        return updated
      })
    )
  }

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
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
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
    if (value && index < 5) document.getElementById(`gen-otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0)
      document.getElementById(`gen-otp-${index - 1}`)?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) setOtpCode(pasted.split(''))
  }

  function validate(): string | null {
    if (!userType) return 'Choose whether you are new or returning.'
    if (!isValidEmail) return 'A valid email address is required.'
    if (userType === 'new' && !codeVerified) return 'Please verify your email address first.'
    if (userType === 'new' && !issuerPhone.trim()) return 'Phone number is required.'
    if (userType === 'new' && !passwordValid) { setPasswordTouched(true); return 'Your password does not meet the requirements.' }
    if (userType === 'new' && password !== confirmPassword) return 'Passwords do not match.'
    if (userType === 'returning' && !signedIn) return 'Please sign in to your account first.'
    if (!buyerName.trim()) return 'Customer name is required.'
    if (!transactionDate) return 'Transaction date is required.'
    if (!paymentMethod) return 'Payment method is required.'
    const allValid = items.every(
      i => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.unitPrice) > 0
    )
    if (!allValid) return 'Each item needs a description, quantity, and unit price.'
    if (subtotal <= 0) return 'Total must be greater than zero.'
    return null
  }

  async function handleContinue() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)

    const supabase = createClient()

    if (userType === 'new') {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        setError('Could not set password. Please try again.')
        setLoading(false)
        return
      }
    }

    sessionStorage.setItem('dr_generate', JSON.stringify({
      email, userType, issuerMode, issuerPhone,
      buyerName, buyerPhone, buyerEmail, buyerAddress,
      items, transactionDate, paymentMethod, referenceNumber, notes,
      sellerDisplayName, tradingName,
      vatPercent, vatAmount, subtotal, total,
    }))

    setLoading(false)
    router.push('/generate/verify')
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-4 pb-12">

        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-forest text-white text-sm font-semibold hover:bg-forest-bright transition-colors"
        >
          <ArrowLeft size={15} />
          Back to home
        </button>

        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-ink">Generate a Receipt</h1>
          <p className="text-sm text-ink-muted mt-1">
            Fill in the details below. You&apos;ll verify your identity on the next step.
          </p>
        </div>

        {/* Your account */}
        <section className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-4">
          <h2 className="font-heading text-base sm:text-lg text-ink">Your account</h2>

          {/* Auto-detected session: skip choices, show profile card directly */}
          {autoDetected && signedIn && profile ? (
            <SignedInCard profile={profile} email={email} />
          ) : !sessionChecked ? (
            <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
              <Loader2 size={14} className="animate-spin text-forest" />
              Checking session…
            </div>
          ) : userType === null ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">Are you new or existing?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('new')}
                  className="flex flex-col items-center gap-2.5 p-4 border-2 border-border rounded-xl hover:border-forest/40 hover:bg-surface transition-all text-center group"
                >
                  <UserPlus size={22} className="text-ink-dim group-hover:text-forest transition-colors" />
                  <div>
                    <p className="text-sm font-semibold text-ink">New here</p>
                    <p className="text-xs text-ink-dim mt-0.5">Create an account</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('returning')}
                  className="flex flex-col items-center gap-2.5 p-4 border-2 border-border rounded-xl hover:border-forest/40 hover:bg-surface transition-all text-center group"
                >
                  <LogIn size={22} className="text-ink-dim group-hover:text-forest transition-colors" />
                  <div>
                    <p className="text-sm font-semibold text-ink">Existing user</p>
                    <p className="text-xs text-ink-dim mt-0.5">Sign in to continue</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {userType === 'new' ? 'Create your account' : signedIn ? 'Signed in' : 'Sign in to your account'}
                </p>
                <button type="button" onClick={resetUserType} className="text-xs text-forest/70 hover:text-forest transition-colors">
                  Change
                </button>
              </div>

              <div className="space-y-3">
                {!(userType === 'returning' && signedIn) && (
                  <Field label="Email address" required>
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value)
                        if (codeSent) { setCodeSent(false); setCodeVerified(false); setOtpCode(['','','','','','']); setOtpError('') }
                      }}
                      className={INPUT}
                      placeholder="you@example.com"
                      autoFocus
                      autoComplete="email"
                      disabled={codeVerified}
                    />
                  </Field>
                )}

                {userType === 'new' && !signedIn && (
                  <>
                    {!codeVerified && (
                      <>
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={!isValidEmail || sendingCode || codeSent}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-forest/50 hover:bg-surface hover:text-forest text-ink-muted"
                        >
                          {sendingCode ? <><Loader2 size={14} className="animate-spin" /> Sending code…</> : codeSent ? 'Code sent to email' : 'Send verification code to email'}
                        </button>
                        {otpError && !codeSent && (
                          <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{otpError}</p>
                        )}
                      </>
                    )}

                    {codeSent && !codeVerified && (
                      <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-ink">Enter the code</p>
                          <button type="button" onClick={handleResendCode} className="flex items-center gap-1.5 text-xs text-forest/70 hover:text-forest transition-colors">
                            <RotateCcw size={11} />
                            {resent ? 'Sent!' : 'Resend'}
                          </button>
                        </div>
                        <p className="text-xs text-ink-dim">6-digit code sent to <span className="font-medium text-ink">{email}</span></p>
                        <div className="flex gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                          {otpCode.map((digit, i) => (
                            <input key={i} id={`gen-otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpInput(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} className={OTP_INPUT} autoFocus={i === 0} />
                          ))}
                        </div>
                        {otpError && <p className="text-xs text-danger">{otpError}</p>}
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verifyingCode || otpCode.join('').length < 6}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright"
                        >
                          {verifyingCode ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : 'Verify code'}
                        </button>
                      </div>
                    )}

                    {codeVerified && (
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-forest-light border border-forest/20 rounded-lg">
                        <CheckCircle size={16} className="text-forest shrink-0" />
                        <p className="text-sm font-medium text-forest">Email verified</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {userType === 'new' && (
                <Field label="Phone number" required>
                  <input type="tel" value={issuerPhone} onChange={e => setIssuerPhone(e.target.value)} className={INPUT} placeholder="08012345678" autoComplete="tel" />
                </Field>
              )}

              {userType === 'new' && (
                <>
                  <Field label="Create a password" required>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordTouched(true) }}
                        className={`w-full pl-3 pr-10 py-2.5 bg-white border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 transition-colors ${passwordTouched && !passwordValid ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : 'border-border focus:border-forest/60 focus:ring-forest/20'}`}
                        placeholder="Min. 6 characters, used for future logins"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {passwordTouched && (
                      <div className="mt-2 space-y-1.5">
                        {passwordRules.map(rule => (
                          <div key={rule.label} className={`flex items-center gap-2 text-xs font-medium transition-colors ${rule.ok ? 'text-forest' : 'text-danger'}`}>
                            {rule.ok ? <CheckCircle2 size={12} className="shrink-0" /> : <X size={12} className="shrink-0" />}
                            {rule.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>
                  <Field label="Confirm password" required>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors" placeholder="Re-enter your password" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-ink">Issuer identity</p>
                    <p className="text-xs text-ink-dim">How should this receipt identify you?</p>
                    <div className="flex rounded-xl border border-border overflow-hidden">
                      <button type="button" onClick={() => setIssuerMode('individual')} className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors ${issuerMode === 'individual' ? 'bg-forest text-white' : 'bg-white text-ink-muted hover:bg-surface'}`}>
                        Issue as an individual
                      </button>
                      <button type="button" onClick={() => setIssuerMode('business')} className={`flex-1 py-3 text-xs sm:text-sm font-medium border-l border-border transition-colors ${issuerMode === 'business' ? 'bg-forest text-white' : 'bg-white text-ink-muted hover:bg-surface'}`}>
                        Issue as a business
                      </button>
                    </div>
                  </div>
                </>
              )}

              {userType === 'returning' && !signedIn && (
                <div className="space-y-3">
                  <Field label="Password" required>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-3 pr-10 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors" placeholder="Your password" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && handleReturningLogin()} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </Field>
                  {loginError && <p className="text-xs text-danger">{loginError}</p>}
                  <button type="button" onClick={handleReturningLogin} disabled={signingIn || !isValidEmail || !password} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-forest hover:bg-forest-bright">
                    {signingIn ? <><Loader2 size={14} className="animate-spin" /> Signing in…</> : 'Sign in'}
                  </button>
                </div>
              )}

              {userType === 'returning' && signedIn && profile && (
                <SignedInCard profile={profile} email={email} />
              )}
            </div>
          )}
        </section>

        {/* Transaction details */}
        <section className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-5">
          <h2 className="font-heading text-base sm:text-lg text-ink">Transaction details</h2>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Customer information</p>
            <Field label="Customer name" required>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className={INPUT} placeholder="Full name of buyer" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer phone" hint="optional">
                <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} className={INPUT} placeholder="08012345678" />
              </Field>
              <Field label="Customer email" hint="optional">
                <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} className={INPUT} placeholder="buyer@example.com" />
              </Field>
            </div>
            <Field label="Customer address" hint="optional">
              <input type="text" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className={INPUT} placeholder="Street, City, State" />
            </Field>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Items purchased</p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface/50 p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder={`Item ${idx + 1} description`} className={`${INPUT} flex-1 min-w-0`} />
                    <button type="button" onClick={() => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)} disabled={items.length === 1} className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Qty</label>
                      <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} min="0.01" step="0.01" className={`${INPUT} text-center`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Unit price (₦)</label>
                      <input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" placeholder="0.00" className={`${INPUT} text-right`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-ink-dim">Total</label>
                      <div className="px-2 py-2.5 bg-white border border-border rounded-lg text-xs text-right text-ink-muted tabular-nums">
                        {item.totalPrice > 0 ? formatNaira(item.totalPrice) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setItems(prev => [...prev, newItem()])} className="flex items-center gap-2 text-sm text-forest/70 hover:text-forest font-medium py-1 transition-colors">
                <Plus size={14} />
                Add another item
              </button>
            </div>

            <div className="border-t border-border pt-3 space-y-2.5">
              {subtotal > 0 && (
                <div className="flex justify-between text-sm text-ink-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatNaira(subtotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-muted">VAT</span>
                  <div className="relative w-20">
                    <input type="number" value={vatPercent} onChange={e => setVatPercent(e.target.value)} min="0" max="100" step="0.5" placeholder="0" className="w-full pl-3 pr-6 py-1.5 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-dim pointer-events-none">%</span>
                  </div>
                </div>
                <span className="text-sm text-ink-muted tabular-nums">{vatAmount > 0 ? `+ ${formatNaira(vatAmount)}` : '-'}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-ink border-t border-border pt-2.5">
                <span className="text-sm">Total</span>
                <span className="font-heading text-base tabular-nums">{formatNaira(total)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide">Payment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Transaction date" required>
                <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Payment method" required>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT}>
                  <option value="">Select method…</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Reference number" hint="optional">
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className={INPUT} placeholder="e.g. TRF-2026-001" />
            </Field>
            <Field label="Notes" hint="optional">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="Any additional notes…" />
            </Field>
          </div>
        </section>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-forest text-white rounded-xl font-semibold text-sm hover:bg-forest-bright disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? 'Please wait…' : 'Continue to verification'}
        </button>

      </div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
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

function SignedInCard({ profile, email }: {
  profile: { full_name: string; business_name?: string; nin?: string; is_verified?: boolean; issuer_type: string; phone?: string }
  email: string
}) {
  const verified = profile.is_verified
  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-forest-light border border-forest/20 flex items-center justify-center shrink-0">
          <User size={18} className="text-forest" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{profile.full_name || email}</p>
          <p className="text-xs text-ink-dim truncate">{email}</p>
        </div>
        {verified && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-forest bg-forest-light px-2.5 py-1 rounded-full border border-forest/15 shrink-0">
            <BadgeCheck size={12} />
            Verified
          </div>
        )}
      </div>
      {!verified && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">Identity verification required — complete it on the next step.</p>
        </div>
      )}
    </div>
  )
}
