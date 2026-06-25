'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, AlertCircle, Camera, ShieldCheck } from 'lucide-react'
import BackButton from '@/components/BackButton'
import VerificationCard from '@/components/receipt/VerificationCard'
import QRCameraModal from '@/components/QRCameraModal'
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
  const [cameraOpen, setCameraOpen] = useState(false)

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

  function handleScan(value: string) {
    setCameraOpen(false)
    setQuery(value)
    router.replace(`/verify?q=${encodeURIComponent(value)}`)
    search(value)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter receipt verification code…"
            className="w-full pl-4 pr-12 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
            autoFocus
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
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

      {cameraOpen && (
        <QRCameraModal onScan={handleScan} onClose={() => setCameraOpen(false)} />
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
          <Loader2 size={28} className="animate-spin text-forest" />
          <p className="text-sm">Checking database…</p>
        </div>
      )}

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
          <div className="flex items-center gap-2 pt-1">
            <p className="text-sm text-ink-muted flex-1">Do you want to verify again?</p>
            <button
              onClick={() => { setPreviouslyVerified(false); setPendingReceipt(null) }}
              className="px-4 py-2 border border-border rounded-xl text-sm font-medium text-ink-muted hover:bg-white transition-colors shrink-0"
            >
              Cancel
            </button>
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
          <p className="text-sm">Enter the verification code found on the receipt.</p>
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
