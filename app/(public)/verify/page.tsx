'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, AlertCircle, Camera, X, ShieldCheck } from 'lucide-react'
import BackButton from '@/components/BackButton'
import VerificationCard from '@/components/receipt/VerificationCard'
import type { Receipt, ReceiptItem } from '@/types'

type FullReceipt = Receipt & { items: ReceiptItem[] }

function VerifySearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FullReceipt | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [verifiedAt, setVerifiedAt] = useState('')
  const [previouslyVerified, setPreviouslyVerified] = useState(false)
  const [lastVerifiedAt, setLastVerifiedAt] = useState('')
  const [verificationCount, setVerificationCount] = useState(0)
  const [pendingReceipt, setPendingReceipt] = useState<FullReceipt | null>(null)

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (initialQ) {
      const forceParam = searchParams.get('force') === '1'
      search(initialQ, forceParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search(q: string, force = false) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
    setNotFound(false)
    setPreviouslyVerified(false)
    setPendingReceipt(null)

    try {
      const url = `/api/verify/${encodeURIComponent(q.trim())}${force ? '?force=1' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.found) {
        if (data.previouslyVerified && !force) {
          setPendingReceipt(data.receipt)
          setPreviouslyVerified(true)
          setLastVerifiedAt(data.lastVerifiedAt)
          setVerificationCount(data.verificationCount)
        } else {
          setResult(data.receipt)
          setVerifiedAt(new Date().toISOString())
        }
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.replace(`/verify?q=${encodeURIComponent(q)}`)
    search(q)
  }

  function handleVerifyAgain() {
    setPreviouslyVerified(false)
    search(query.trim(), true)
  }

  // Camera functions
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
      setCameraError('Camera access denied or not available on this device.')
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
    // @ts-expect-error BarcodeDetector is not in TS types yet
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue
          closeCamera()
          setQuery(value)
          router.replace(`/verify?q=${encodeURIComponent(value)}`)
          search(value)
        }
      } catch { /* continue scanning */ }
    }, 300)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter receipt verification code…"
          className="flex-1 px-4 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
          autoFocus
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
          className="flex items-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

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

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
          <Loader2 size={28} className="animate-spin text-forest" />
          <p className="text-sm">Checking database…</p>
        </div>
      )}

      {/* Previously verified banner */}
      {!loading && previouslyVerified && pendingReceipt && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-ink text-sm">This receipt has been previously verified</h3>
              <p className="text-sm text-ink-muted mt-1">
                Last verified on{' '}
                <span className="font-medium text-ink">
                  {new Date(lastVerifiedAt).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>{' '}
                at{' '}
                <span className="font-medium text-ink">
                  {new Date(lastVerifiedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                {verificationCount > 1 && (
                  <span className="text-ink-dim"> · verified {verificationCount} time{verificationCount !== 1 ? 's' : ''} total</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <p className="text-sm text-ink-muted flex-1">Do you want to verify again?</p>
            <button
              onClick={handleVerifyAgain}
              className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors shrink-0"
            >
              Verify Again
            </button>
          </div>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-3">
          <AlertCircle size={28} className="text-danger mx-auto" />
          <h3 className="font-heading text-xl text-ink">Receipt not found</h3>
          <p className="text-sm text-ink-muted">
            No receipt matched <strong className="text-ink">&ldquo;{query}&rdquo;</strong>. Check the verification code and try again.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="flex flex-col items-center gap-4">
          <VerificationCard receipt={result} verifiedAt={verifiedAt} method="search" />
        </div>
      )}

      {!loading && !result && !notFound && !previouslyVerified && (
        <div className="text-center py-12 text-ink-dim">
          <Search size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Enter the verification code found on the receipt.
          </p>
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="py-12 px-4 bg-white">
      <div className="max-w-2xl mx-auto mb-10">
        <div className="mb-8"><BackButton href="/" label="Back to home" /></div>
        <div className="text-center">
          <h1 className="font-heading text-3xl text-ink mb-2">Verify a Receipt</h1>
          <p className="text-ink-muted">Enter your receipt verification code to confirm authenticity.</p>
        </div>
      </div>
      <Suspense>
        <VerifySearch />
      </Suspense>
    </div>
  )
}
