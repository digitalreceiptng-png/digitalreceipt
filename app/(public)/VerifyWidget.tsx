'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Search, Camera, X, Loader2, ShieldCheck } from 'lucide-react'

export default function VerifyWidget() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [previouslyVerified, setPreviouslyVerified] = useState(false)
  const [lastVerifiedAt, setLastVerifiedAt] = useState('')
  const [verificationCount, setVerificationCount] = useState(0)
  const [pendingQuery, setPendingQuery] = useState('')

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        // Redirect to verify page for full result
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

  function handleVerifyAgain() {
    setPreviouslyVerified(false)
    router.push(`/verify?q=${encodeURIComponent(pendingQuery)}&force=1`)
  }

  async function openCamera() {
    setCameraError('')
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        startQRScan()
      }
    } catch {
      setCameraError('Camera access denied or not available.')
    }
  }

  function closeCamera() {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
    setCameraError('')
  }

  function startQRScan() {
    if (!('BarcodeDetector' in window)) {
      setCameraError('QR scanning not supported in this browser. Try Chrome or Edge.')
      return
    }
    // @ts-expect-error BarcodeDetector not in TS types yet
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const scanned = barcodes[0].rawValue
          closeCamera()
          setValue(scanned)
          verify(scanned)
        }
      } catch { /* continue scanning */ }
    }, 300)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Enter verification code…"
          className="flex-1 px-4 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
        />
        <button
          type="button"
          onClick={openCamera}
          className="flex items-center justify-center w-12 h-12 border border-border rounded-xl text-ink-muted hover:bg-surface hover:text-forest transition-colors shrink-0"
          title="Scan QR code with camera"
        >
          <Camera size={18} />
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-all shrink-0"
          style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

      {/* Previously verified banner */}
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
          <div className="flex items-center gap-3">
            <p className="text-xs text-ink-muted flex-1">Do you want to verify again?</p>
            <button
              onClick={handleVerifyAgain}
              className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors shrink-0"
            >
              Verify Again
            </button>
          </div>
        </div>
      )}

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm text-ink">Scan QR Code</span>
              <button onClick={closeCamera} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors">
                <X size={16} />
              </button>
            </div>
            {cameraError ? (
              <div className="p-6 text-center text-sm text-danger">{cameraError}</div>
            ) : (
              <div className="relative bg-black">
                <video ref={videoRef} className="w-full" playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/60 rounded-xl" />
                </div>
              </div>
            )}
            <p className="text-xs text-ink-muted text-center py-3 px-4">Point camera at the QR code on the receipt</p>
          </div>
        </div>
      )}
    </div>
  )
}
