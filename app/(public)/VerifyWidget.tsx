'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, Camera, Loader2, ShieldCheck } from 'lucide-react'
import QRCameraModal from '@/components/QRCameraModal'

export default function VerifyWidget() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [previouslyVerified, setPreviouslyVerified] = useState(false)
  const [lastVerifiedAt, setLastVerifiedAt] = useState('')
  const [verificationCount, setVerificationCount] = useState(0)
  const [pendingQuery, setPendingQuery] = useState('')

  async function verify(q: string, force = false) {
    if (!q.trim()) return
    setLoading(true)
    setPreviouslyVerified(false)

    try {
      const url = `/api/verify/${encodeURIComponent(q.trim())}${force ? '?force=1' : ''}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.found && data.previouslyVerified && !force) {
        setPendingQuery(q.trim())
        setPreviouslyVerified(true)
        setLastVerifiedAt(data.lastVerifiedAt)
        setVerificationCount(data.verificationCount)
        setLoading(false)
      } else {
        router.push(`/verify?q=${encodeURIComponent(q.trim())}${force ? '&force=1' : ''}`)
      }
    } catch {
      router.push(`/verify?q=${encodeURIComponent(q.trim())}`)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    verify(q)
  }

  function handleScan(scanned: string) {
    setCameraOpen(false)
    setValue(scanned)
    verify(scanned)
  }

  function handleVerifyAgain() {
    setPreviouslyVerified(false)
    router.push(`/verify?q=${encodeURIComponent(pendingQuery)}&force=1`)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Enter verification code…"
            className="w-full pl-4 pr-12 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
          />
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-forest transition-colors"
            title="Scan QR code with camera"
          >
            <Camera size={18} />
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-all"
          style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

      {cameraOpen && (
        <QRCameraModal onScan={handleScan} onClose={() => setCameraOpen(false)} />
      )}

      {previouslyVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink text-sm">This receipt has been previously verified</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Last verified on{' '}
                <span className="font-medium text-ink">
                  {new Date(lastVerifiedAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>{' '}
                at{' '}
                <span className="font-medium text-ink">
                  {new Date(lastVerifiedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                {verificationCount > 1 && <span className="text-ink-dim"> · {verificationCount} verifications total</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-ink-muted flex-1">Do you want to verify again?</p>
            <button
              onClick={() => setPreviouslyVerified(false)}
              className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-ink-muted hover:bg-white transition-colors shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyAgain}
              className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors shrink-0"
            >
              Verify Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
