'use client'

import { useState, useEffect } from 'react'
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
  Activity,
  Palette,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { brandColor } from '@/lib/brandColor'

interface Props {
  profile: Profile | null
  walletBalance?: number
  activeSubAccount?: { id?: string; business_name: string; rc_number: string | null; logo_url?: string | null; is_primary_profile?: boolean } | null
  avatarUrl?: string | null
}


const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/receipts', label: 'Receipts', icon: FileText, exact: false },
  { href: '/dashboard/receipts/new', label: 'New Receipt', icon: PlusCircle, exact: true },
  { href: '/dashboard/forms', label: 'Request Links', icon: Link2, exact: false },
  { href: '/dashboard/receipt-requests', label: 'Receipt Requests', icon: ClipboardList, exact: false },
  { href: '/free-invoice', label: 'Free Invoice', icon: FilePlus2, exact: true },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet, exact: true },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, exact: false },
  { href: '/dashboard/settings/branding', label: 'Generate Link/Button', icon: Palette, exact: false },
  { href: '/dashboard/profile', label: 'Profile', icon: User, exact: true },
  { href: '/dashboard/activities', label: 'Recent Activities', icon: Activity, exact: true },
]

function initials(name: string | null | undefined) {
  if (!name?.trim()) return '?'
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function Sidebar({ profile, walletBalance, activeSubAccount: initialActiveSub, avatarUrl }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeSubAccount, setActiveSubAccount] = useState(initialActiveSub ?? null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [subAccounts, setSubAccounts] = useState<{ id: string; business_name: string; rc_number: string | null; logo_url: string | null }[]>([])
  const [switching, setSwitching] = useState<string | null>(null)

  // Re-fetch active sub-account on every route change so sidebar stays in sync
  useEffect(() => {
    fetch('/api/sub-accounts/active')
      .then(r => r.json())
      .then(d => setActiveSubAccount(d?.active ?? null))
      .catch(() => {})
  }, [pathname])

  // Load sub-accounts for switcher on mount
  useEffect(() => {
    fetch('/api/sub-accounts')
      .then(r => r.json())
      .then(d => setSubAccounts(d.accounts ?? []))
      .catch(() => {})
  }, [])

  async function switchProfile(id: string | null) {
    setSwitching(id ?? 'main')
    await fetch('/api/sub-accounts/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (id) localStorage.setItem('active_sub_account', id)
    else localStorage.removeItem('active_sub_account')
    setSwitchOpen(false)
    setSwitching(null)
    router.refresh()
    // Re-fetch active sub-account to update display
    fetch('/api/sub-accounts/active')
      .then(r => r.json())
      .then(d => setActiveSubAccount(d?.active ?? null))
      .catch(() => {})
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined' && localStorage.getItem('dr_desktop') === '1') {
      window.location.replace('https://www.digitalreceipt.ng/?__drhome=1')
      return
    }
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="DigitalReceipt.ng" width={44} height={44} className="rounded-lg object-contain shrink-0" />
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
                : { color: 'rgba(255,255,255,0.65)' }
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
                : { color: 'rgba(255,255,255,0.65)' }
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
      <div className="p-3" style={activeSubAccount ? { background: brandColor(activeSubAccount.business_name), borderTop: `2px solid ${brandColor(activeSubAccount.business_name)}` } : { borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
            style={{
              background: activeSubAccount ? brandColor(activeSubAccount.business_name) : 'oklch(0.42 0.18 145)',
              color: 'white',
              ...((!activeSubAccount && !avatarUrl) || (activeSubAccount && !activeSubAccount.logo_url)
                ? { outline: '2px dashed rgba(255,255,255,0.45)', outlineOffset: '2px' }
                : {}),
            }}
          >
            {activeSubAccount?.logo_url ? (
              <img src={activeSubAccount.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : !activeSubAccount && avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : activeSubAccount ? (
              activeSubAccount.business_name.trim()[0]?.toUpperCase()
            ) : (
              profile ? initials(profile.full_name) : '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {activeSubAccount ? activeSubAccount.business_name : (profile?.full_name || profile?.email?.split('@')[0] || 'User')}
            </p>
            {activeSubAccount ? (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {activeSubAccount.rc_number ? `RC: ${activeSubAccount.rc_number}` : 'Main Account'}
              </p>
            ) : !profile?.is_verified ? (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>
                  <ShieldAlert size={10} />
                  Not verified
                </span>
                <Link
                  href="/dashboard/verify"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold underline underline-offset-2"
                  style={{ color: 'rgba(255,255,255,0.60)' }}
                >
                  Verify now
                </Link>
              </div>
            ) : (
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{profile?.email}</p>
            )}
          </div>
        </div>
        {/* Profile switcher */}
        <div className="relative mb-0.5">
          <button
            onClick={() => setSwitchOpen(v => !v)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/>
            </svg>
            Switch Profile
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`ml-auto transition-transform ${switchOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {switchOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitchOpen(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-xl overflow-hidden shadow-xl border border-white/10"
                style={{ background: '#1a2e1f' }}>
                {/* Main account */}
                <button
                  onClick={() => switchProfile(null)}
                  disabled={switching === 'main'}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors hover:bg-white/10 disabled:opacity-50"
                  style={{ color: !activeSubAccount ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)' }}
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                    style={{ background: 'oklch(0.42 0.18 145)', color: 'white' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      : initials(profile?.full_name)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{profile?.full_name || 'Main Account'}</p>
                    <p className="text-[10px] opacity-50 truncate">Main account</p>
                  </div>
                  {!activeSubAccount && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {switching === 'main' && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                </button>

                {subAccounts.length > 0 && (
                  <div className="border-t border-white/10">
                    {subAccounts.map(sub => {
                      const isActive = activeSubAccount?.id === sub.id
                      return (
                        <button
                          key={sub.id}
                          onClick={() => switchProfile(sub.id)}
                          disabled={switching === sub.id}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors hover:bg-white/10 disabled:opacity-50"
                          style={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)' }}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                            style={{ background: 'oklch(0.35 0.15 145)', color: 'white' }}>
                            {sub.logo_url
                              ? <img src={sub.logo_url} alt="" className="w-full h-full object-cover" />
                              : sub.business_name[0]?.toUpperCase()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-xs">{sub.business_name}</p>
                            {sub.rc_number && <p className="text-[10px] opacity-50 truncate">RC {sub.rc_number}</p>}
                          </div>
                          {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          {switching === sub.id && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  )

  const sidebarBg = '#1a2e22'

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-border flex items-center justify-between px-4 py-1">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-dark.png" alt="DigitalReceipt.ng" width={48} height={48} className="rounded-md object-contain shrink-0" />
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
