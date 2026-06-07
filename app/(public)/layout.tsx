import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MessageSquare } from 'lucide-react'
import MobileNavWrapper from '@/components/mobile/MobileNavWrapper'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Desktop header */}
      <header className="hidden md:block bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1">
            <Link href="/" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">Home</Link>
            <Link href="/how-it-works" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">How it works</Link>
            <Link href="/faq" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">FAQ</Link>
            <Link href="/blog" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">Blog</Link>
            <Link href="/terms" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">Terms</Link>
            <Link href="/support" className="px-3 py-2 text-sm text-ink-muted hover:text-forest hover:bg-forest-light rounded-lg transition-colors">Support</Link>
          </nav>

          <nav className="flex items-center gap-2 shrink-0 ml-auto">
            {user ? (
              <Link href="/dashboard" className="px-4 py-2.5 text-sm bg-forest text-white rounded-lg font-medium hover:bg-forest-bright transition-colors">Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/login" className="px-3 py-2.5 text-sm text-ink-muted hover:text-forest transition-colors rounded-lg hover:bg-forest-light">Sign in</Link>
                <Link href="/auth/register" className="px-4 py-2.5 text-sm bg-forest text-white rounded-lg font-medium hover:bg-forest-bright transition-colors">Get Started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile header — sticky */}
      <div className="md:hidden sticky top-0 z-50">
        <MobileNavWrapper isLoggedIn={!!user} />
      </div>

      <main className="flex-1 relative">
        {children}

        {/* Floating support button */}
        <Link
          href="/support"
          aria-label="Contact support"
          className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: '#0d6b1e', borderRadius: '18px' }}
        >
          <MessageSquare size={24} color="white" />
        </Link>
      </main>

      <footer className="bg-sidebar text-white py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-start justify-between gap-6">
          <span className="font-heading text-white text-xl">DigitalReceipt.ng</span>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/50">
            <div className="flex flex-col gap-2">
              <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Product</span>
              <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
              <Link href="/how-it-works" className="hover:text-white/80 transition-colors">How it works</Link>
              <Link href="/verify" className="hover:text-white/80 transition-colors">Verify a receipt</Link>
              <Link href="/blog" className="hover:text-white/80 transition-colors">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Help</span>
              <Link href="/faq" className="hover:text-white/80 transition-colors">FAQ</Link>
              <Link href="/support" className="hover:text-white/80 transition-colors">Support</Link>
              <Link href="/terms" className="hover:text-white/80 transition-colors">Terms &amp; Privacy</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Account</span>
              <Link href="/auth/login" className="hover:text-white/80 transition-colors">Sign in</Link>
              <Link href="/auth/register" className="hover:text-white/80 transition-colors">Register</Link>
            </div>
          </div>
          <p className="text-xs text-white/40 text-center md:text-right">
            © 2026 DigitalReceipt.ng<br />
            Nigeria&apos;s Receipt Verification Infrastructure
          </p>
        </div>
      </footer>
    </div>
  )
}
