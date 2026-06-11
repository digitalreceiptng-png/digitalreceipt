'use client'

import { useEffect } from 'react'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Admin error]', error)
  }, [error])

  return (
    <div className="p-8 max-w-xl mx-auto mt-16">
      <div className="bg-white rounded-2xl border border-border p-8 space-y-4">
        <h2 className="font-heading text-xl text-ink">Something went wrong</h2>
        <p className="text-sm text-ink-muted font-mono bg-surface rounded-lg p-3 break-all">
          {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="text-xs text-ink-dim">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
