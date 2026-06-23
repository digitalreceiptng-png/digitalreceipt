'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

export default function VerifyWidget() {
  const router = useRouter()
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    router.push(`/verify?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Enter verification code…"
        className="flex-1 px-4 py-3 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/50 transition-colors bg-white"
      />
      <button
        type="submit"
        className="flex items-center gap-2 px-5 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-all shrink-0"
        style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
      >
        <Search size={15} />
        Verify
      </button>
    </form>
  )
}
