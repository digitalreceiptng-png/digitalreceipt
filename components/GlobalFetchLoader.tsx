'use client'

import { useEffect, useRef, useState } from 'react'

// Shows a centered rolling spinner whenever a button triggers work — any data
// request (mutation, /api call, or Supabase query). Page navigations are handled
// separately by loading.tsx, so RSC/prefetch GETs are ignored here to avoid flicker.
const SHOW_DELAY_MS = 200

export default function GlobalFetchLoader() {
  const [visible, setVisible] = useState(false)
  const active = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const orig = window.fetch
    const clearTimer = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null } }

    window.fetch = ((...args: Parameters<typeof fetch>) => {
      let url = ''
      try { url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url ?? String(args[0]) } catch {}
      const method = (args[1]?.method ?? (args[0] as Request)?.method ?? 'GET').toUpperCase()
      const track = method !== 'GET' || url.includes('/api/') || url.includes('.supabase.co')

      if (track) {
        active.current += 1
        if (!timer.current) {
          timer.current = setTimeout(() => { if (active.current > 0) setVisible(true) }, SHOW_DELAY_MS)
        }
      }
      const p = orig(...args)
      if (track) {
        const done = () => {
          active.current = Math.max(0, active.current - 1)
          if (active.current === 0) { clearTimer(); setVisible(false) }
        }
        p.then(done, done)
      }
      return p
    }) as typeof fetch

    return () => { window.fetch = orig; clearTimer() }
  }, [])

  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
      <div className="h-11 w-11 rounded-full border-4 border-forest/20 border-t-forest animate-spin" />
    </div>
  )
}
