'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

export interface Branding {
  businessName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  address: string | null
  phone: string | null
  email: string | null
  rcNumber: string | null
  footerText: string | null
}

export default function PinGate({ orgSlug, branding }: { orgSlug: string; branding: Branding }) {
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const submit = useCallback(async (digits: string[]) => {
    const fullPin = digits.join('')
    if (fullPin.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/org/${orgSlug}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Incorrect PIN.')
        setPin(['', '', '', '', '', ''])
        setTimeout(() => inputs.current[0]?.focus(), 50)
      } else {
        window.location.reload()
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...pin]
    next[i] = val
    setPin(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(d => d) && val) setTimeout(() => submit(next), 80)
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xs">
        {/* Brand header */}
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={branding.businessName}
              width={72}
              height={72}
              className="mx-auto mb-4 rounded-2xl object-contain"
              style={{ maxHeight: 72 }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: branding.primaryColor }}
            >
              {branding.businessName[0]?.toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-900">{branding.businessName}</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your 6-digit staff PIN</p>
        </div>

        {/* PIN card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex gap-2.5 justify-center mb-5">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className="w-10 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all disabled:opacity-40"
                style={{
                  borderColor: d ? branding.primaryColor : '#e5e7eb',
                  boxShadow: d ? `0 0 0 3px ${branding.primaryColor}25` : undefined,
                  color: branding.primaryColor,
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center mb-4 leading-snug">{error}</p>
          )}

          <button
            onClick={() => submit(pin)}
            disabled={pin.some(d => !d) || loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-40"
            style={{ background: branding.primaryColor }}
          >
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by{' '}
          <a href="https://digitalreceipt.ng" target="_blank" rel="noreferrer" className="underline">
            DigitalReceipt.ng
          </a>
        </p>
      </div>
    </div>
  )
}
