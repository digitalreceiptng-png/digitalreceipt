'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

type IssuerType = 'individual' | 'business'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-12 h-14 text-center text-xl font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'otp'>('form')

  const [issuerType, setIssuerType] = useState<IssuerType>('individual')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [nin, setNin] = useState('')
  const [rcNumber, setRcNumber] = useState('')
  const [email, setEmail] = useState('')

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (issuerType === 'business' && !businessName.trim()) {
      setError('Business name is required for business accounts.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, issuer_type: issuerType },
      },
    })

    setLoading(false)
    if (otpError) { setError(otpError.message); return }

    setStep('otp')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) { setError('Enter the full 6-digit code.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

    if (verifyError) {
      setError('Invalid or expired code. Please try again.')
      setLoading(false)
      return
    }

    if (data.user) {
      const updates: Record<string, string> = {}
      if (phone) updates.phone = phone
      if (issuerType === 'individual' && nin) updates.nin = nin
      if (issuerType === 'business') {
        updates.business_name = businessName
        if (rcNumber) updates.rc_number = rcNumber
      }
      if (Object.keys(updates).length) {
        await supabase.from('profiles').update(updates).eq('id', data.user.id)
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { full_name: fullName, issuer_type: issuerType } },
    })
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
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) setCode(pasted.split(''))
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
        <h1 className="font-heading text-2xl text-ink mb-1">Verify your email</h1>
        <p className="text-sm text-ink-muted mb-1">We sent a 6-digit code to</p>
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
            {loading ? 'Creating account…' : <>Activate account <ArrowRight size={15} /></>}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            onClick={() => { setStep('form'); setCode(['', '', '', '', '', '']); setError('') }}
            className="text-ink-muted hover:text-ink transition-colors"
          >
            Go back
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
    <div className="w-full max-w-lg space-y-4">
      <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors">
        <ArrowLeft size={16} /> Back to home
      </Link>
      <div className="w-full bg-white rounded-2xl shadow-sm border border-border p-8">
      <h1 className="font-heading text-2xl text-ink mb-1">Create your account</h1>
      <p className="text-sm text-ink-muted mb-7">Free for individuals and businesses. No card required.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" className={INPUT} placeholder="Chukwuemeka Obi" />
        </div>

        {issuerType === 'business' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Business name</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required className={INPUT} placeholder="Obi & Sons Ltd." />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Phone number <span className="text-ink-dim font-normal">(optional)</span>
          </label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" className={INPUT} placeholder="08012345678" />
        </div>

        {issuerType === 'individual' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              NIN <span className="text-ink-dim font-normal">(optional)</span>
            </label>
            <input type="text" value={nin} onChange={e => setNin(e.target.value)} maxLength={11} className={INPUT} placeholder="12345678901" />
            <p className="text-xs text-ink-dim mt-1">Stored securely. Used only for identity verification review.</p>
          </div>
        )}

        {issuerType === 'business' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              CAC RC Number <span className="text-ink-dim font-normal">(optional)</span>
            </label>
            <input type="text" value={rcNumber} onChange={e => setRcNumber(e.target.value)} className={INPUT} placeholder="RC1234567" />
            <p className="text-xs text-ink-dim mt-1">Your CAC registration number. Stored for verification review.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className={INPUT} placeholder="you@example.com" />
          <p className="text-xs text-ink-dim mt-1">We&apos;ll send a verification code to this address.</p>
        </div>

        {error && (
          <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
        >
          {loading ? 'Sending code…' : <>Continue <ArrowRight size={15} /></>}
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
