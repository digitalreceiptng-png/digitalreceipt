'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, RotateCcw, CheckCircle, Download, Lock, Mail, Phone } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

interface SavedForm {
  email: string
  buyerName: string
  buyerPhone: string
  buyerEmail: string
  buyerAddress: string
  items: Array<{ id: string; description: string; quantity: string; unitPrice: string; totalPrice: number }>
  transactionDate: string
  paymentMethod: string
  referenceNumber: string
  notes: string
  sellerDisplayName: string
  tradingName: string
  vatPercent: string
  vatAmount: number
  subtotal: number
  total: number
}

interface Generated {
  id: string
  receiptNumber: string
  identifier: string
}

export default function VerifyPage() {
  const router = useRouter()
  const [form, setForm] = useState<SavedForm | null>(null)
  const [nin, setNin] = useState('')
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [generated, setGenerated] = useState<Generated | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('dr_generate')
    if (!saved) { router.replace('/generate'); return }
    setForm(JSON.parse(saved))
  }, [router])

  async function handleSendOtp() {
    if (!form) return
    if (nin.length < 11) { setError('Enter a valid 11-digit NIN.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (otpError) { setError(otpError.message); return }
    setOtpSent(true)
  }

  async function handleVerifyAndGenerate() {
    if (!form) return
    const token = code.join('')
    if (token.length < 6) { setError('Enter the full 6-digit code.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: form.email, token, type: 'email',
    })

    if (verifyError || !data.user) {
      setError('Invalid or expired code. Please try again.')
      setLoading(false)
      return
    }

    const displayName = form.sellerDisplayName || form.email.split('@')[0]
    const sellerName = form.tradingName
      ? `${displayName} (${form.tradingName})`
      : displayName

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: form.email,
      full_name: displayName,
      issuer_type: form.tradingName ? 'business' : 'individual',
      ...(nin ? { nin } : {}),
      ...(form.tradingName ? { business_name: form.tradingName } : {}),
    }, { onConflict: 'id' })

    const res = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_name: sellerName,
        buyer_name: form.buyerName,
        buyer_phone: form.buyerPhone || undefined,
        buyer_email: form.buyerEmail || undefined,
        buyer_address: form.buyerAddress || undefined,
        transaction_date: form.transactionDate,
        payment_method: form.paymentMethod,
        reference_number: form.referenceNumber || undefined,
        notes: form.notes || undefined,
        subtotal: form.subtotal,
        discount: 0,
        tax: form.vatAmount || 0,
        total_amount: form.total,
        items: form.items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          totalPrice: i.totalPrice,
        })),
      }),
    })

    const receiptData = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(
        receiptData.code === 'LIMIT_REACHED'
          ? "You've reached your monthly receipt limit."
          : receiptData.error ?? 'Something went wrong. Please try again.'
      )
      return
    }

    sessionStorage.removeItem('dr_generate')
    setGenerated({
      id: receiptData.receipt.id,
      receiptNumber: receiptData.receipt.receipt_number,
      identifier: receiptData.receipt.unique_identifier,
    })
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[index] = value.slice(-1)
    setCode(next)
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) setCode(pasted.split(''))
  }

  async function handleResend() {
    if (!form) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ email: form.email, options: { shouldCreateUser: true } })
    setResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  if (!form) return null

  if (generated) {
    const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${generated.identifier}`
    return (
      <div className="min-h-screen bg-surface py-10 px-4 flex items-start justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border p-5 sm:p-8 mt-4 sm:mt-6 text-center space-y-5">
          <div className="w-16 h-16 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-forest" />
          </div>
          <div>
            <h2 className="font-heading text-2xl text-ink">Receipt Generated</h2>
            <p className="text-sm text-ink-muted mt-1">Stored securely and ready to share.</p>
          </div>
          <div className="bg-surface rounded-xl p-4 text-left space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted shrink-0">Receipt No.</span>
              <span className="font-mono font-medium text-ink">{generated.receiptNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted shrink-0">Identifier</span>
              <span className="font-mono font-medium text-ink">{generated.identifier}</span>
            </div>
            <div className="flex justify-between gap-4 items-start">
              <span className="text-ink-muted shrink-0">Verify URL</span>
              <a href={verifyUrl} className="text-forest/70 hover:text-forest break-all text-right transition-colors">{verifyUrl}</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-1">
            <a
              href={`/api/receipts/${generated.id}/pdf`}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm text-ink-muted hover:border-forest/40 hover:text-forest transition-colors bg-white"
            >
              <Download size={15} />
              Download PDF
            </a>
            <Link
              href={`/dashboard/receipts/${generated.id}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
            >
              View receipt
            </Link>
          </div>
          <Link href="/generate" className="block text-sm text-ink-dim hover:text-forest transition-colors">
            Generate another receipt
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-5 sm:space-y-6">
        <button
          onClick={() => router.push('/generate')}
          className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors"
        >
          <ArrowLeft size={16} />
          Back to form
        </button>

        <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div>
            <h1 className="font-heading text-2xl text-ink mb-1">Verify your identity</h1>
            <p className="text-sm text-ink-muted">
              Enter your NIN, then choose where to receive your OTP.
            </p>
          </div>

          {/* NIN input */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              National Identification Number (NIN)<span className="text-danger ml-0.5">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={nin}
              onChange={e => { setNin(e.target.value.replace(/\D/g, '').slice(0, 11)); setOtpSent(false); setCode(['','','','','','']) }}
              className={INPUT}
              placeholder="12345678901"
              maxLength={11}
              autoFocus
              disabled={otpSent}
            />
            <p className="text-xs text-ink-dim mt-1.5">11-digit number on your National ID card.</p>
          </div>

          {/* Channel selector + Send OTP button */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Receive OTP via</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setOtpChannel('email'); setOtpSent(false); setCode(['','','','','','']) }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  otpChannel === 'email'
                    ? 'border-forest bg-forest-light text-forest'
                    : 'border-border text-ink-muted hover:border-border-bright'
                }`}
              >
                <Mail size={16} />
                Email address
              </button>
              <button
                type="button"
                onClick={() => { setOtpChannel('phone'); setOtpSent(false); setCode(['','','','','','']) }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  otpChannel === 'phone'
                    ? 'border-forest bg-forest-light text-forest'
                    : 'border-border text-ink-muted hover:border-border-bright'
                }`}
              >
                <Phone size={16} />
                Phone number
              </button>
            </div>
            <p className="text-xs text-ink-dim px-0.5">
              OTP will be sent to the {otpChannel === 'phone' ? 'phone number' : 'email address'} linked to your NIN.
            </p>

            {/* Send OTP button — right under channel picker */}
            <button
              onClick={handleSendOtp}
              disabled={loading || nin.length < 11 || otpSent}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ background: 'oklch(0.45 0.16 145)' }}
            >
              {loading && !otpSent ? 'Sending OTP…' : otpSent ? 'OTP sent' : 'Send OTP'}
            </button>
          </div>

          {/* OTP entry — appears after sending */}
          {otpSent && (
            <div className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-ink">Enter OTP</label>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1.5 text-xs text-forest/70 hover:text-forest transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  {resent ? 'OTP sent!' : resending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
              <p className="text-xs text-ink-dim">
                A 6-digit OTP was sent to the {otpChannel === 'phone' ? 'phone number' : 'email address'} linked to your NIN.
              </p>
              <div className="flex gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
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
          )}

          {/* Privacy disclosure */}
          <div className="bg-surface border border-border rounded-xl px-4 py-3.5 flex gap-3">
            <Lock size={15} className="text-forest/60 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-ink">Why we ask for your NIN</p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Your NIN is used solely to verify your identity and prevent fraudulent receipt generation. DigitalReceipt.ng does not display your NIN on receipts and does not share it with buyers or third parties.
              </p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
          )}

          {/* Final action button */}
          <button
            onClick={handleVerifyAndGenerate}
            disabled={loading || !otpSent || code.join('').length < 6}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{ background: 'oklch(0.45 0.16 145)' }}
          >
            {loading && otpSent ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating receipt…
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                Verify and Review Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
