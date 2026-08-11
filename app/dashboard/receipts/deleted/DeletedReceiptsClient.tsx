'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, RotateCcw, Loader2, FileText } from 'lucide-react'
import { formatNaira, formatDate } from '@/lib/formatters'

interface DeletedReceipt {
  id: string
  receipt_number: string
  buyer_name: string
  total_amount: number
  transaction_date: string
  deleted_at: string
}

export default function DeletedReceiptsClient({ initialReceipts }: { initialReceipts: DeletedReceipt[] }) {
  const [receipts, setReceipts] = useState(initialReceipts)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function restore(id: string) {
    setRestoringId(id)
    setError('')
    try {
      const res = await fetch(`/api/receipts/${id}/restore`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to restore receipt.'); return }
      setReceipts(prev => prev.filter(r => r.id !== id))
    } catch {
      setError('Could not reach the server.')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="font-heading text-2xl text-ink flex items-center gap-2">
          <Trash2 size={20} className="text-ink-dim" />
          Recently Deleted
        </h1>
        <p className="text-sm text-ink-muted mt-1">Deleted receipts stay here until restored — they no longer appear anywhere else.</p>
      </div>

      {error && <p className="text-xs text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {receipts.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-16 text-center">
          <FileText size={28} className="text-ink-dim mx-auto mb-3" />
          <p className="text-sm text-ink-muted">No deleted receipts.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {receipts.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/receipts/${r.id}`} className="font-mono text-xs text-ink-muted hover:text-forest transition-colors">
                    {r.receipt_number}
                  </Link>
                  <span className="text-sm font-medium text-ink truncate">{r.buyer_name}</span>
                </div>
                <p className="text-xs text-ink-dim mt-0.5">
                  {formatDate(r.transaction_date)} · Deleted {formatDate(r.deleted_at)}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink shrink-0">{formatNaira(r.total_amount)}</span>
              <button
                onClick={() => restore(r.id)}
                disabled={restoringId === r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-forest text-white text-xs font-semibold rounded-lg hover:bg-forest-bright disabled:opacity-50 transition-colors shrink-0"
              >
                {restoringId === r.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                {restoringId === r.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
