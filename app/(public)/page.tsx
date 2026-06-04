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
          <p className="text-sm text-white/50 font-medium tracking-widest uppercase">
            Nigeria&apos;s First Verifiable Digital Receipt Platform
          </p>
          <h1
            className="font-heading text-4xl sm:text-6xl text-white leading-tight"
            style={{ textWrap: 'balance' }}
          >
            Issue receipts that anyone can{' '}
            <span className="text-forest-bright" style={{ color: 'oklch(0.55 0.16 145)' }}>verify independently</span>
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
              href="/verify"
              className="px-7 py-3.5 border border-white/30 text-white/80 rounded-xl font-medium text-sm hover:border-white/60 hover:text-white transition-colors"
            >
              Verify a Receipt
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
            className="inline-block px-8 py-4 bg-gold text-ink font-semibold rounded-xl text-sm hover:bg-gold-bright transition-colors"
          >
            Generate your first receipt
          </Link>
        </div>
      </section>
    </div>
  )
}
