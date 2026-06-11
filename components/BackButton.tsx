'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  )
}
