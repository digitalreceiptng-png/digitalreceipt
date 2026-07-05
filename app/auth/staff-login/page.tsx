'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Loader2, Phone, Mail } from 'lucide-react'

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function StaffLoginPage() {
  const router = useRouter()
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'contact' | 'otp'>('contact')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!contact.trim()) { setError('Enter your email or phone number.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      if (contactType === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: contact.trim() })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: contact.trim() })
        if (error) throw error
      }
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Could not send verification code.')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!otp.trim() || otp.length < 6) { setError('Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const verifyPayload = contactType === 'email'
        ? { email: contact.trim(), token: otp.trim(), type: 'email' as const }
        : { phone: contact.trim(), token: otp.trim(), type: 'sms' as const }

      const { data: verifyData, error } = await supabase.auth.verifyOtp(verifyPayload)
      if (error) throw error

      const userId = verifyData.user?.id

      // Check this user is actually a staff member
      const { data: staffRecord } = await supabase
        .from('staff_members')
        .select('id, access_level, is_active, staff_id')
        .or(contactType === 'email' ? `email.eq.${contact.trim()}` : `phone.eq.${contact.trim()}`)
        .eq('is_active', true)
        .single()

      if (!staffRecord) {
        await supabase.auth.signOut()
        throw new Error('No active staff account found for this contact. Please contact your administrator.')
      }

      // Link auth user id on first login if not yet set
      if (userId && !staffRecord.staff_id) {
        await supabase
          .from('staff_members')
          .update({ staff_id: userId })
          .eq('id', staffRecord.id)
      }

      // Redirect based on access level
      if (staffRecord.access_level === 'generate_only') {
        router.push('/dashboard/receipts/create')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.')
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
            <span className="text-xl">🔗</span>
          </div>
          <div>
            <h1 className="font-heading text-xl text-ink">Staff Login</h1>
            <p className="text-xs text-ink-muted">Enter using your assigned contact</p>
          </div>
        </div>

        {step === 'contact' ? (
          <form onSubmit={sendOtp} className="space-y-5">
            {/* Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-xl border border-border">
              {(['email', 'phone'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setContactType(t); setContact(''); setError('') }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    contactType === t ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {t === 'email' ? <Mail size={14} /> : <Phone size={14} />}
                  {t === 'email' ? 'Email' : 'Phone'}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {contactType === 'email' ? 'Email address' : 'Phone number'}
              </label>
              <input
                type={contactType === 'email' ? 'email' : 'tel'}
                value={contact}
                onChange={e => setContact(e.target.value)}
                required
                autoFocus
                className={INPUT}
                placeholder={contactType === 'email' ? 'you@example.com' : '+234 80...'}
              />
              <p className="text-xs text-ink-dim mt-1.5">
                Use the {contactType === 'email' ? 'email' : 'phone number'} your employer added you with
              </p>
            </div>

            {error && (
              <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Sending code…</> : <>Send verification code <ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div className="p-3.5 bg-forest/5 rounded-xl border border-forest/15 text-sm text-ink-muted">
              A 6-digit code was sent to <strong className="text-ink">{contact}</strong>.
              {' '}<button type="button" onClick={() => { setStep('contact'); setOtp(''); setError('') }} className="text-forest underline text-xs">Change</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Verification code</label>
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

            {error && (
              <div className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Verifying…</> : <>Verify & Sign in <ArrowRight size={15} /></>}
            </button>

            <button
              type="button"
              onClick={() => sendOtp({ preventDefault: () => {} } as any)}
              disabled={loading}
              className="w-full text-xs text-ink-dim hover:text-forest transition-colors py-1"
            >
              Didn't receive it? Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
