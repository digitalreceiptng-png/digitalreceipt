'use client'

import { useState } from 'react'
import { ShieldOff } from 'lucide-react'

export default function UnblockButton({ id, ip }: { id: string; ip: string }) {
  const [loading, setLoading] = useState(false)
  const [unblocked, setUnblocked] = useState(false)

  async function handleUnblock() {
    if (!confirm(`Unblock ${ip}?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/security/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setUnblocked(true)
    } finally {
      setLoading(false)
    }
  }

  if (unblocked) {
    return <span className="text-xs text-green-600 font-medium">Unblocked</span>
  }

  return (
    <button
      onClick={handleUnblock}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
    >
      <ShieldOff className="w-3.5 h-3.5" />
      {loading ? 'Unblocking…' : 'Unblock'}
    </button>
  )
}
