'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VerifyWidget from '@/app/(public)/VerifyWidget'
import Reveal from '@/components/Reveal'
import { ShieldCheck, QrCode, Search, ArrowRight } from 'lucide-react'

const STATIC_PARTNER_LOGOS = [
  { src: '/Partners%20Logos/Computer%20service%20PNG%203.png',  alt: 'Computer Service' },
  { src: '/Partners%20Logos/Deallock%20logo.jpg.jpeg',          alt: 'Deallock' },
  { src: '/Partners%20Logos/Gotref%20Logo.png',                 alt: 'Gotref' },
  { src: '/Partners%20Logos/Idcode%20logo%202.JPG.jpeg',        alt: 'Idcode' },
  { src: '/Partners%20Logos/SUBMITAR%20A.png',                  alt: 'Submitar' },
  { src: '/Partners%20Logos/Scancodes%20logo.JPG.jpg.jpeg',     alt: 'Scancodes' },
  { src: '/Partners%20Logos/VOLUWORK%20NEW%20LOGO.png',         alt: 'Voluwork' },
  { src: '/Partners%20Logos/portrait%20Vassetlogo.png',         alt: 'Vasset' },
  { src: '/Partners%20Logos/GadgetFlux.jpeg',                   alt: 'GadgetsFlux' },
  { src: '/Partners%20Logos/Abuja%20Rent%20Hub.jpeg',           alt: 'Abuja Rent Hub' },
  { src: '/Partners%20Logos/Ahowa.jpeg',                        alt: 'Ahowa' },
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
      <p className="text-xs text-ink-muted">{role}</p>
    </div>
  )
}

export default function MobileHomePage() {
  const [partnerLogos, setPartnerLogos] = useState(STATIC_PARTNER_LOGOS)

  useEffect(() => {
    fetch('/api/partners')
      .then(r => r.json())
      .then(({ partners }) => {
        if (partners?.length > 0) {
          setPartnerLogos(partners.map((p: { logo_url: string; name: string }) => ({ src: p.logo_url, alt: p.name })))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div>

      {/* Hero */}
      <section
        className="relative w-full overflow-hidden flex items-center"
        style={{ minHeight: '88vh', background: 'linear-gradient(to right, #ffffff 0%, #f0faf2 28%, oklch(0.22 0.105 145) 62%)' }}
      >
        <Image
          src="/realhero2.webp"
          alt="DigitalReceipt.ng — Nigeria's First Verifiable Digital Receipt Platform"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Left white fade — keeps logo visible */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, #ffffff 0%, #f0faf2 22%, oklch(0.22 0.105 145 / 0.20) 40%, oklch(0.22 0.105 145 / 0.72) 62%)' }}
        />

        {/* Content — right half */}
        <div className="relative z-10 w-full flex justify-end px-5 py-12">
          <div className="flex flex-col items-start gap-4 w-[62%]">
            <p
              className="inline-block text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-xl"
              style={{ background: 'white', color: 'oklch(0.27 0.105 145)' }}
            >
              Nigeria&apos;s First Verifiable Digital Receipt Platform
            </p>
            <h1
              className="font-heading text-3xl text-white font-normal leading-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
            >
              Issue a Verifiable Digital Receipt{' '}
              <span style={{ color: 'oklch(0.8 0.22 145)' }}>in Seconds</span>
            </h1>
            <p
              className="text-sm text-white font-medium leading-relaxed"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
            >
              Authenticated digital receipts with unique identifiers. Customers, auditors, and regulators can confirm authenticity instantly; no account required.
            </p>
            <div className="flex flex-col gap-2.5 pt-1 w-full">
              <div className="flex flex-row gap-2.5">
                <Link
                  href="/dashboard/receipts/new"
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-center transition-all hover:bg-white/90"
                  style={{ background: 'white', color: 'oklch(0.27 0.105 145)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                >
                  Generate a receipt
                </Link>
                <Link
                  href="/auth/login"
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 border-2 border-white text-white hover:bg-white/20 transition-colors text-center"
                >
                  Manage Receipts
                </Link>
              </div>
              <Link
                href="/free-invoice"
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-white text-center block"
                style={{ background: 'rgba(0,0,0,0.35)', border: '2px solid oklch(0.62 0.18 145)' }}
              >
                Generate Free Invoice
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verify */}
      <section className="px-4 py-8 bg-white border-b border-border">
        <Reveal>
          <h2 className="font-heading text-xl text-ink text-center mb-4">Verify a receipt</h2>
          <p className="text-sm text-ink-muted text-center mb-5">Enter a receipt number to confirm authenticity.</p>
          <VerifyWidget />
        </Reveal>
      </section>

      {/* How it works */}
      <section className="px-4 py-10 bg-surface border-b border-border">
        <Reveal><h2 className="font-heading text-2xl text-ink text-center mb-8">How it works</h2></Reveal>
        <div className="space-y-6">
          {[
            { icon: ShieldCheck, n: '1', title: 'Enter Details',         desc: 'Create an account using your email and password, then provide your customer information and transaction details.' },
            { icon: QrCode,      n: '2', title: 'Generate',              desc: 'Add transaction details and line items. A tamper-proof receipt with a unique identifier and QR code is generated instantly.' },
            { icon: Search,      n: '3', title: 'Verify',                desc: 'Share with your customer. Verify by scanning the QR code or entering the unique identifier on DigitalReceipt.ng. No account required.' },
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
      <section className="px-4 py-10 bg-white border-b border-border">
        <div className="grid grid-cols-2 gap-y-8 gap-x-4 text-center">
          {[
            { value: '12,000+',   label: 'Receipts Generated' },
            { value: '4,800+',    label: 'Verified Issuers' },
            { value: '36 States', label: 'Across Nigeria' },
            { value: '100%',      label: 'Tamper-Proof Records' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="block w-5 h-0.5 bg-forest mb-1.5 rounded-full" />
              <p className="font-heading text-2xl text-ink leading-none whitespace-nowrap">{value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — marquee scroll on mobile */}
      <section className="py-10 bg-surface border-y border-border overflow-hidden">
        <Reveal className="px-4">
          <h2 className="font-heading text-2xl text-ink text-center mb-2">Trusted by Nigerians</h2>
          <p className="text-sm text-ink-muted text-center mb-6">What issuers and customers are saying</p>
        </Reveal>
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
        <Reveal className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-heading text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Start issuing verified receipts today
          </h2>
          <p className="text-sm text-ink-muted">
            DigitalReceipt.ng is free for individuals and businesses. Every account includes 5 free receipts per month, and you can increase your receipt limit whenever you need more.
          </p>
          <Link
            href="/dashboard/receipts/new"
            className="inline-block px-7 py-3.5 text-white font-semibold rounded-xl text-sm transition-all bg-forest hover:bg-forest-bright"
            style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
          >
            Generate your first receipt
          </Link>
        </Reveal>
      </section>

      {/* Partners — marquee scroll */}
      <section className="py-8 bg-white border-b border-border overflow-hidden">
        <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted text-center mb-5 px-4">Trusted by businesses across Nigeria</p>
        <div className="flex gap-4 animate-marquee whitespace-nowrap">
          {[...partnerLogos, ...partnerLogos].map((logo, i) => (
            <div key={i} className="inline-flex shrink-0 w-28 h-16 bg-white rounded-xl border border-border shadow-sm p-2 items-center justify-center">
              <Image src={logo.src} alt={logo.alt} width={100} height={50} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
