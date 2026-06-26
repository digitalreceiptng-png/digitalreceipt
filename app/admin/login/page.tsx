'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Step = 'credentials' | 'otp'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const INPUT_STYLE = {
    background: 'oklch(0.14 0.044 145)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.90)',
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError('Invalid email or password.'); return }

      const res = await fetch('/api/admin/verify', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.isAdmin) {
        await supabase.auth.signOut()
        setError('You do not have admin access.')
        return
      }

      // Send OTP to admin email
      const otpRes = await fetch('/api/admin/otp', { method: 'POST' })
      if (!otpRes.ok) { setError('Failed to send OTP. Please try again.'); return }

      setStep('otp')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid OTP.'); return }
      router.push('/admin/overview')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    setResending(true)
    setError('')
    setOtp(['', '', '', '', '', ''])
    await fetch('/api/admin/otp', { method: 'POST' })
    setResending(false)
    otpRefs.current[0]?.focus()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'oklch(0.14 0.044 145)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.22 0.14 145 / 0.6) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image src="/Full%20Logo%20for%20Green%20Background.png" alt="DigitalReceipt.ng" width={180} height={68} className="object-contain" priority />
          <h1 className="font-heading text-xl font-bold" style={{ color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em' }}>Admin Console</h1>
        </div>

        <div className="rounded-2xl border p-7" style={{ background: 'oklch(0.18 0.08 145)', borderColor: 'rgba(255,255,255,0.08)' }}>

          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium block" style={{ color: 'rgba(255,255,255,0.55)' }}>Email address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="Email address"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={INPUT_STYLE}
                  onFocus={e => (e.currentTarget.style.borderColor = 'oklch(0.42 0.18 145 / 0.8)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium block" style={{ color: 'rgba(255,255,255,0.55)' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={INPUT_STYLE}
                    onFocus={e => (e.currentTarget.style.borderColor = 'oklch(0.42 0.18 145 / 0.8)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'rgba(255,255,255,0.30)' }} tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm" style={{ background: 'oklch(0.52 0.20 25 / 0.15)', color: 'oklch(0.75 0.15 25)' }}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 mt-1" style={{ background: 'oklch(0.42 0.18 145)', color: 'white', boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.35)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Signing in…</span> : 'Sign in to Admin Console'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-5">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'oklch(0.42 0.18 145 / 0.2)' }}>
                  <ShieldCheck size={22} style={{ color: 'oklch(0.72 0.18 145)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Check your email</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  A 6-digit code was sent to your admin email address. Enter it below to continue.
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-11 h-13 text-center text-lg font-bold rounded-xl outline-none transition-all"
                    style={{
                      ...INPUT_STYLE,
                      height: '52px',
                      borderColor: digit ? 'oklch(0.42 0.18 145 / 0.8)' : 'rgba(255,255,255,0.10)',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'oklch(0.42 0.18 145 / 0.8)')}
                    onBlur={e => (e.currentTarget.style.borderColor = digit ? 'oklch(0.42 0.18 145 / 0.6)' : 'rgba(255,255,255,0.10)')}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm" style={{ background: 'oklch(0.52 0.20 25 / 0.15)', color: 'oklch(0.75 0.15 25)' }}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />{error}
                </div>
              )}

              <button type="submit" disabled={loading || otp.join('').length < 6} className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60" style={{ background: 'oklch(0.42 0.18 145)', color: 'white', boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.35)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Verifying…</span> : 'Verify & Enter Console'}
              </button>

              <div className="text-center">
                <button type="button" onClick={resendOtp} disabled={resending} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.20)' }}>
          Restricted access. Unauthorised attempts are logged.
        </p>
      </div>
    </div>
  )
}
