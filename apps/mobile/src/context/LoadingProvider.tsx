import React, { useEffect, useRef, useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay'

// Wraps the app and shows a centered loading spinner whenever a network
// request (fetch / Supabase) is in flight. A short delay avoids flicker on
// fast requests, so only noticeable loads surface the spinner.
const SHOW_DELAY_MS = 300

export default function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const active = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const originalFetch = global.fetch

    const clearTimer = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
    }

    const wrapped = ((...args: Parameters<typeof fetch>) => {
      active.current += 1
      if (!timer.current) {
        timer.current = setTimeout(() => { if (active.current > 0) setVisible(true) }, SHOW_DELAY_MS)
      }
      const done = () => {
        active.current = Math.max(0, active.current - 1)
        if (active.current === 0) { clearTimer(); setVisible(false) }
      }
      return originalFetch(...args).then(
        (res) => { done(); return res },
        (err) => { done(); throw err },
      )
    }) as typeof fetch

    global.fetch = wrapped
    return () => { global.fetch = originalFetch; clearTimer() }
  }, [])

  return (
    <>
      {children}
      <LoadingOverlay visible={visible} />
    </>
  )
}
