'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Trash2, Loader2 } from 'lucide-react'

export default function AlertActions({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'resolve' | 'delete' | null>(null)

  async function resolve() {
    setLoading('resolve')
    await fetch(`/api/admin/alerts/${id}`, { method: 'PATCH' })
    router.refresh()
    setLoading(null)
  }

  async function remove() {
    setLoading('delete')
    await fetch(`/api/admin/alerts/${id}`, { method: 'DELETE' })
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {!resolved && (
        <button
          onClick={resolve}
          disabled={loading !== null}
          title="Mark resolved"
          className="p-1.5 rounded-lg hover:bg-forest/10 text-forest transition-colors disabled:opacity-50"
        >
          {loading === 'resolve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
        </button>
      )}
      <button
        onClick={remove}
        disabled={loading !== null}
        title="Delete alert"
        className="p-1.5 rounded-lg hover:bg-red-50 text-ink-muted hover:text-red-600 transition-colors disabled:opacity-50"
      >
        {loading === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  )
}
