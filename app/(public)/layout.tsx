import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-heading text-forest text-base sm:text-lg leading-none">DigitalReceipt.ng</span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-2.5 text-sm bg-forest text-white rounded-lg font-medium hover:bg-forest-bright transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-3 py-2.5 text-sm text-ink-muted hover:text-forest transition-colors rounded-lg hover:bg-forest-light"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 sm:px-4 py-2.5 text-sm bg-forest text-white rounded-lg font-medium hover:bg-forest-bright transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-sidebar text-white py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <span className="font-heading text-white">DigitalReceipt.ng</span>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-white/50">
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            <Link href="/verify" className="hover:text-white/80 transition-colors">Verify</Link>
            <Link href="/auth/login" className="hover:text-white/80 transition-colors">Login</Link>
            <Link href="/auth/register" className="hover:text-white/80 transition-colors">Register</Link>
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
