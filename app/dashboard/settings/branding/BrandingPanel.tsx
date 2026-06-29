'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import BrandingForm from './BrandingForm'

interface SubAccount {
  id: string
  business_name: string
  logo_url: string | null
  slug: string | null
  primary_color: string | null
  secondary_color: string | null
  receipt_footer_text: string | null
  staff_pin_hash: string | null
  phone: string | null
  email: string | null
  address: string | null
  rc_number: string | null
}

export default function BrandingPanel({ subAccounts, activeSubId }: { subAccounts: SubAccount[]; activeSubId: string | null }) {
  const resolve = (id: string | null | undefined) =>
    (id && subAccounts.find(s => s.id === id)) ? id : subAccounts[0]?.id ?? ''

  const [activeId, setActiveId] = useState(() => resolve(activeSubId))

  // Ask the server which sub-account is actually active (reads the httpOnly cookie reliably)
  useEffect(() => {
    fetch('/api/sub-accounts/active')
      .then(r => r.json())
      .then(d => {
        const id = d?.active?.id ?? null
        const resolved = resolve(id)
        if (resolved) setActiveId(resolved)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = subAccounts.find(s => s.id === activeId) ?? subAccounts[0]

  if (subAccounts.length === 1) {
    return <BrandingForm key={active.id} subAccount={active} />
  }

  return (
    <div className="space-y-4">
      {/* Profile switcher tabs */}
      <div className="flex gap-2 flex-wrap">
        {subAccounts.map(sub => {
          const isActive = sub.id === activeId
          const color = sub.primary_color ?? '#0d6b1e'
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setActiveId(sub.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all"
              style={{
                borderColor: isActive ? color : '#e5e7eb',
                background: isActive ? `${color}10` : 'white',
                color: isActive ? color : '#6b7280',
              }}
            >
              {sub.logo_url ? (
                <Image
                  src={sub.logo_url}
                  alt={sub.business_name}
                  width={20}
                  height={20}
                  className="rounded-md object-contain shrink-0"
                  style={{ maxHeight: 20 }}
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: color }}
                >
                  {sub.business_name[0]?.toUpperCase()}
                </div>
              )}
              <span className="truncate max-w-[140px]">{sub.business_name}</span>
            </button>
          )
        })}
      </div>

      {/* Active profile form — key forces remount on switch so all state resets */}
      <BrandingForm key={active.id} subAccount={active} />
    </div>
  )
}
