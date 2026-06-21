'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VerifyWidget from '@/app/(public)/VerifyWidget'
import Reveal from '@/components/Reveal'

const STATIC_PARTNER_LOGOS = [
  { src: '/Partners%20Logos/Computer%20service%20PNG%203.png',    alt: 'Computer Service' },
  { src: '/Partners%20Logos/Deallock%20logo.jpg.jpeg',            alt: 'Deallock' },
  { src: '/Partners%20Logos/Gotref%20Logo.png',                   alt: 'Gotref' },
  { src: '/Partners%20Logos/Idcode%20logo%202.JPG.jpeg',          alt: 'Idcode' },
  { src: '/Partners%20Logos/SUBMITAR%20A.png',                    alt: 'Submitar' },
  { src: '/Partners%20Logos/Scancodes%20logo.JPG.jpg.jpeg',       alt: 'Scancodes' },
  { src: '/Partners%20Logos/VOLUWORK%20NEW%20LOGO.png',           alt: 'Voluwork' },
  { src: '/Partners%20Logos/portrait%20Vassetlogo.png',           alt: 'Vasset' },
  { src: '/Partners%20Logos/GadgetFlux.jpeg',                     alt: 'GadgetsFlux' },
  { src: '/Partners%20Logos/Abuja%20Rent%20Hub.jpeg',             alt: 'Abuja Rent Hub' },
  { src: '/Partners%20Logos/Ahowa.jpeg',                          alt: 'Ahowa' },
]

const REVIEWS_ROW1 = [
  { name: 'Emeka Okonkwo',   role: 'Freelance Electrician, Lagos',        text: 'Before DigitalReceipt.ng I was writing paper receipts that customers would lose. Now I send a link and they can verify anytime.' },
  { name: 'Aisha Bello',     role: 'Fashion Designer, Abuja',              text: 'My clients trust me more now. When they see a verified receipt with my trading name, they know it\'s legitimate.' },
  { name: 'Chukwudi Eze',    role: 'Private Lesson Teacher, Enugu',        text: 'Parents used to question if their children\'s fees were actually paid to me. This platform solved that completely.' },
  { name: 'Fatima Yusuf',    role: 'Landlord, Kano',                       text: 'I manage 6 properties and used to have disputes about rent payments. Now every tenant gets a digital receipt they can verify.' },
  { name: 'Tunde Adeyemi',   role: 'Auto Parts Dealer, Ibadan',            text: 'My shop looks more professional. Customers walk in, buy parts, and get a receipt they can show their mechanic for warranty claims.' },
]

const REVIEWS_ROW2 = [
  { name: 'Dr. Ngozi Obi',   role: 'Private Clinic Owner, Port Harcourt', text: 'Patient records and payments used to be a mess. Now every consultation fee has a verifiable receipt. Disputes have dropped to zero.' },
  { name: 'Bode Fashola',    role: 'Event Planner, Lagos',                 text: 'I collect deposits from clients months before events. The verified receipt gives them peace of mind that their money is safe with me.' },
  { name: 'Hauwa Musa',      role: 'Provision Store Owner, Kaduna',        text: 'Even small transactions matter. My customers appreciate that I give digital receipts. It sets me apart from competitors.' },
  { name: 'Seun Adebayo',    role: 'IT Consultant, Lagos',                 text: 'As someone who invoices multiple clients, having NIN-verified receipts adds a layer of professionalism and legal protection.' },
  { name: 'Amaka Nwosu',     role: 'Catering Business, Anambra',           text: 'My corporate clients require receipts for reimbursement. DigitalReceipt.ng makes the process fast and the receipts are always accepted.' },
]

function ReviewCard({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <div className="inline-block w-72 sm:w-80 align-top whitespace-normal bg-white border border-border rounded-2xl px-5 sm:px-6 py-5 mx-2 shrink-0">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5 text-forest" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
      <div>
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-ink-muted mt-0.5">{role}</p>
      </div>
    </div>
  )
}

export default function DesktopHomePage() {
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
        style={{ minHeight: '620px', maxHeight: '94vh', background: 'oklch(0.12 0.06 145)' }}
      >
        <Image
          src="/realhero2.webp"
          alt="DigitalReceipt.ng — Nigeria's First Verifiable Digital Receipt Platform"
          fill
          priority
          className="object-cover object-center"
          style={{ opacity: 0.55 }}
        />
        {/* Left fade so text pops */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, oklch(0.10 0.05 145 / 0.92) 0%, oklch(0.10 0.05 145 / 0.75) 40%, oklch(0.10 0.05 145 / 0.20) 75%, transparent 100%)' }}
        />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: 'linear-gradient(to top, oklch(0.10 0.05 145 / 0.6), transparent)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 xl:px-16 flex items-center gap-12 xl:gap-20 py-16 xl:py-24">

          {/* Left — copy */}
          <div className="flex flex-col items-start gap-4 xl:gap-6 max-w-lg xl:max-w-2xl">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p
                className="inline-block text-[10px] xl:text-xs font-bold tracking-widest uppercase px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.20)' }}
              >
                Nigeria&apos;s First Verifiable Digital Receipt Platform
              </p>
            </div>

            {/* Headline */}
            <h1
              className="font-heading text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl text-white font-normal leading-[1.08]"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)', textWrap: 'balance' }}
            >
              Issue a Verifiable<br />Digital Receipt{' '}
              <span style={{ color: 'oklch(0.82 0.22 145)' }}>in Seconds</span>
            </h1>

            {/* Subtext */}
            <p
              className="text-sm xl:text-base text-white/80 leading-relaxed max-w-md"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
            >
              Authenticated digital receipts with unique identifiers. Customers, auditors, and regulators can confirm authenticity instantly — no account required.
            </p>

            {/* CTAs */}
            <div className="flex flex-row flex-wrap gap-3 pt-1">
              <Link
                href="/dashboard/receipts/new"
                className="px-6 py-3 xl:px-8 xl:py-3.5 rounded-xl font-bold text-sm xl:text-base transition-all hover:-translate-y-0.5 hover:shadow-xl text-center"
                style={{ background: 'white', color: 'oklch(0.22 0.09 145)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
              >
                Generate a receipt
              </Link>
              <Link
                href="/auth/login"
                className="px-6 py-3 xl:px-8 xl:py-3.5 rounded-xl font-bold text-sm xl:text-base text-white text-center transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(8px)' }}
              >
                Manage Receipts
              </Link>
              <Link
                href="/free-invoice"
                className="px-6 py-3 xl:px-8 xl:py-3.5 rounded-xl font-bold text-sm xl:text-base text-white text-center transition-colors hover:bg-white/10"
                style={{ background: 'transparent', border: '1.5px solid oklch(0.62 0.18 145)' }}
              >
                Free Invoice
              </Link>
            </div>

            {/* Trust stats */}
            <div className="flex items-center gap-5 pt-2">
              {[
                { value: '12,000+', label: 'Receipts issued' },
                { value: '4,800+',  label: 'Verified issuers' },
                { value: '36',      label: 'States covered' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="font-heading text-xl xl:text-2xl text-white font-normal leading-none">{value}</p>
                  <p className="text-[10px] xl:text-xs text-white/55 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — floating receipt preview card */}
          <div className="hidden lg:flex flex-col shrink-0 ml-auto">
            <div
              className="rounded-2xl xl:rounded-3xl overflow-hidden w-72 xl:w-80 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {/* Card header */}
              <div className="px-5 py-4 xl:px-6 xl:py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-[10px] font-semibold tracking-widest uppercase">Digital Receipt</p>
                    <p className="text-white font-heading text-base xl:text-lg mt-0.5">Acme Retail Ltd.</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                    style={{ background: 'oklch(0.38 0.14 155 / 0.25)', color: 'oklch(0.72 0.18 155)', border: '1px solid oklch(0.38 0.14 155 / 0.4)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Verified
                  </span>
                </div>
              </div>
              {/* Card body */}
              <div className="px-5 py-4 xl:px-6 xl:py-5 space-y-3">
                <div className="space-y-2">
                  {[
                    { item: 'Web Design Package', amount: '₦120,000' },
                    { item: 'Monthly Hosting',    amount: '₦15,000' },
                    { item: 'Domain Renewal',     amount: '₦8,500' },
                  ].map(({ item, amount }) => (
                    <div key={item} className="flex items-center justify-between">
                      <span className="text-white/65 text-xs">{item}</span>
                      <span className="text-white text-xs font-semibold">{amount}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white/55 text-xs">Total</span>
                    <span className="text-white font-heading text-lg xl:text-xl">₦143,500</span>
                  </div>
                </div>
                {/* QR placeholder */}
                <div className="flex items-center gap-3 pt-1">
                  <div
                    className="w-12 h-12 xl:w-14 xl:h-14 rounded-lg grid grid-cols-3 grid-rows-3 gap-0.5 p-1.5 shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="rounded-sm" style={{ background: [0,1,3,4,5,7,8].includes(i) ? 'white' : 'transparent' }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">Receipt ID</p>
                    <p className="text-white/80 text-xs font-mono mt-0.5">DR-2024-00847</p>
                    <p className="text-white/40 text-[9px] mt-1">Scan to verify authenticity</p>
                  </div>
                </div>
              </div>
              {/* Card footer */}
              <div className="px-5 py-3 xl:px-6" style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-center text-white/35 text-[10px]">DigitalReceipt.ng — Tamper-proof & verifiable</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Verify */}
      <section className="py-12 sm:py-16 px-4 bg-white border-b border-border">
        <Reveal className="max-w-xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl text-ink" style={{ textWrap: 'balance' }}>
              Verify a receipt
            </h2>
            <p className="text-sm text-ink-muted">
              Enter a receipt number or unique identifier to confirm authenticity.
            </p>
          </div>
          <VerifyWidget />
        </Reveal>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-20 px-4 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto">
          <Reveal>
          <h2
            className="font-heading text-2xl sm:text-3xl text-ink text-center mb-10 sm:mb-14"
            style={{ textWrap: 'balance' }}
          >
            From transaction to verified record
          </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { n: '1', title: 'Enter Details',   desc: 'Create an account using your email address and password, then provide your customer information and transaction details to get started.', delay: 0 },
              { n: '2', title: 'Generate',         desc: 'Add the transaction details and line items. A tamper-proof digital receipt with a unique identifier and QR code is generated instantly.', delay: 80 },
              { n: '3', title: 'Verify',           desc: 'Share the receipt with your customer. Verify by scanning the QR code with any mobile device or by entering the unique identifier on DigitalReceipt.ng. No account required.', delay: 160 },
            ].map(({ n, title, desc, delay }) => (
              <Reveal key={title} delay={delay}>
                <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 flex flex-col gap-4 hover:border-forest/40 hover:shadow-md transition-all h-full">
                  <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white leading-none">{n}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading text-xl sm:text-2xl text-ink" style={{ textWrap: 'balance' }}>{title}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 px-4 bg-white border-b border-border">
        <Reveal className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 text-center divide-x divide-border">
          {[
            { value: '12,000+',    label: 'Receipts Generated' },
            { value: '4,800+',     label: 'Verified Issuers' },
            { value: '36 States',  label: 'Across Nigeria' },
            { value: '100%',       label: 'Tamper-Proof Records' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 px-4 sm:px-8 py-2">
              <span className="block w-6 h-0.5 bg-forest mb-2 rounded-full" />
              <p className="font-heading text-2xl sm:text-4xl text-ink leading-none whitespace-nowrap">{value}</p>
              <p className="text-xs sm:text-sm text-ink-muted">{label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 bg-surface border-y border-border overflow-hidden">
        <Reveal className="text-center mb-8 sm:mb-10 px-4">
          <h2 className="font-heading text-2xl sm:text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Trusted by Nigerians
          </h2>
          <p className="text-sm text-ink-muted mt-2">What issuers and customers are saying</p>
        </Reveal>
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee-slow whitespace-nowrap">
            {[...REVIEWS_ROW1, ...REVIEWS_ROW1].map((r, i) => (
              <ReviewCard key={i} {...r} />
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse-slow whitespace-nowrap">
            {[...REVIEWS_ROW2, ...REVIEWS_ROW2].map((r, i) => (
              <ReviewCard key={i} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-12 sm:py-16 px-4 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-heading text-2xl sm:text-3xl text-ink text-center mb-8 sm:mb-10"
            style={{ textWrap: 'balance' }}
          >
            Built for every Nigerian issuer
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {['Schools', 'Hospitals & Clinics', 'Landlords', 'Freelancers', 'Retailers & SMEs', 'Government Agencies'].map(who => (
              <div
                key={who}
                className="bg-surface border border-border rounded-xl px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-medium text-ink-muted text-center hover:-translate-y-0.5 hover:shadow-md hover:border-forest/50 hover:text-forest hover:bg-forest-light"
                style={{ transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              >
                {who}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner logos */}
      <section className="py-10 sm:py-14 bg-white border-b border-border overflow-hidden">
        <div className="text-center mb-6 sm:mb-8 px-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-ink-muted">Trusted by businesses across Nigeria</p>
        </div>
        <div className="relative flex gap-6 animate-marquee whitespace-nowrap">
          {[...partnerLogos, ...partnerLogos].map((logo, i) => (
            <div key={i} className="inline-flex items-center justify-center shrink-0 h-20 w-40 bg-white rounded-xl border border-border shadow-sm p-3">
              <Image src={logo.src} alt={logo.alt} width={144} height={72} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface py-14 sm:py-20 px-4">
        <Reveal className="max-w-xl mx-auto text-center space-y-5 sm:space-y-6">
          <h2 className="font-heading text-3xl sm:text-4xl text-ink" style={{ textWrap: 'balance' }}>
            Start issuing verified receipts today
          </h2>
          <p className="text-sm sm:text-base text-ink-muted">
            DigitalReceipt.ng is free for individuals and businesses. Every account includes 5 free receipts per month, and you can increase your receipt limit whenever you need more.
          </p>
          <Link
            href="/dashboard/receipts/new"
            className="inline-block px-7 sm:px-8 py-3.5 sm:py-4 text-white font-semibold rounded-xl text-sm bg-forest hover:bg-forest-bright transition-all"
            style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
          >
            Generate your first receipt
          </Link>
        </Reveal>
      </section>
    </div>
  )
}
