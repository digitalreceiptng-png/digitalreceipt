'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import VerifyWidget from '@/app/(public)/VerifyWidget'
import Reveal from '@/components/Reveal'
import { ArrowRight, CheckCircle } from 'lucide-react'

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
      <section className="relative w-full min-h-[88vh] overflow-hidden flex items-center bg-white">
        {/* Image panel: right 62% of section. Internal gradient hides the D logo, reveals phone. */}
        <div className="absolute top-0 bottom-0 right-0 w-[62%]">
          <div className="relative w-full h-full">
            <Image
              src="/realhero.png"
              alt=""
              fill
              priority
              unoptimized
              className="object-contain"
              style={{ objectPosition: 'right center' }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to right, white 0%, white 44%, rgba(255,255,255,0.55) 60%, transparent 72%)' }}
            />
          </div>
        </div>

        {/* Text content — LEFT side, dark colors on white background */}
        <div className="relative z-10 w-full py-24 sm:py-28">
          <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16">
            <div className="max-w-[460px] flex flex-col gap-6">
              <span
                className="self-start text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-full border"
                style={{ background: 'oklch(0.97 0.015 145)', color: 'oklch(0.27 0.105 145)', borderColor: 'oklch(0.85 0.06 145)' }}
              >
                Nigeria&apos;s First Verifiable Digital Receipt Platform
              </span>
              <h1
                className="font-heading text-5xl lg:text-[3.75rem] text-ink font-extrabold leading-[1.04]"
                style={{ textWrap: 'balance' }}
              >
                Issue a Verifiable Digital Receipt{' '}
                <span style={{ color: 'oklch(0.42 0.18 145)' }}>in Seconds</span>
              </h1>
              <p
                className="text-base sm:text-lg text-ink-muted leading-relaxed"
                style={{ textWrap: 'pretty' }}
              >
                Authenticated digital receipts with unique identifiers. Customers, auditors, and regulators can confirm authenticity instantly; no account required.
              </p>
              <div className="flex flex-row flex-wrap gap-3 pt-2">
                <Link
                  href="/generate"
                  className="px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-forest hover:bg-forest-bright transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: '0 2px 12px oklch(0.42 0.18 145 / 0.28)' }}
                >
                  Generate a receipt, free
                </Link>
                <Link
                  href="/auth/login"
                  className="px-7 py-3.5 rounded-xl font-bold text-sm border-2 text-ink hover:bg-ink/5 transition-colors"
                  style={{ borderColor: 'oklch(0.82 0.02 145)' }}
                >
                  Manage Receipts
                </Link>
                <Link
                  href="/free-invoice"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm transition-colors hover:bg-forest/5"
                  style={{ border: '2px solid oklch(0.62 0.18 145)', color: 'oklch(0.42 0.18 145)' }}
                >
                  Free Invoice
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verify — 2-column: context left, widget right */}
      <section className="py-20 sm:py-28 px-6 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">
          <Reveal>
            <div className="space-y-5">
              <h2 className="font-heading text-3xl sm:text-4xl text-ink" style={{ textWrap: 'balance' }}>
                Verify a receipt
              </h2>
              <p className="text-base text-ink-muted leading-relaxed" style={{ textWrap: 'pretty' }}>
                Every receipt issued on DigitalReceipt.ng carries a unique identifier. Enter it below to confirm the receipt is authentic and unmodified.
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  'No account needed to verify',
                  'Instant tamper detection',
                  'Works with QR codes and receipt numbers',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink">
                    <CheckCircle className="text-forest shrink-0 mt-0.5" size={15} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <VerifyWidget />
          </Reveal>
        </div>
      </section>

      {/* How it works — editorial numbered flow, no card grid */}
      <section className="py-20 sm:py-28 px-6 bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-20">
              <h2
                className="font-heading text-3xl sm:text-4xl text-ink leading-tight"
                style={{ textWrap: 'balance' }}
              >
                From transaction to<br className="hidden sm:block" />verified record
              </h2>
              <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-forest hover:underline shrink-0">
                See the full guide <ArrowRight size={13} />
              </Link>
            </div>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Horizontal connector line — visible on md+ */}
            <div className="absolute top-4 left-8 right-8 h-px bg-border hidden md:block" />

            {[
              { n: '01', title: 'Enter Details',  desc: 'Create an account, then enter your customer information and transaction details.', delay: 0 },
              { n: '02', title: 'Generate',        desc: 'Add line items and amounts. A tamper-proof receipt with a unique identifier and QR code is generated instantly.', delay: 80 },
              { n: '03', title: 'Verify',          desc: 'Share with your customer. They verify by scanning the QR code or entering the receipt number. No account required.', delay: 160 },
            ].map(({ n, title, desc, delay }) => (
              <Reveal key={n} delay={delay}>
                <div className="flex flex-col gap-5 md:gap-7">
                  <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-forest/25 flex items-center justify-center shadow-sm shrink-0">
                    <span className="text-[10px] font-bold text-forest">{n}</span>
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl sm:text-3xl text-ink mb-2.5">{title}</h3>
                    <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — large editorial numbers, generous spacing */}
      <section className="py-16 sm:py-20 px-6 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-14">
            {[
              { value: '12,000+',   label: 'Receipts Generated' },
              { value: '4,800+',    label: 'Verified Issuers' },
              { value: '36 States', label: 'Across Nigeria' },
              { value: '100%',      label: 'Tamper-Proof Records' },
            ].map(({ value, label }, i) => (
              <Reveal key={label} delay={i * 60}>
                <div className="space-y-2">
                  <span className="block w-6 h-0.5 bg-forest rounded-full" />
                  <p className="font-heading text-4xl sm:text-5xl text-ink leading-none whitespace-nowrap pt-2">{value}</p>
                  <p className="text-xs sm:text-sm text-ink-muted">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 sm:py-20 bg-surface border-y border-border overflow-hidden">
        <Reveal className="text-center mb-10 sm:mb-14 px-4">
          <h2 className="font-heading text-3xl sm:text-4xl text-ink" style={{ textWrap: 'balance' }}>
            Trusted by Nigerians
          </h2>
          <p className="text-sm text-ink-muted mt-2">What issuers and customers are saying</p>
        </Reveal>
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee-slow whitespace-nowrap">
            {[...REVIEWS_ROW1, ...REVIEWS_ROW1].map((r, i) => <ReviewCard key={i} {...r} />)}
          </div>
        </div>
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse-slow whitespace-nowrap">
            {[...REVIEWS_ROW2, ...REVIEWS_ROW2].map((r, i) => <ReviewCard key={i} {...r} />)}
          </div>
        </div>
      </section>

      {/* Who it's for — asymmetric 2-col: text left, enriched grid right */}
      <section className="py-20 sm:py-28 px-6 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-14 lg:gap-20 items-start">
          <Reveal>
            <div className="lg:sticky lg:top-28 space-y-4">
              <h2 className="font-heading text-3xl sm:text-4xl text-ink" style={{ textWrap: 'balance' }}>
                Built for every Nigerian issuer
              </h2>
              <p className="text-base text-ink-muted leading-relaxed" style={{ textWrap: 'pretty' }}>
                From sole proprietors to large organisations, DigitalReceipt.ng works for anyone who issues receipts and wants their customers to trust them.
              </p>
              <div className="pt-4">
                <Link href="/generate" className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline">
                  Get started free <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { who: 'Schools',              desc: 'Fee collection receipts and payment acknowledgements' },
              { who: 'Hospitals & Clinics',  desc: 'Consultation fees and medication payments' },
              { who: 'Landlords',            desc: 'Rent receipts that prevent payment disputes' },
              { who: 'Freelancers',          desc: 'Professional invoicing and service receipts' },
              { who: 'Retailers & SMEs',     desc: 'Sales receipts for every transaction' },
              { who: 'Government Agencies',  desc: 'Revenue collection with full accountability' },
            ].map(({ who, desc }, i) => (
              <Reveal key={who} delay={i * 40}>
                <div
                  className="bg-surface border border-border rounded-xl p-4 sm:p-5 hover:border-forest/40 hover:shadow-sm transition-all"
                  style={{ transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  <p className="text-sm font-semibold text-ink">{who}</p>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
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
      <section className="bg-surface py-20 sm:py-28 px-6">
        <Reveal className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="font-heading text-4xl sm:text-5xl text-ink" style={{ textWrap: 'balance' }}>
            Start issuing verified receipts today
          </h2>
          <p className="text-base text-ink-muted leading-relaxed max-w-lg mx-auto">
            DigitalReceipt.ng is free for individuals and businesses. Every account includes 5 free receipts per month, and you can increase your limit whenever you need more.
          </p>
          <div className="pt-2">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-semibold rounded-xl text-sm bg-forest hover:bg-forest-bright transition-all"
              style={{ boxShadow: '0 2px 12px oklch(0.42 0.18 145 / 0.25)' }}
            >
              Generate your first receipt
              <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>

    </div>
  )
}
