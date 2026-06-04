'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
