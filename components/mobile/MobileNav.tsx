'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, Home, Info, HelpCircle, BookOpen, FileText, HeadphonesIcon, LogIn, UserPlus, LayoutDashboard } from 'lucide-react'

interface Props {
  isLoggedIn: boolean
}

const NAV_LINKS = [
  { href: '/',              label: 'Home',         icon: Home },
  { href: '/how-it-works',  label: 'How it works', icon: Info },
  { href: '/faq',           label: 'FAQ',          icon: HelpCircle },
  { href: '/blog',          label: 'Blog',         icon: BookOpen },
  { href: '/terms',         label: 'Terms',        icon: FileText },
  { href: '/support',       label: 'Support',      icon: HeadphonesIcon },
]

export default function MobileNav({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-border">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={64} height={32} className="object-contain" />
        </Link>
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-ink hover:bg-surface transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-heading text-forest text-lg">Menu</span>
          <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-forest-light text-forest'
                    : 'text-ink hover:bg-forest-light hover:text-forest'
                }`}
              >
                <Icon size={17} className="text-forest shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth CTA */}
        <div className="p-4 border-t border-border space-y-2">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors"
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 border border-border text-ink rounded-xl text-sm font-medium hover:bg-surface transition-colors"
              >
                <LogIn size={16} /> Sign in
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors"
              >
                <UserPlus size={16} /> Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}
