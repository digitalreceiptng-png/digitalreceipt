'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  PenLine,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Handshake,
  Megaphone,
  UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AdminUser } from '@/lib/admin-auth'
import { adminHref } from '@/lib/admin-url'

interface Props {
  admin: AdminUser
}

const PHASE1_NAV = [
  { href: adminHref('/overview'),       label: 'Overview',       icon: LayoutDashboard, exact: true },
  { href: adminHref('/users'),          label: 'Users',          icon: Users,           exact: false },
  { href: adminHref('/receipts'),       label: 'Receipts',       icon: FileText,        exact: false },
  { href: adminHref('/identity'),       label: 'Identity Queue', icon: ShieldCheck,     exact: false },
  { href: adminHref('/subscriptions'),  label: 'Subscriptions',  icon: CreditCard,      exact: false },
  { href: adminHref('/support'),        label: 'Support',        icon: MessageSquare,   exact: false },
  { href: adminHref('/blog'),           label: 'Blog & Content', icon: PenLine,         exact: false },
  { href: adminHref('/partners'),       label: 'Partners',       icon: Handshake,       exact: false },
  { href: adminHref('/announcements'),  label: 'Announcements',  icon: Megaphone,       exact: false },
  { href: adminHref('/audit-log'),      label: 'Audit Log',      icon: ScrollText,      exact: false },
  { href: adminHref('/admin-users'),    label: 'Admin Users',    icon: UserCog,         exact: false },
  { href: adminHref('/system'),         label: 'System',         icon: Settings,        exact: false },
]

const COMING_SOON_NAV: { label: string; icon: any }[] = []

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const BG = 'oklch(0.17 0.10 145)'

export default function AdminSidebar({ admin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(adminHref('/login'))
    router.refresh()
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div
        className="px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Link
          href={adminHref('/overview')}
          className="flex items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'oklch(0.42 0.18 145)' }}
          >
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <p
              className="text-xs font-bold leading-tight"
              style={{ color: 'rgba(255,255,255,0.90)' }}
            >
              Admin Console
            </p>
            <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>
              DigitalReceipt.ng
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-0.5">
        {/* Phase 1 — active */}
        <p
          className="px-3 pb-2 text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Operations
        </p>
        {PHASE1_NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={
                active
                  ? {
                      background: 'oklch(0.42 0.18 145 / 0.25)',
                      color: 'rgba(255,255,255,0.95)',
                      borderLeft: '2px solid oklch(0.62 0.18 145)',
                    }
                  : { color: 'rgba(255,255,255,0.55)' }
              }
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = ''
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.40)' }} />}
            </Link>
          )
        })}

        {COMING_SOON_NAV.length > 0 && (
          <div className="pt-4">
            <p
              className="px-3 pb-2 text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              Coming Soon
            </p>
            {COMING_SOON_NAV.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-not-allowed select-none"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="flex-1">{label}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.06)', fontSize: '9px', letterSpacing: '0.06em' }}
                >
                  SOON
                </span>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Admin user footer */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'oklch(0.42 0.18 145)', color: 'white' }}
          >
            {initials(admin.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate leading-tight"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {admin.full_name}
            </p>
            <p
              className="text-xs truncate leading-tight mt-0.5"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {admin.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'oklch(0.72 0.18 25)'
            e.currentTarget.style.background = 'oklch(0.52 0.20 25 / 0.10)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
            e.currentTarget.style.background = ''
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: BG, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'oklch(0.42 0.18 145)' }}
          >
            <ShieldCheck size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Admin Console
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2"
          style={{ color: 'rgba(255,255,255,0.50)' }}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: BG }}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0"
        style={{ background: BG }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
