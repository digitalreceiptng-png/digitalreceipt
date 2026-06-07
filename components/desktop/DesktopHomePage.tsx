import Link from 'next/link'
import Image from 'next/image'
import VerifyWidget from '@/app/(public)/VerifyWidget'

const PARTNER_LOGOS = [
  { src: '/Partners%20Logos/Computer%20service%20PNG%203.png',    alt: 'Computer Service' },
  { src: '/Partners%20Logos/Deallock%20logo.jpg.jpeg',            alt: 'Deallock' },
  { src: '/Partners%20Logos/Gotref%20Logo.png',                   alt: 'Gotref' },
  { src: '/Partners%20Logos/Idcode%20logo%202.JPG.jpeg',          alt: 'Idcode' },
  { src: '/Partners%20Logos/SUBMITAR%20A.png',                    alt: 'Submitar' },
  { src: '/Partners%20Logos/Scancodes%20logo.JPG.jpg.jpeg',       alt: 'Scancodes' },
  { src: '/Partners%20Logos/VOLUWORK%20NEW%20LOGO.png',           alt: 'Voluwork' },
  { src: '/Partners%20Logos/portrait%20Vassetlogo.png',           alt: 'Vasset' },
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
        <p className="text-xs text-ink-dim mt-0.5">{role}</p>
      </div>
    </div>
  )
}

export default function DesktopHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative w-full min-h-[85vh] overflow-hidden flex items-center">
        <Image
          src="/hero-image.png"
          alt="Seller handing over a product to a buyer"
          fill
          className="object-cover object-center"
          quality={100}
          sizes="100vw"
          priority
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, transparent 28%, oklch(0.22 0.105 145 / 0.45) 48%, oklch(0.22 0.105 145 / 0.88) 68%)' }}
        />
        <div className="relative z-10 w-full flex items-center py-20 sm:py-28">
          <div className="w-[40%] shrink-0 hidden lg:block" />
          <div className="flex flex-col items-start gap-5 sm:gap-6 w-full max-w-xl px-6 sm:px-10 lg:px-0 lg:pr-16">
            <p
              className="inline-block text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full"
              style={{ background: 'white', color: 'oklch(0.27 0.105 145)' }}
            >
              Nigeria&apos;s First Verifiable Digital Receipt Platform
            </p>
            <h1
              className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white font-extrabold leading-tight drop-shadow-lg"
              style={{ textWrap: 'balance', textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
            >
              Issue a Verifiable Digital Receipt{' '}
              <span style={{ color: 'oklch(0.8 0.22 145)' }}>in Seconds</span>
            </h1>
            <p
              className="text-base sm:text-lg text-white font-medium leading-relaxed drop-shadow-md"
              style={{ textWrap: 'pretty', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
            >
              Authenticated digital receipts with unique identifiers. Buyers, auditors, and regulators can confirm authenticity instantly; no account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/generate"
                className="px-7 py-3.5 rounded-xl font-bold text-sm transition-colors hover:bg-white/90"
                style={{ background: 'white', color: 'oklch(0.27 0.105 145)' }}
              >
                Generate a receipt, free
              </Link>
              <Link
                href="/auth/login"
                className="px-7 py-3.5 rounded-xl font-bold text-sm bg-white/10 border-2 border-white text-white hover:bg-white/20 transition-colors"
              >
                Manage Receipts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verify */}
      <section className="py-12 sm:py-16 px-4 bg-white border-b border-border">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl text-ink" style={{ textWrap: 'balance' }}>
              Verify a receipt
            </h2>
            <p className="text-sm text-ink-muted">
              Enter a receipt number or unique identifier to confirm authenticity.
            </p>
          </div>
          <VerifyWidget />
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-20 px-4 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-heading text-2xl sm:text-3xl text-ink text-center mb-10 sm:mb-14"
            style={{ textWrap: 'balance' }}
          >
            From transaction to verified record
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { n: '1', title: 'Enter details',   desc: 'Provide your email, buyer info, and items. Your email becomes your account; no password, no sign-up form.' },
              { n: '2', title: 'Generate',         desc: 'Fill in transaction details and line items. A tamper-proof receipt with a unique identifier is issued instantly.' },
              { n: '3', title: 'Verify',           desc: 'Share the receipt link or identifier. Anyone can confirm it at DigitalReceipt.ng; no account required.' },
            ].map(({ n, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-border rounded-2xl p-5 sm:p-7 flex flex-col gap-4 hover:border-forest/30 hover:shadow-sm transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-forest flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white leading-none">{n}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading text-xl sm:text-2xl text-ink" style={{ textWrap: 'balance' }}>{title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 px-4 bg-gray-300">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 text-center">
          {[
            { value: '12,000+',    label: 'Receipts Generated' },
            { value: '4,800+',     label: 'Verified Issuers' },
            { value: '36 States',  label: 'Across Nigeria' },
            { value: '100%',       label: 'Tamper-Proof Records' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-heading text-3xl sm:text-5xl text-ink mb-1.5 leading-none">{value}</p>
              <p className="text-xs sm:text-sm text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 bg-surface border-y border-border overflow-hidden">
        <div className="text-center mb-8 sm:mb-10 px-4">
          <h2 className="font-heading text-2xl sm:text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Trusted by Nigerians
          </h2>
          <p className="text-sm text-ink-muted mt-2">What issuers and buyers are saying</p>
        </div>
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee whitespace-nowrap">
            {[...REVIEWS_ROW1, ...REVIEWS_ROW1].map((r, i) => (
              <ReviewCard key={i} {...r} />
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse whitespace-nowrap">
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
                className="bg-surface border border-border rounded-xl px-4 py-3.5 sm:py-4 text-xs sm:text-sm font-medium text-ink-muted text-center hover:border-forest/40 hover:text-forest hover:bg-forest-light transition-colors"
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
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, i) => (
            <div key={i} className="inline-flex items-center justify-center shrink-0 h-20 w-40 bg-white rounded-xl border border-border shadow-sm p-3">
              <Image src={logo.src} alt={logo.alt} width={144} height={72} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-forest py-14 sm:py-20 px-4">
        <div className="max-w-xl mx-auto text-center space-y-5 sm:space-y-6">
          <h2 className="font-heading text-3xl sm:text-4xl text-white" style={{ textWrap: 'balance' }}>
            Start issuing verified receipts today
          </h2>
          <p className="text-sm sm:text-base text-white/65">
            Free for individuals and businesses. 10 receipts per month at no cost.
          </p>
          <Link
            href="/generate"
            className="inline-block px-7 sm:px-8 py-3.5 sm:py-4 text-white font-semibold rounded-xl text-sm transition-colors"
            style={{ background: 'oklch(0.34 0.125 145)' }}
          >
            Generate your first receipt
          </Link>
        </div>
      </section>
    </div>
  )
}
