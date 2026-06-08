import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <Link href="/" className="mb-8">
        <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={180} height={180} className="object-contain" />
      </Link>
      {children}
    </div>
  )
}
