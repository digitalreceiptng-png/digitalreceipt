'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'

export default function RejectButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function reject() {
    if (!confirm('Reject this verification? This will revoke the user\'s verified status if they have no other approved verifications.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/identity/${id}`, { method: 'POST' })
      if (res.ok) {
        setDone(true)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) return null

  return (
    <button
      onClick={reject}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
      Reject
    </button>
  )
}
