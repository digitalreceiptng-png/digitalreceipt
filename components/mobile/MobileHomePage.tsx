'use client'

import Link from 'next/link'
import Image from 'next/image'
import VerifyWidget from '@/app/(public)/VerifyWidget'
import { ShieldCheck, QrCode, Search, ArrowRight } from 'lucide-react'

const PARTNER_LOGOS = [
  { src: '/Partners%20Logos/Computer%20service%20PNG%203.png',  alt: 'Computer Service' },
  { src: '/Partners%20Logos/Deallock%20logo.jpg.jpeg',          alt: 'Deallock' },
  { src: '/Partners%20Logos/Gotref%20Logo.png',                 alt: 'Gotref' },
  { src: '/Partners%20Logos/Idcode%20logo%202.JPG.jpeg',        alt: 'Idcode' },
  { src: '/Partners%20Logos/SUBMITAR%20A.png',                  alt: 'Submitar' },
  { src: '/Partners%20Logos/Scancodes%20logo.JPG.jpg.jpeg',     alt: 'Scancodes' },
  { src: '/Partners%20Logos/VOLUWORK%20NEW%20LOGO.png',         alt: 'Voluwork' },
  { src: '/Partners%20Logos/portrait%20Vassetlogo.png',         alt: 'Vasset' },
]

const REVIEWS = [
  { name: 'Emeka Okonkwo',  role: 'Freelance Electrician, Lagos',   text: 'Before DigitalReceipt.ng I was writing paper receipts that customers would lose. Now I send a link and they can verify anytime.' },
  { name: 'Aisha Bello',    role: 'Fashion Designer, Abuja',         text: 'My clients trust me more now. When they see a verified receipt with my trading name, they know it\'s legitimate.' },
  { name: 'Fatima Yusuf',   role: 'Landlord, Kano',                  text: 'I manage 6 properties and used to have disputes about rent payments. Now every tenant gets a digital receipt they can verify.' },
  { name: 'Dr. Ngozi Obi',  role: 'Private Clinic Owner, Port Harcourt', text: 'Patient records and payments used to be a mess. Now every consultation fee has a verifiable receipt. Disputes have dropped to zero.' },
  { name: 'Hauwa Musa',     role: 'Provision Store Owner, Kaduna',   text: 'Even small transactions matter. My customers appreciate that I give digital receipts. It sets me apart from competitors.' },
]

export default function MobileHomePage() {
  return (
    <div className="pb-24"> {/* bottom padding for sticky CTA bar */}

      {/* Hero */}
      <section className="relative min-h-[92vh] flex flex-col justify-end overflow-hidden">
        <Image
          src="/hero-image.png"
          alt="Seller handing over a product to a buyer"
          fill
          className="object-cover object-center"
          quality={90}
          sizes="100vw"
          priority
        />
        {/* Full dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, oklch(0.12 0.09 145 / 0.97) 0%, oklch(0.12 0.09 145 / 0.6) 50%, oklch(0.12 0.09 145 / 0.2) 100%)' }} />

        <div className="relative z-10 px-5 pb-12 pt-8 space-y-5">
          <span className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-white" style={{ color: 'oklch(0.27 0.105 145)' }}>
            Nigeria&apos;s First Verifiable Digital Receipt Platform
          </span>
          <h1 className="font-heading text-3xl text-white font-extrabold leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            Issue a Verifiable Digital Receipt{' '}
            <span style={{ color: 'oklch(0.82 0.22 145)' }}>in Seconds</span>
          </h1>
          <p className="text-sm text-white/85 leading-relaxed">
            Authenticated receipts with unique identifiers. Buyers can confirm authenticity instantly; no account required.
          </p>
        </div>
      </section>

      {/* Verify */}
      <section className="px-4 py-8 bg-white border-b border-border">
        <h2 className="font-heading text-xl text-ink text-center mb-4">Verify a receipt</h2>
        <p className="text-sm text-ink-muted text-center mb-5">Enter a receipt number to confirm authenticity.</p>
        <VerifyWidget />
      </section>

      {/* How it works */}
      <section className="px-4 py-10 bg-surface border-b border-border">
        <h2 className="font-heading text-2xl text-ink text-center mb-8">How it works</h2>
        <div className="space-y-6">
          {[
            { icon: ShieldCheck, n: '1', title: 'Enter your details', desc: 'Provide your email, buyer info, and items. Quick and mobile-friendly.' },
            { icon: QrCode,      n: '2', title: 'Generate the receipt', desc: 'A tamper-proof receipt with a unique identifier is issued instantly.' },
            { icon: Search,      n: '3', title: 'Verify anytime', desc: 'Share the link or QR code. Anyone can confirm it, no account needed.' },
          ].map(({ icon: Icon, n, title, desc }) => (
            <div key={n} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-white">{n}</span>
              </div>
              <div>
                <p className="font-semibold text-ink text-sm mb-1">{title}</p>
                <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/how-it-works" className="text-sm font-medium text-forest hover:underline flex items-center gap-1 justify-center">
            See the full guide <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-10 bg-gray-300">
        <div className="grid grid-cols-2 gap-6 text-center">
          {[
            { value: '12,000+',   label: 'Receipts Generated' },
            { value: '4,800+',    label: 'Verified Issuers' },
            { value: '36 States', label: 'Across Nigeria' },
            { value: '100%',      label: 'Tamper-Proof Records' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-heading text-3xl text-ink mb-1 leading-none">{value}</p>
              <p className="text-xs text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — vertical stack on mobile */}
      <section className="px-4 py-10 bg-surface border-y border-border">
        <h2 className="font-heading text-2xl text-ink text-center mb-2">Trusted by Nigerians</h2>
        <p className="text-sm text-ink-muted text-center mb-6">What issuers and buyers are saying</p>
        <div className="space-y-4">
          {REVIEWS.map((r, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl px-4 py-4">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className="w-3 h-3 text-forest" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-ink-muted leading-relaxed mb-3">&ldquo;{r.text}&rdquo;</p>
              <p className="text-xs font-semibold text-ink">{r.name}</p>
              <p className="text-xs text-ink-dim">{r.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-4 py-10 bg-white border-b border-border">
        <h2 className="font-heading text-2xl text-ink text-center mb-6">Built for every Nigerian issuer</h2>
        <div className="grid grid-cols-2 gap-2">
          {['Schools', 'Hospitals & Clinics', 'Landlords', 'Freelancers', 'Retailers & SMEs', 'Government Agencies'].map(who => (
            <div key={who} className="bg-surface border border-border rounded-xl px-3 py-3 text-xs font-medium text-ink-muted text-center">
              {who}
            </div>
          ))}
        </div>
      </section>

      {/* Partners — horizontal scroll */}
      <section className="py-8 bg-white border-b border-border overflow-hidden">
        <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted text-center mb-5 px-4">Trusted by businesses across Nigeria</p>
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x">
          {PARTNER_LOGOS.map((logo, i) => (
            <div key={i} className="shrink-0 snap-start w-28 h-16 bg-white rounded-xl border border-border shadow-sm p-2 flex items-center justify-center">
              <Image src={logo.src} alt={logo.alt} width={100} height={50} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border px-4 py-3 flex gap-3">
        <Link
          href="/generate"
          className="flex-1 flex items-center justify-center py-3.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-bright transition-colors"
        >
          Generate receipt
        </Link>
        <Link
          href="/auth/login"
          className="flex items-center justify-center px-4 py-3.5 border border-border text-ink rounded-xl text-sm font-medium hover:bg-surface transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
