'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react'

interface Scope {
  id: string // 'main' or a sub-account id
  name: string
  isMain: boolean
}

// Dropdown beside the sign-out button that lets a multi-profile generate-only staff member
// switch which company profile they're issuing receipts under.
export default function StaffProfileSwitcher({ scopes, activeId }: { scopes: Scope[]; activeId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const active = scopes.find(s => s.id === activeId) ?? scopes[0]

  async function switchTo(scope: Scope) {
    if (scope.id === activeId) { setOpen(false); return }
    setSwitchingId(scope.id)
    try {
      await fetch('/api/sub-accounts/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scope.isMain ? null : scope.id }),
      })
      setOpen(false)
      router.refresh()
    } catch {}
    setSwitchingId(null)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted border border-border hover:border-forest/40 hover:text-forest bg-white transition-colors max-w-[160px]"
        title="Switch company profile"
      >
        <Building2 size={13} className="shrink-0" />
        <span className="truncate">{active?.name || 'Profile'}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
            <p className="px-3 py-2 text-[11px] font-semibold text-ink-dim border-b border-border">Issue receipts under</p>
            <div className="py-1 max-h-72 overflow-y-auto">
              {scopes.map(scope => {
                const isActive = scope.id === activeId
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => switchTo(scope)}
                    disabled={switchingId !== null}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-surface transition-colors disabled:opacity-60"
                  >
                    <Building2 size={12} className="shrink-0 text-ink-dim" />
                    <span className={`flex-1 truncate ${isActive ? 'font-semibold text-forest' : 'text-ink'}`}>
                      {scope.name}{scope.isMain ? ' (Main)' : ''}
                    </span>
                    {switchingId === scope.id
                      ? <Loader2 size={13} className="shrink-0 animate-spin text-ink-dim" />
                      : isActive && <Check size={13} className="shrink-0 text-forest" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
