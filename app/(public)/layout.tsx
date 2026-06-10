import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/server'
import MobileNavWrapper from '@/components/mobile/MobileNavWrapper'
import DesktopNav from '@/components/desktop/DesktopNav'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Desktop header */}
      <header className="hidden md:block bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <DesktopNav />

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

      </main>

      <footer className="bg-sidebar text-white py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-start justify-between gap-6">
          <Link href="/" className="shrink-0 self-start -mt-4">
            <Image src="/Full%20Logo%20for%20Green%20Background.png" alt="DigitalReceipt.ng" width={160} height={60} className="object-contain" />
          </Link>
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
            <div className="flex flex-col gap-3">
              <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Contact</span>
              <div className="flex items-center gap-3">
                <a href="mailto:info@digitalreceipt.ng" aria-label="Email us" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </a>
                <a href="tel:07031031944" aria-label="Call us" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </a>
                <a href="https://www.instagram.com/digitalreceipt.ng" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://x.com/dreceipt_ng?s=11" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/40 text-center md:text-right">
            © 2026 DigitalReceipt.ng<br />
            Nigeria&apos;s Receipt Verification Infrastructure
          </p>

        </div>
      </footer>
      <Script id="tawk-to" strategy="afterInteractive">{`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/6a27df684331c01c33d19609/1jqls1c4r';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}</Script>
    </div>
  )
}
