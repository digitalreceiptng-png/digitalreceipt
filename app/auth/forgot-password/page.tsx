'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, KeyRound, CheckCircle, CheckCircle2, Loader2, Eye, EyeOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

type Step = 'email' | 'code' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (err) {
      setError(
        err.message.includes('not found') || err.message.includes('No user')
          ? 'No account found with that email address.'
          : err.message
      )
      return
    }
    setStep('code')
  }

  async function resendCode() {
    setResending(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setResending(false)
    if (err) setError('Could not resend code. Please try again.')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError('Invalid or expired code. Please try again.')
      return
    }
    setStep('password')
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!/[a-zA-Z]/.test(password)) { setError('Password must contain at least one letter.'); return }
    if (!/[0-9]/.test(password)) { setError('Password must contain at least one number.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('done')
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors"
      >
        <ArrowLeft size={15} /> Back to sign in
      </Link>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-5 sm:p-8 space-y-5">
        {/* Step: email */}
        {step === 'email' && (
          <>
            <div className="text-center space-y-2">
              <div className="w-11 h-11 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
                <Mail size={20} className="text-forest" />
              </div>
              <h1 className="font-heading text-xl text-ink">Reset your password</h1>
              <p className="text-sm text-ink-muted">
                Enter the email address on your account and we'll send a 6-digit code.
              </p>
            </div>

            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className={INPUT}
                />
              </div>
              {error && (
                <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-forest hover:bg-forest-bright disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          </>
        )}

        {/* Step: code */}
        {step === 'code' && (
          <>
            <div className="text-center space-y-2">
              <div className="w-11 h-11 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
                <KeyRound size={20} className="text-forest" />
              </div>
              <h1 className="font-heading text-xl text-ink">Enter your code</h1>
              <p className="text-sm text-ink-muted">
                We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>. Check your inbox and spam folder.
              </p>
            </div>

            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">6-digit code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  inputMode="numeric"
                  className={`${INPUT} tracking-widest text-center text-lg font-mono`}
                />
              </div>
              {error && (
                <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-forest hover:bg-forest-bright disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Verifying…' : 'Verify code'}
              </button>
              <div className="flex items-center justify-between text-xs text-ink-muted pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError('') }}
                  className="hover:text-forest transition-colors"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resending}
                  className="hover:text-forest transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step: new password */}
        {step === 'password' && (
          <>
            <div className="text-center space-y-2">
              <div className="w-11 h-11 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
                <KeyRound size={20} className="text-forest" />
              </div>
              <h1 className="font-heading text-xl text-ink">Set new password</h1>
              <p className="text-sm text-ink-muted">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoFocus
                    className={`${INPUT} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className={`${INPUT} pr-10 ${confirmPassword && confirmPassword !== password ? 'border-danger/60 focus:border-danger/60 focus:ring-danger/20' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
                    <X size={13} className="shrink-0" /> Passwords do not match
                  </p>
                )}
                {confirmPassword && confirmPassword === password && password.length >= 8 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-forest">
                    <CheckCircle2 size={13} className="shrink-0" /> Passwords match
                  </p>
                )}
              </div>
              {error && (
                <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
              )}
              <button
                type="submit"
                disabled={loading || !confirmPassword || confirmPassword !== password}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-forest hover:bg-forest-bright disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="text-center space-y-3 py-2">
            <div className="w-11 h-11 bg-success/10 border border-success/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={20} className="text-success" />
            </div>
            <h1 className="font-heading text-xl text-ink">Password updated</h1>
            <p className="text-sm text-ink-muted">Your password has been reset. Redirecting you to sign in…</p>
          </div>
        )}
      </div>
    </div>
  )
}
