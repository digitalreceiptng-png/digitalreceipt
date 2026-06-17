'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  Shield,
  LogOut,
  Menu,
  X,
  Wallet,
  FilePlus2,
  Users,
  Link2,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  walletBalance?: number
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/receipts', label: 'Receipts', icon: FileText, exact: false },
  { href: '/dashboard/receipts/new', label: 'New Receipt', icon: PlusCircle, exact: true },
  { href: '/dashboard/forms', label: 'Form Links', icon: Link2, exact: false },
  { href: '/dashboard/receipt-requests', label: 'Receipt Requests', icon: ClipboardList, exact: false },
  { href: '/free-invoice', label: 'Free Invoice', icon: FilePlus2, exact: true },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet, exact: true },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, exact: false },
  { href: '/dashboard/profile', label: 'Profile', icon: User, exact: true },
]

function initials(name: string | null | undefined) {
  if (!name?.trim()) return '?'
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Sidebar({ profile, walletBalance }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo.jpeg" alt="DigitalReceipt.ng" width={36} height={36} className="rounded-lg object-cover shrink-0" />
          <span className="font-heading text-white text-base leading-tight">DigitalReceipt.ng</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'text-gold'
                  : 'hover:bg-white/8'
              }`}
              style={active
                ? { background: 'rgba(255,255,255,0.12)', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.6)' }
              }
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
              <span className="flex-1">{label}</span>
            </Link>
          )
        })}

        {profile?.is_admin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2"
            style={
              pathname.startsWith('/admin')
                ? { background: 'rgba(255,255,255,0.12)', color: '#ffffff' }
                : { color: 'rgba(255,255,255,0.6)' }
            }
          >
            <Shield size={17} strokeWidth={1.75} />
            <span>Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* Wallet balance */}
      {walletBalance !== undefined && (
        <div className="mx-3 mb-2">
          <Link
            href="/dashboard/wallet"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <div className="flex items-center gap-2">
              <Wallet size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Wallet</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </span>
          </Link>
        </div>
      )}

      {/* User footer */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'oklch(0.42 0.18 145)', color: 'white' }}
          >
            {profile ? initials(profile.full_name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
            </p>
            {!profile?.is_verified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>
                <ShieldAlert size={10} />
                Not verified
              </span>
            ) : (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{profile?.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10"
          style={{ color: 'rgba(255,255,255,0.40)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'oklch(0.62 0.20 25)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.40)')}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )

  const sidebarBg = 'oklch(0.22 0.14 145)'

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-forest text-sm">DigitalReceipt.ng</span>
        </Link>
        <button onClick={() => setOpen(true)} className="p-2 text-ink-muted hover:text-forest" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
      )}

      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: sidebarBg }}
      >
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1.5" style={{ color: 'rgba(255,255,255,0.4)' }} aria-label="Close menu">
          <X size={20} />
        </button>
        {navContent}
      </div>

      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0" style={{ background: sidebarBg }}>
        {navContent}
      </aside>
    </>
  )
}
