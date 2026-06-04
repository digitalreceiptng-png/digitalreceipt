import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center py-12 px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-1 group">
        <span className="font-heading text-2xl text-gold">DigitalReceipt.ng</span>
        <span className="text-xs text-ink-dim">Nigeria&apos;s Receipt Verification Infrastructure</span>
      </Link>
      {children}
    </div>
  )
}
