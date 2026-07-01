'use client'

import { useState } from 'react'

interface Props {
  email: string
  showText?: boolean
}

export default function CopyEmailButton({ email, showText }: Props) {
  const [copied, setCopied] = useState(false)

  function handleClick() {
    window.location.href = `mailto:${email}`
    navigator.clipboard?.writeText(email).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (showText) {
    return (
      <button
        onClick={handleClick}
        className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
        title={`Send email to ${email}`}
      >
        {copied ? <span className="text-white/70">Copied!</span> : email}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors relative"
      title={`Email ${email}`}
      aria-label="Email us"
    >
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-black/80 text-white rounded px-1.5 py-0.5 whitespace-nowrap">
          Copied!
        </span>
      )}
    </button>
  )
}
