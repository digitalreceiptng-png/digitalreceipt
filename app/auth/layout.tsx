import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <Image src="/logo.jpeg" alt="DigitalReceipt.ng" width={72} height={72} className="rounded-2xl object-cover" />
        <span className="font-heading text-2xl text-forest">DigitalReceipt.ng</span>
        <span className="text-xs text-ink-dim">Nigeria&apos;s Receipt Verification Infrastructure</span>
      </Link>
      {children}
    </div>
  )
}
