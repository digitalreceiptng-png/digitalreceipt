'use client'

import { useState } from 'react'

export default function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

    if (isTouchDevice && navigator.share) {
      // Mobile: open native share sheet so user can pick their email app
      e.preventDefault()
      navigator.share({ title: 'Email us', text: email, url: `mailto:${email}` }).catch(() => {})
    } else if (navigator.clipboard) {
      // Desktop: copy to clipboard
      e.preventDefault()
      navigator.clipboard.writeText(email).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
    // fallback: let the mailto: href open naturally
  }

  return (
    <a
      href={`mailto:${email}`}
      onClick={handleClick}
      aria-label={`Email us at ${email}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/80 hover:text-white"
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span className="text-xs font-medium">{copied ? 'Copied!' : email}</span>
    </a>
  )
}
