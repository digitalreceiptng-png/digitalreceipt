'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Loader2, AlertCircle } from 'lucide-react'
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
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter receipt number or unique identifier…"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b2f]/30 focus:border-[#1a6b2f] transition-colors bg-white"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-[#1a6b2f] text-white rounded-xl text-sm font-medium hover:bg-[#155a27] disabled:opacity-60 transition-colors shrink-0"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Verify
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-[#4a6b55]">
          <Loader2 size={32} className="animate-spin text-[#1a6b2f]" />
          <p className="text-sm">Checking database…</p>
        </div>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-3">
          <AlertCircle size={32} className="text-[#dc2626] mx-auto" />
          <h3 className="font-heading text-xl text-[#0f1f13]">Receipt not found</h3>
          <p className="text-sm text-[#4a6b55]">
            No receipt matched <strong className="text-[#0f1f13]">&ldquo;{query}&rdquo;</strong>. Check the identifier and try again.
          </p>
        </div>
      )}

      {/* Result */}
      {!loading && result && (
        <div className="flex flex-col items-center gap-4">
          <VerificationCard receipt={result} verifiedAt={verifiedAt} method="search" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !notFound && (
        <div className="text-center py-12 text-[#4a6b55]">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Enter a receipt number (e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">DRN-ABJ-2026-X5T8M1</code>) or a 10-character identifier.</p>
        </div>
      )}
    </div>
  )
}

export default function VerifyPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="font-heading text-3xl text-[#0f1f13] mb-2">Verify a Receipt</h1>
        <p className="text-[#4a6b55]">Enter the receipt number or unique identifier to check its authenticity.</p>
      </div>
      <Suspense>
        <VerifySearch />
      </Suspense>
    </div>
  )
}
