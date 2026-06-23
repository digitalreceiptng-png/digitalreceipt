'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
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
  const [verifiedAt] = useState(new Date().toISOString())

  useEffect(() => {
    if (initialQ) search(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function search(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setResult(null)
    setNotFound(false)

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (data.found) {
        setResult(data.receipt)
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

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter receipt unique identifier…"
          className="flex-1 px-4 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright disabled:opacity-60 transition-colors shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-ink-muted">
          <Loader2 size={28} className="animate-spin text-forest" />
          <p className="text-sm">Checking database…</p>
        </div>
      )}

      {!loading && notFound && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-3">
          <AlertCircle size={28} className="text-danger mx-auto" />
          <h3 className="font-heading text-xl text-ink">Receipt not found</h3>
          <p className="text-sm text-ink-muted">
            No receipt matched <strong className="text-ink">&ldquo;{query}&rdquo;</strong>. Check the identifier and try again.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="flex flex-col items-center gap-4">
          <VerificationCard receipt={result} verifiedAt={verifiedAt} method="search" />
        </div>
      )}

      {!loading && !result && !notFound && (
        <div className="text-center py-12 text-ink-dim">
          <Search size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">
            Enter the 10-character unique identifier found on the receipt.
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
        <p className="text-ink-muted">Enter the receipt unique identifier to confirm its authenticity.</p>
        </div>
      </div>
      <Suspense>
        <VerifySearch />
      </Suspense>
    </div>
  )
}
