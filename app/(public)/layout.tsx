import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-heading text-gold text-lg leading-none tracking-tight">DigitalReceipt.ng</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/verify"
              className="px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-surface-raised"
            >
              Verify Receipt
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm bg-gold text-bg rounded-lg font-medium hover:bg-gold-bright transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-surface-raised"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 text-sm bg-gold text-bg rounded-lg font-medium hover:bg-gold-bright transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-bg border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-heading text-gold">DigitalReceipt.ng</span>
          <div className="flex gap-6 text-sm text-ink-dim">
            <Link href="/" className="hover:text-ink-muted transition-colors">Home</Link>
            <Link href="/verify" className="hover:text-ink-muted transition-colors">Verify</Link>
            <Link href="/auth/login" className="hover:text-ink-muted transition-colors">Login</Link>
            <Link href="/auth/register" className="hover:text-ink-muted transition-colors">Register</Link>
          </div>
          <p className="text-xs text-ink-dim text-center md:text-right">
            © 2026 DigitalReceipt.ng<br />
            Nigeria&apos;s Receipt Verification Infrastructure
          </p>
        </div>
      </footer>
    </div>
  )
}
