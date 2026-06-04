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
        placeholder="Receipt number or unique identifier…"
        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b2f]/30 focus:border-[#1a6b2f] transition-colors"
      />
      <button
        type="submit"
        className="flex items-center gap-2 px-5 py-3 bg-[#1a6b2f] text-white rounded-xl text-sm font-medium hover:bg-[#155a27] transition-colors shrink-0"
      >
        <Search size={15} />
        Verify
      </button>
    </form>
  )
}
