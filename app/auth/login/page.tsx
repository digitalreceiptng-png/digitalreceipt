'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-12 h-14 text-center text-xl font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('user')) {
        setError('No account found for this email. Please register first.')
      } else {
        setError(error.message)
      }
      return
    }

    setStep('otp')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) { setError('Enter the full 6-digit code.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

    if (error) {
      setError('Invalid or expired code. Please try again.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[index] = value.slice(-1)
    setCode(next)
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
    }
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md space-y-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-8">
        <div className="w-12 h-12 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mb-5">
          <Mail size={22} className="text-forest" />
        </div>
        <h1 className="font-heading text-2xl text-ink mb-1">Check your email</h1>
        <p className="text-sm text-ink-muted mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-semibold text-ink mb-7">{email}</p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-ink mb-3">Enter code</label>
            <div className="flex gap-2" onPaste={handleOtpPaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
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
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || code.join('').length < 6}
            className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying…' : <>Sign in <ArrowRight size={15} /></>}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setError('') }}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Change email
          </button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-forest/70 hover:text-forest transition-colors disabled:opacity-50"
          >
            <RotateCcw size={13} />
            {resent ? 'Code sent!' : resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
      </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-8">
      <h1 className="font-heading text-2xl text-ink mb-1">Access your receipts</h1>
      <p className="text-sm text-ink-muted mb-7">Enter your email address and we&apos;ll send you a secure one-time code. No password needed.</p>

      <form onSubmit={handleSendCode} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className={INPUT}
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
        >
          {loading ? 'Sending code…' : <>Send login code <ArrowRight size={15} /></>}
        </button>
      </form>

      <p className="text-sm text-center text-ink-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-forest font-medium hover:underline">
          Create one free
        </Link>
      </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
