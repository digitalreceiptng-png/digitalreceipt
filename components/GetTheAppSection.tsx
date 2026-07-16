'use client'

import { usePathname } from 'next/navigation'

// The "Get the App" download banner shown across public pages — hidden on the public
// receipt view (/r/...) so a shared receipt stays clean without the app promo.
export default function GetTheAppSection() {
  const pathname = usePathname()
  if (pathname?.startsWith('/r/')) return null

  return (
    <section className="bg-forest-light border-t border-forest/10 py-2 sm:py-3">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="font-heading text-lg sm:text-xl text-ink font-bold mb-1 mt-0" style={{ letterSpacing: '-0.02em' }}>Get the App</h2>
        <p className="text-ink-muted text-xs mb-2">Download DigitalReceipt.ng on your preferred platform</p>
        <div className="flex flex-wrap justify-center gap-2">
          {/* Android */}
          <a
            href="#"
            className="flex items-center gap-2 bg-[#1a3728] text-white px-4 py-2 rounded-xl hover:bg-[#2d5a3d] transition-colors shadow-sm opacity-60 cursor-not-allowed"
            title="Coming soon"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76a2 2 0 001.94-.22l11.29-6.52-2.5-2.5-10.73 9.24zM.5 1.05A2 2 0 000 2.5v19a2 2 0 00.5 1.45L.6 23l10.66-10.66v-.25L.6 1.1l-.1-.05zM20.32 10.5l-2.6-1.5-2.83 2.83 2.83 2.83 2.63-1.52a2 2 0 000-2.64zM5.12.46L16.41 6.98l-2.5 2.5L3.18.24A2 2 0 005.12.46z"/></svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70 leading-none">Coming soon on</p>
              <p className="text-sm font-bold leading-tight">Google Play</p>
            </div>
          </a>
          {/* iOS */}
          <a
            href="#"
            className="flex items-center gap-2 bg-[#1a3728] text-white px-4 py-2 rounded-xl hover:bg-[#2d5a3d] transition-colors shadow-sm opacity-60 cursor-not-allowed"
            title="Coming soon"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70 leading-none">Coming soon on</p>
              <p className="text-sm font-bold leading-tight">App Store</p>
            </div>
          </a>
          {/* Windows */}
          <a
            href="https://github.com/digitalreceiptng-png/digitalreceipt/releases/latest/download/DigitalReceipt-Setup.exe"
            className="flex items-center gap-2 bg-[#1a3728] text-white px-4 py-2 rounded-xl hover:bg-[#2d5a3d] transition-colors shadow-sm"
            title="Download for Windows (installer — 32 & 64-bit)"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70 leading-none">Download for</p>
              <p className="text-sm font-bold leading-tight">Windows</p>
            </div>
          </a>
          {/* macOS */}
          <a
            href="#"
            className="flex items-center gap-2 bg-[#1a3728] text-white px-4 py-2 rounded-xl hover:bg-[#2d5a3d] transition-colors shadow-sm opacity-60 cursor-not-allowed"
            title="Coming soon"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            <div className="text-left">
              <p className="text-[10px] opacity-70 leading-none">Coming soon on</p>
              <p className="text-sm font-bold leading-tight">macOS</p>
            </div>
          </a>
        </div>
        <p className="text-xs text-ink-muted mt-2 opacity-60">Windows available now · Android, iOS &amp; macOS coming soon</p>
      </div>
    </section>
  )
}
