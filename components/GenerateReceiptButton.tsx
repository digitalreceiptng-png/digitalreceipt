'use client'

import { FileText } from 'lucide-react'

interface Props {
  orgSlug: string
  label?: string
  buttonStyle?: React.CSSProperties
  className?: string
  openAs?: 'tab' | 'window'
}

/**
 * Embeddable button that opens the branded receipt generation page for an org.
 *
 * Usage:
 *   <GenerateReceiptButton orgSlug="acme-stores" />
 *   <GenerateReceiptButton orgSlug="acme-stores" label="New Receipt" buttonStyle={{ background: '#c00' }} />
 */
export default function GenerateReceiptButton({
  orgSlug,
  label = 'Generate Receipt',
  buttonStyle,
  className = '',
  openAs = 'tab',
}: Props) {
  const url = `/generate/${orgSlug}`

  function handleClick() {
    if (openAs === 'window') {
      window.open(url, '_blank', 'width=420,height=800,noopener,noreferrer')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80 ${className}`}
      style={{ background: '#0d6b1e', ...buttonStyle }}
    >
      <FileText size={15} />
      {label}
    </button>
  )
}
