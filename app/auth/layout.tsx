import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3">
        <Image src="/Full%20Logo%20for%20Green%20Background.png" alt="DigitalReceipt.ng" width={120} height={120} className="object-contain" />
        <span className="font-heading text-2xl font-bold text-forest">DigitalReceipt.ng</span>
      </Link>
      {children}
    </div>
  )
}
