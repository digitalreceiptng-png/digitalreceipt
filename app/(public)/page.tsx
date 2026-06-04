import Link from 'next/link'
import VerifyWidget from './VerifyWidget'

export default function LandingPage() {
  return (
    <div>
      {/* Hero — video background with overlay */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-forest">
        {/* Background video */}
        <video
          src="/hero-vid.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0" style={{ background: 'oklch(0.17 0.060 145 / 0.72)' }} />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center px-4 space-y-7 py-24">
          <p className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full" style={{ background: 'white', color: 'oklch(0.27 0.105 145)' }}>
            Nigeria&apos;s First Verifiable Digital Receipt Platform
          </p>
          <h1
            className="font-heading text-4xl sm:text-6xl text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Issue a verifiable digital receipt{' '}
            <span style={{ color: 'oklch(0.55 0.16 145)' }}>in seconds</span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            Authenticated digital receipts with unique identifiers — buyers, auditors, and regulators can confirm authenticity in seconds, no account required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/generate"
              className="px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-colors"
              style={{ background: 'oklch(0.34 0.125 145)' }}
            >
              Generate a Receipt — Free
            </Link>
            <Link
              href="/auth/login"
              className="px-7 py-3.5 border border-white/30 text-white/80 rounded-xl font-medium text-sm hover:border-white/60 hover:text-white transition-colors"
            >
              Manage Receipts
            </Link>
          </div>
        </div>
      </section>

      {/* Inline verify widget */}
      <section className="py-14 px-4 bg-white border-b border-border">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl text-ink">Verify a receipt now</h2>
            <p className="text-sm text-ink-muted">Enter a receipt number or unique identifier to confirm authenticity.</p>
          </div>
          <VerifyWidget />
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2
            className="font-heading text-3xl text-ink text-center mb-12"
            style={{ textWrap: 'balance' }}
          >
            From transaction to verified record
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Enter details',
                desc: 'Provide your email, buyer info, and items. Your email becomes your account — no password, no sign-up form.',
              },
              {
                title: 'Generate',
                desc: 'Fill in transaction details and line items. A tamper-proof receipt with a unique identifier is issued instantly.',
              },
              {
                title: 'Verify',
                desc: 'Share the receipt link or identifier. Anyone can verify it at DigitalReceipt.ng — no account, no friction.',
              },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="bg-white border border-border rounded-2xl p-6 pt-5"
                style={{ borderTop: '2px solid oklch(0.27 0.105 145)' }}
              >
                <h3 className="font-heading text-xl text-ink mb-2">{title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-forest">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '12,000+', label: 'Receipts Generated' },
            { value: '4,800+', label: 'Verified Issuers' },
            { value: '36 States', label: 'Across Nigeria' },
            { value: '100%', label: 'Tamper-Proof Records' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-heading text-4xl text-white mb-1">{value}</p>
              <p className="text-sm text-white/55">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-surface border-y border-border overflow-hidden">
        <div className="text-center mb-10 px-4">
          <h2 className="font-heading text-3xl text-ink">Trusted by Nigerians</h2>
          <p className="text-sm text-ink-muted mt-2">What issuers and buyers are saying</p>
        </div>

        {/* Row 1 — scrolls left */}
        <div className="relative mb-4">
          <div className="flex gap-4 animate-marquee whitespace-nowrap">
            {[...REVIEWS_ROW1, ...REVIEWS_ROW1].map((r, i) => (
              <ReviewCard key={i} {...r} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse whitespace-nowrap">
            {[...REVIEWS_ROW2, ...REVIEWS_ROW2].map((r, i) => (
              <ReviewCard key={i} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 bg-white border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl text-ink text-center mb-10">
            Built for every Nigerian issuer
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              'Schools',
              'Hospitals & Clinics',
              'Landlords',
              'Freelancers',
              'Retailers & SMEs',
              'Government Agencies',
            ].map(who => (
              <div
                key={who}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-ink-muted text-center hover:border-forest/40 hover:text-forest hover:bg-forest-light transition-colors"
              >
                {who}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — forest again */}
      <section className="bg-forest py-20 px-4">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2
            className="font-heading text-3xl text-white"
            style={{ textWrap: 'balance' }}
          >
            Start issuing verified receipts today
          </h2>
          <p className="text-white/65">Free for individuals and businesses. 10 receipts per month at no cost.</p>
          <Link
            href="/generate"
            className="inline-block px-8 py-4 text-white font-semibold rounded-xl text-sm transition-colors"
            style={{ background: 'oklch(0.34 0.125 145)' }}
          >
            Generate your first receipt
          </Link>
        </div>
      </section>
    </div>
  )
}

const REVIEWS_ROW1 = [
  { name: 'Emeka Okonkwo', role: 'Freelance Electrician, Lagos', text: 'Before DigitalReceipt.ng I was writing paper receipts that customers would lose. Now I send a link and they can verify anytime.' },
  { name: 'Aisha Bello', role: 'Fashion Designer, Abuja', text: 'My clients trust me more now. When they see a verified receipt with my trading name, they know it\'s legitimate.' },
  { name: 'Chukwudi Eze', role: 'Private Lesson Teacher, Enugu', text: 'Parents used to question if their children\'s fees were actually paid to me. This platform solved that completely.' },
  { name: 'Fatima Yusuf', role: 'Landlord, Kano', text: 'I manage 6 properties and used to have disputes about rent payments. Now every tenant gets a digital receipt they can verify.' },
  { name: 'Tunde Adeyemi', role: 'Auto Parts Dealer, Ibadan', text: 'My shop looks more professional. Customers walk in, buy parts, and get a receipt they can show their mechanic for warranty claims.' },
]

const REVIEWS_ROW2 = [
  { name: 'Dr. Ngozi Obi', role: 'Private Clinic Owner, Port Harcourt', text: 'Patient records and payments used to be a mess. Now every consultation fee has a verifiable receipt. Disputes have dropped to zero.' },
  { name: 'Bode Fashola', role: 'Event Planner, Lagos', text: 'I collect deposits from clients months before events. The verified receipt gives them peace of mind that their money is safe with me.' },
  { name: 'Hauwa Musa', role: 'Provision Store Owner, Kaduna', text: 'Even small transactions matter. My customers appreciate that I give digital receipts — it sets me apart from competitors.' },
  { name: 'Seun Adebayo', role: 'IT Consultant, Lagos', text: 'As someone who invoices multiple clients, having NIN-verified receipts adds a layer of professionalism and legal protection.' },
  { name: 'Amaka Nwosu', role: 'Catering Business, Anambra', text: 'My corporate clients require receipts for reimbursement. DigitalReceipt.ng makes the process fast and the receipts are always accepted.' },
]

function ReviewCard({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <div className="inline-block w-80 align-top whitespace-normal bg-white border border-border rounded-2xl px-5 py-4 mx-2 shrink-0">
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-3.5 h-3.5 text-forest" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
      <div>
        <p className="text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-ink-dim">{role}</p>
      </div>
    </div>
  )
}
