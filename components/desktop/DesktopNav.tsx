'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',             label: 'Home' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/faq',          label: 'FAQ' },
  { href: '/blog',         label: 'Blog' },
  { href: '/terms',        label: 'Terms' },
  { href: '/support',      label: 'Support' },
]

export default function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
              active
                ? 'text-forest bg-forest-light'
                : 'text-ink-muted hover:text-forest hover:bg-forest-light'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
