import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4faf6] flex flex-col items-center justify-center py-12 px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2 group">
        <Image
          src="/logo.jpeg"
          alt="DigitalReceipt.ng"
          width={52}
          height={52}
          className="rounded-xl shadow-sm"
        />
        <span className="font-heading text-xl text-[#1a6b2f]">DigitalReceipt.ng</span>
      </Link>
      {children}
    </div>
  )
}
