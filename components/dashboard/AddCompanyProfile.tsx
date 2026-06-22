'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, Smartphone, X } from 'lucide-react'

type Step = 'rc' | 'channel' | 'otp' | 'done'
interface OtpChannel { type: 'sms' | 'email'; masked: string }

interface Props {
  onAdded: (account: { id: string; business_name: string; rc_number: string }) => void
  onCancel: () => void
}

const INPUT = 'w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'
const OTP_INPUT = 'w-10 h-11 text-center text-base font-semibold bg-white border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

export default function AddCompanyProfile({ onAdded, onCancel }: Props) {
  const [step, setStep] = useState<Step>('rc')
  const [rcNumber, setRcNumber] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [channels, setChannels] = useState<OtpChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<OtpChannel | null>(null)
  const [otpDest, setOtpDest] = useState('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [verifiedName, setVerifiedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function lookupRC() {
    if (!rcNumber.trim()) { setLookupError('Enter your RC or BN number.'); return }
    setLookupError(''); setLooking(true)
    try {
      const res = await fetch(`/api/cac?rc=${encodeURIComponent(rcNumber.trim())}`)
      const data = await res.json()
      if (!res.ok) { setLookupError(data.error ?? 'Verification failed.'); return }
      setSessionToken(data.sessionToken)
      setChannels(data.channels)
      setStep('channel')
    } catch { setLookupError('Could not reach verification service.') }
    finally { setLooking(false) }
  }

  async function sendOtp(ch: OtpChannel) {
    setSending(true); setOtpError(''); setSelectedChannel(ch)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, channel: ch.type }),
      })
      const data = await res.json()
      if (!res.ok) { setSending(false); setOtpError(data.error ?? 'Failed to send code.'); return }
      setOtpDest(data.masked)
      setOtpCode(['', '', '', '', '', ''])
      setStep('otp')
    } catch { setOtpError('Could not send code.') }
    finally { setSending(false) }
  }

  async function verifyOtp() {
    const code = otpCode.join('')
    if (code.length < 6) { setOtpError('Enter the full 6-digit code.'); return }
    setVerifying(true); setOtpError('')
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, code }),
      })
      const data = await res.json()
      if (!res.ok) { setVerifying(false); setOtpError(data.error ?? 'Invalid code.'); return }
      setVerifiedName(data.person?.companyName || rcNumber)
      setStep('done')
    } catch { setOtpError('Verification failed.') }
    finally { setVerifying(false) }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpCode]; next[index] = value.slice(-1)
    setOtpCode(next)
    if (value && index < 5) document.getElementById(`acp-otp-${index + 1}`)?.focus()
  }

  function handleOtpKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0)
      document.getElementById(`acp-otp-${index - 1}`)?.focus()
  }

  async function saveProfile() {
    setSaving(true); setSaveError('')
    const res = await fetch('/api/sub-accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: verifiedName, rc_number: rcNumber.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setSaveError(data.error ?? 'Failed to save.'); setSaving(false); return }
    onAdded(data.account)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Add Company Profile</p>
        <button onClick={onCancel} className="p-1 text-ink-dim hover:text-ink"><X size={15} /></button>
      </div>

      {/* Step: RC input */}
      {(step === 'rc' || step === 'channel' || step === 'otp') && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-muted">CAC Registration / BN Number</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rcNumber}
              onChange={e => { setRcNumber(e.target.value); setLookupError(''); if (step !== 'rc') setStep('rc') }}
              disabled={step !== 'rc'}
              placeholder="RC1234567 or BN1234567"
              className={INPUT + (step !== 'rc' ? ' opacity-60' : '')}
            />
            {step === 'rc' && (
              <button
                onClick={lookupRC}
                disabled={looking}
                className="shrink-0 px-4 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {looking && <Loader2 size={13} className="animate-spin" />}
                Verify
              </button>
            )}
          </div>
          {lookupError && <p className="text-xs text-danger">{lookupError}</p>}
        </div>
      )}

      {/* Step: channel picker */}
      {step === 'channel' && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-ink-muted">Choose how to receive your verification code:</p>
          <div className="space-y-2">
            {channels.map(ch => (
              <button
                key={ch.type}
                onClick={() => sendOtp(ch)}
                disabled={sending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white hover:border-forest/50 hover:bg-forest-light transition-colors text-left disabled:opacity-60"
              >
                {ch.type === 'sms' ? <Smartphone size={16} className="text-forest shrink-0" /> : <Mail size={16} className="text-forest shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-ink">{ch.type === 'sms' ? 'Text message (SMS)' : 'Email'}</p>
                  <p className="text-xs text-ink-muted">Send code to {ch.masked}</p>
                </div>
                {sending && selectedChannel?.type === ch.type && <Loader2 size={14} className="animate-spin text-forest ml-auto" />}
              </button>
            ))}
          </div>
          {otpError && <p className="text-xs text-danger">{otpError}</p>}
        </div>
      )}

      {/* Step: OTP entry */}
      {step === 'otp' && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs text-ink-muted">
            Enter the 6-digit code sent to <span className="font-semibold text-ink">{otpDest}</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {otpCode.map((digit, i) => (
              <input
                key={i}
                id={`acp-otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleOtpKey(i, e)}
                className={OTP_INPUT}
                autoFocus={i === 0}
              />
            ))}
            <button
              onClick={verifyOtp}
              disabled={verifying}
              className="ml-1 px-3.5 py-2.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-60 flex items-center gap-1.5"
            >
              {verifying && <Loader2 size={13} className="animate-spin" />}
              Verify
            </button>
          </div>
          {otpError && <p className="text-xs text-danger">{otpError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={() => selectedChannel && sendOtp(selectedChannel)} disabled={sending} className="text-xs text-forest hover:underline disabled:opacity-50">Resend code</button>
            <span className="text-ink-dim text-xs">·</span>
            <button onClick={() => setStep('channel')} className="text-xs text-ink-muted hover:text-ink">Use different channel</button>
          </div>
        </div>
      )}

      {/* Step: confirmed — save */}
      {step === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 size={16} className="text-forest shrink-0" />
            <div>
              <p className="text-sm font-semibold text-forest">Business verified</p>
              <p className="text-xs text-green-700">{verifiedName} · {rcNumber}</p>
            </div>
          </div>
          {saveError && <p className="text-xs text-danger">{saveError}</p>}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Adding profile…' : 'Add this company profile'}
          </button>
        </div>
      )}
    </div>
  )
}
