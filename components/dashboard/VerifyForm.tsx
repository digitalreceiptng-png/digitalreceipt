'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Smartphone, Mail, ShieldCheck } from 'lucide-react'
import type { Profile } from '@/types'

type VerifyStep = 'input' | 'channel' | 'otp' | 'done'
interface OtpChannel { type: 'sms' | 'email'; masked: string }
interface VerifyState {
  step: VerifyStep
  sessionToken: string
  channels: OtpChannel[]
  selectedChannel: OtpChannel | null
  otpDestination: string
  otpCode: string[]
  sending: boolean
  verifying: boolean
  error: string
  result: { name: string; identifier: string } | null
}

function initVerify(): VerifyState {
  return {
    step: 'input', sessionToken: '', channels: [], selectedChannel: null,
    otpDestination: '', otpCode: ['', '', '', '', '', ''],
    sending: false, verifying: false, error: '', result: null,
  }
}

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

interface Props {
  profile: Profile | null
  userEmail: string
}

export default function VerifyForm({ profile, userEmail }: Props) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'individual' | 'business'>(
    profile?.issuer_type ?? 'individual'
  )
  // If profile exists, lock the type; otherwise let user pick
  const issuerType = profile?.issuer_type ?? selectedType
  const typeIsLocked = !!profile?.issuer_type

  const displayEmail = profile?.email ?? userEmail
  const displayName = profile?.full_name || displayEmail.split('@')[0]
  const displayPhone = profile?.phone ?? ''

  const [nin, setNin] = useState(profile?.nin ?? '')
  const [rcNumber, setRcNumber] = useState(profile?.rc_number ?? '')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [verify, setVerify] = useState<VerifyState>(initVerify())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function patch(p: Partial<VerifyState>) { setVerify(s => ({ ...s, ...p })) }

  async function lookup() {
    setLookupError(''); setVerify(initVerify())
    if (issuerType === 'individual') {
      if (!/^\d{11}$/.test(nin)) { setLookupError('Enter a valid 11-digit NIN.'); return }
      setLooking(true)
      try {
        const res = await fetch('/api/nin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nin }) })
        const data = await res.json()
        if (!res.ok) { setLookupError(data.error ?? 'Verification failed.'); return }
        patch({ step: 'channel', sessionToken: data.sessionToken, channels: data.channels })
      } catch { setLookupError('Could not reach verification service.') }
      finally { setLooking(false) }
    } else {
      if (!rcNumber.trim()) { setLookupError('Enter your RC or BN number.'); return }
      setLooking(true)
      try {
        const res = await fetch(`/api/cac?rc=${encodeURIComponent(rcNumber.trim())}`)
        const data = await res.json()
        if (!res.ok) { setLookupError(data.error ?? 'Verification failed.'); return }
        patch({ step: 'channel', sessionToken: data.sessionToken, channels: data.channels })
      } catch { setLookupError('Could not reach verification service.') }
      finally { setLooking(false) }
    }
  }

  async function sendOtp(ch: OtpChannel) {
    patch({ sending: true, error: '', selectedChannel: ch })
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: verify.sessionToken, channel: ch.type }),
      })
      const data = await res.json()
      if (!res.ok) { patch({ sending: false, error: data.error ?? 'Failed to send code.' }); return }
      patch({ step: 'otp', sending: false, otpDestination: data.masked, otpCode: ['', '', '', '', '', ''] })
    } catch { patch({ sending: false, error: 'Could not send code.' }) }
  }

  async function verifyOtp() {
    const code = verify.otpCode.join('')
    if (code.length < 6) { patch({ error: 'Enter the full 6-digit code.' }); return }
    patch({ verifying: true, error: '' })
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: verify.sessionToken, code }),
      })
      const data = await res.json()
      if (!res.ok) { patch({ verifying: false, error: data.error ?? 'Invalid code.' }); return }
      const p = data.person
      const name = issuerType === 'individual'
        ? ([p.firstName, p.lastName].filter(Boolean).join(' ') || 'Verified')
        : (p.companyName || 'Verified')
      patch({ step: 'done', verifying: false, result: { name, identifier: data.identifier } })
    } catch { patch({ verifying: false, error: 'Verification failed.' }) }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...verify.otpCode]; next[index] = value.slice(-1)
    patch({ otpCode: next })
    if (value && index < 5) document.getElementById(`v-otp-${index + 1}`)?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !verify.otpCode[index] && index > 0)
      document.getElementById(`v-otp-${index - 1}`)?.focus()
  }

  async function saveVerification() {
    if (!verify.result) return
    setSaving(true); setSaveError('')

    // Check identity uniqueness
    const identityPayload = issuerType === 'individual' ? { nin } : { rc_number: rcNumber.trim() }
    const checkRes = await fetch('/api/identity-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identityPayload),
    })
    const checkData = await checkRes.json()
    if (checkData.conflict) { setSaveError(checkData.message); setSaving(false); return }

    const profileData: Record<string, string | boolean> = {
      email: displayEmail,
      issuer_type: issuerType,
      is_verified: true,
      full_name: verify.result.name,
    }
    if (displayPhone) profileData.phone = displayPhone
    if (issuerType === 'individual') profileData.nin = nin
    else { profileData.rc_number = rcNumber.trim(); profileData.business_name = verify.result.name }

    const res = await fetch('/api/auth/setup-account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: profileData }),
    })
    if (!res.ok) { setSaveError('Failed to save. Please try again.'); setSaving(false); return }

    // Log identity
    fetch('/api/identity/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: issuerType === 'individual' ? 'nin' : 'cac',
        identifier: issuerType === 'individual' ? `****${nin.slice(-4)}` : rcNumber.trim(),
        verified_name: verify.result.name,
      }),
    }).catch(() => {})

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink mb-1">Verify your account</h1>
        <p className="text-sm text-ink-muted">
          {issuerType === 'individual'
            ? 'Confirm your identity with your National Identification Number (NIN) to get verified.'
            : 'Confirm your business identity with your CAC registration number to get verified.'}
        </p>
      </div>

      {/* Account type selector — only shown when profile is missing */}
      {!typeIsLocked && (
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Account type</label>
          <div className="grid grid-cols-2 gap-3">
            {(['individual', 'business'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => { setSelectedType(type); setVerify(initVerify()); setLookupError('') }}
                className={`py-3 px-4 rounded-lg border text-sm font-medium text-left transition-all ${
                  selectedType === type ? 'border-forest bg-forest-light text-forest' : 'border-border text-ink-muted hover:border-border-bright'
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
      )}

      {/* Pre-filled account info — read-only */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-ink-dim">Your account</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-ink-dim mb-0.5">Account type</p>
            <p className="font-medium text-ink capitalize">{issuerType}</p>
          </div>
          <div>
            <p className="text-xs text-ink-dim mb-0.5">Name</p>
            <p className="font-medium text-ink">{displayName}</p>
          </div>
          <div>
            <p className="text-xs text-ink-dim mb-0.5">Email</p>
            <p className="font-medium text-ink truncate">{displayEmail}</p>
          </div>
          {displayPhone && (
            <div>
              <p className="text-xs text-ink-dim mb-0.5">Phone</p>
              <p className="font-medium text-ink">{displayPhone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification input */}
      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-ink">
          {issuerType === 'individual' ? 'NIN Verification' : 'CAC Verification'}
        </p>

        {/* Input + lookup button */}
        {(verify.step === 'input' || verify.step === 'channel' || verify.step === 'otp') && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {issuerType === 'individual' ? (
                <input
                  type="text"
                  value={nin}
                  onChange={e => { setNin(e.target.value); setVerify(initVerify()); setLookupError('') }}
                  maxLength={11}
                  inputMode="numeric"
                  disabled={verify.step !== 'input'}
                  className={INPUT + (verify.step !== 'input' ? ' opacity-60' : '')}
                  placeholder="12345678901"
                />
              ) : (
                <input
                  type="text"
                  value={rcNumber}
                  onChange={e => { setRcNumber(e.target.value); setVerify(initVerify()); setLookupError('') }}
                  disabled={verify.step !== 'input'}
                  className={INPUT + (verify.step !== 'input' ? ' opacity-60' : '')}
                  placeholder="RC1234567 or BN1234567"
                />
              )}
              {verify.step === 'input' && (
                <button
                  type="button"
                  onClick={lookup}
                  disabled={looking}
                  className="shrink-0 px-4 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {looking ? <Loader2 size={14} className="animate-spin" /> : null}
                  Verify
                </button>
              )}
            </div>
            {lookupError && <p className="text-xs text-danger">{lookupError}</p>}
            {verify.step === 'input' && !lookupError && (
              <p className="text-xs text-ink-dim">
                {issuerType === 'individual' ? 'Your 11-digit National Identification Number.' : 'Your CAC registration or business name number.'}
              </p>
            )}
          </div>
        )}

        {/* Channel picker */}
        {verify.step === 'channel' && (
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <p className="text-xs font-semibold text-ink-muted">Choose where to receive your verification code:</p>
            <div className="space-y-2">
              {verify.channels.map(ch => (
                <button
                  key={ch.type}
                  type="button"
                  onClick={() => sendOtp(ch)}
                  disabled={verify.sending}
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
                  {verify.sending && verify.selectedChannel?.type === ch.type && (
                    <Loader2 size={14} className="animate-spin text-forest ml-auto" />
                  )}
                </button>
              ))}
            </div>
            {verify.error && <p className="text-xs text-danger">{verify.error}</p>}
          </div>
        )}

        {/* OTP entry */}
        {verify.step === 'otp' && (
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <p className="text-xs text-ink-muted">
              Enter the 6-digit code sent to <span className="font-semibold text-ink">{verify.otpDestination}</span>
            </p>
            <div className="flex gap-1.5">
              {verify.otpCode.map((digit, i) => (
                <input
                  key={i}
                  id={`v-otp-${i}`}
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
                disabled={verify.verifying}
                className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {verify.verifying ? <Loader2 size={13} className="animate-spin" /> : null}
                Verify
              </button>
            </div>
            {verify.error && <p className="text-xs text-danger">{verify.error}</p>}
            <div className="flex items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => verify.selectedChannel && sendOtp(verify.selectedChannel)}
                disabled={verify.sending}
                className="text-xs text-forest hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
              <span className="text-ink-dim text-xs">·</span>
              <button
                type="button"
                onClick={() => patch({ step: 'channel', error: '' })}
                className="text-xs text-ink-muted hover:text-ink transition-colors"
              >
                Use a different channel
              </button>
            </div>
          </div>
        )}

        {/* Done — confirm and save */}
        {verify.step === 'done' && verify.result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 size={16} className="text-forest shrink-0" />
              <div>
                <p className="text-sm font-semibold text-forest">Identity confirmed</p>
                <p className="text-xs text-green-700">{verify.result.name}</p>
              </div>
            </div>

            {saveError && <p className="text-xs text-danger">{saveError}</p>}

            <button
              onClick={saveVerification}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {saving ? 'Saving…' : 'Complete verification'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
