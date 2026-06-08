import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4">
      <Link href="/" className="mb-8">
        <Image src="/Full%20Logo%20for%20Green%20Background.png" alt="DigitalReceipt.ng" width={260} height={100} className="object-contain" />
      </Link>
      {children}
    </div>
  )
}
