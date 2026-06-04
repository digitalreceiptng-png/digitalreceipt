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
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/receipts', label: 'Receipts', icon: FileText, exact: false },
  { href: '/dashboard/receipts/new', label: 'New Receipt', icon: PlusCircle, exact: true },
  { href: '/dashboard/profile', label: 'Profile', icon: User, exact: true },
]

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function Sidebar({ profile }: Props) {
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
      <div className="px-4 py-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image src="/logo.jpeg" alt="DigitalReceipt.ng" width={32} height={32} className="rounded-lg" />
          <span className="font-heading text-[#1a6b2f] text-base leading-tight">DigitalReceipt.ng</span>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#f4faf6] text-[#1a6b2f]'
                  : 'text-[#4a6b55] hover:bg-gray-50 hover:text-[#0f1f13]'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-40" />}
            </Link>
          )
        })}

        {profile?.is_admin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 ${
              pathname.startsWith('/admin')
                ? 'bg-[#f4faf6] text-[#1a6b2f]'
                : 'text-[#4a6b55] hover:bg-gray-50 hover:text-[#0f1f13]'
            }`}
          >
            <Shield size={18} />
            <span>Admin Panel</span>
          </Link>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[#1a6b2f] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {profile ? initials(profile.full_name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0f1f13] truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-[#4a6b55] truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#4a6b55] hover:bg-gray-50 hover:text-[#dc2626] transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpeg" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-heading text-[#1a6b2f] text-sm">DigitalReceipt.ng</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-[#4a6b55] hover:text-[#0f1f13]"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-[#4a6b55] hover:text-[#0f1f13]"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
        {navContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0">
        {navContent}
      </aside>
    </>
  )
}
