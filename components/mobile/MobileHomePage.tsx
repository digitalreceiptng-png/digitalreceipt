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
  { name: 'Emeka Okonkwo',  role: 'Freelance Electrician, Lagos',       text: 'Before DigitalReceipt.ng I was writing paper receipts that customers would lose. Now I send a link and they can verify anytime.' },
  { name: 'Aisha Bello',    role: 'Fashion Designer, Abuja',             text: 'My clients trust me more now. When they see a verified receipt with my trading name, they know it\'s legitimate.' },
  { name: 'Fatima Yusuf',   role: 'Landlord, Kano',                      text: 'I manage 6 properties and used to have disputes about rent payments. Now every tenant gets a digital receipt they can verify.' },
  { name: 'Dr. Ngozi Obi',  role: 'Private Clinic Owner, Port Harcourt', text: 'Patient records and payments used to be a mess. Now every consultation fee has a verifiable receipt. Disputes have dropped to zero.' },
  { name: 'Hauwa Musa',     role: 'Provision Store Owner, Kaduna',       text: 'Even small transactions matter. My customers appreciate that I give digital receipts. It sets me apart from competitors.' },
]

function ReviewCard({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <div className="inline-block w-72 align-top whitespace-normal bg-white border border-border rounded-2xl px-4 py-4 mx-2 shrink-0">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, j) => (
          <svg key={j} className="w-3 h-3 text-forest" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed mb-3">&ldquo;{text}&rdquo;</p>
      <p className="text-xs font-semibold text-ink">{name}</p>
      <p className="text-xs text-ink-dim">{role}</p>
    </div>
  )
}

export default function MobileHomePage() {
  return (
    <div>

      {/* Hero */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/hero-image.png"
          alt="Seller handing over a product to a buyer"
          fill
          className="object-cover object-center opacity-60"
          quality={90}
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, oklch(0.10 0.04 145 / 0.95) 0%, oklch(0.10 0.04 145 / 0.55) 45%, oklch(0.10 0.04 145 / 0.12) 100%)' }} />

        {/* Badge — absolutely positioned at cap level */}
        <div className="absolute top-[12%] left-0 right-0 z-10 flex justify-center px-5">
          <span
            className="font-bold tracking-widest uppercase rounded-full whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.90)', color: 'oklch(0.18 0.08 145)', fontSize: '9px', padding: '13px 28px' }}
          >
            Nigeria&apos;s First Verifiable Digital Receipt Platform
          </span>
        </div>

        {/* Headline — below badge */}
        <div className="absolute top-[20%] left-0 right-0 z-10 px-5 space-y-4">
          <h1 className="font-heading text-4xl text-white font-extrabold leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            Issue a Verifiable Digital Receipt{' '}
            <span style={{ color: 'oklch(0.78 0.26 145)' }}>in Seconds</span>
          </h1>
          <p className="text-base text-white/85 leading-relaxed">
            Authenticated receipts with unique identifiers. Customers can confirm authenticity instantly; no account required.
          </p>
        </div>

        {/* Buttons — bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-12">
          <div className="flex flex-col gap-3">
            <Link
              href="/generate"
              className="flex items-center justify-center py-4 rounded-2xl font-bold text-sm"
              style={{ background: 'white', color: 'oklch(0.22 0.09 145)' }}
            >
              Generate a receipt, free
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center justify-center py-5 rounded-full font-bold text-sm text-white"
              style={{ background: 'oklch(0.16 0.05 145 / 0.80)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Manage Receipts
            </Link>
          </div>
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
            { icon: ShieldCheck, n: '1', title: 'Enter your details',    desc: 'Provide your email, customer info, and items. Quick and mobile-friendly.' },
            { icon: QrCode,      n: '2', title: 'Generate the receipt',  desc: 'A tamper-proof receipt with a unique identifier is issued instantly.' },
            { icon: Search,      n: '3', title: 'Verify anytime',        desc: 'Share the link or QR code. Anyone can confirm it, no account needed.' },
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
      <section className="px-4 py-10 bg-white">
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

      {/* Testimonials — marquee scroll on mobile */}
      <section className="py-10 bg-surface border-y border-border overflow-hidden">
        <h2 className="font-heading text-2xl text-ink text-center mb-2 px-4">Trusted by Nigerians</h2>
        <p className="text-sm text-ink-muted text-center mb-6 px-4">What issuers and customers are saying</p>
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee whitespace-nowrap">
            {[...REVIEWS, ...REVIEWS].map((r, i) => <ReviewCard key={i} {...r} />)}
          </div>
        </div>
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse whitespace-nowrap">
            {[...REVIEWS, ...REVIEWS].map((r, i) => <ReviewCard key={i} {...r} />)}
          </div>
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

      {/* CTA */}
      <section className="bg-surface py-14 px-4">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-heading text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Start issuing verified receipts today
          </h2>
          <p className="text-sm text-ink-muted">
            Free for individuals and businesses. 10 receipts per month at no cost.
          </p>
          <Link
            href="/generate"
            className="inline-block px-7 py-3.5 text-white font-semibold rounded-xl text-sm transition-colors bg-forest hover:bg-forest-bright"
          >
            Generate your first receipt
          </Link>
        </div>
      </section>

      {/* Partners — marquee scroll */}
      <section className="py-8 bg-white border-b border-border overflow-hidden">
        <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted text-center mb-5 px-4">Trusted by businesses across Nigeria</p>
        <div className="flex gap-4 animate-marquee whitespace-nowrap">
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
            <div key={i} className="inline-flex shrink-0 w-28 h-16 bg-white rounded-xl border border-border shadow-sm p-2 items-center justify-center">
              <Image src={logo.src} alt={logo.alt} width={100} height={50} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
