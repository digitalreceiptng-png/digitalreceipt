import Link from 'next/link'
import VerifyWidget from './VerifyWidget'

export default function LandingPage() {
  return (
    <div className="bg-bg">
      {/* Hero */}
      <section className="py-24 px-4 border-b border-border">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <p className="text-sm text-gold-muted font-medium tracking-widest uppercase">
            Nigeria&apos;s Receipt Verification Infrastructure
          </p>
          <h1 className="font-heading text-4xl sm:text-6xl text-ink leading-tight" style={{ textWrap: 'balance' }}>
            Issue receipts that anyone can{' '}
            <span className="text-gold">verify independently</span>
          </h1>
          <p className="text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            Authenticated digital receipts with unique identifiers — buyers, auditors, and regulators can confirm authenticity in seconds, no account required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/auth/register"
              className="px-7 py-3.5 bg-gold text-bg rounded-xl font-semibold text-sm hover:bg-gold-bright transition-colors"
            >
              Generate a Receipt — Free
            </Link>
            <Link
              href="/verify"
              className="px-7 py-3.5 border border-border-bright text-ink-muted rounded-xl font-medium text-sm hover:border-gold/50 hover:text-gold transition-colors"
            >
              Verify a Receipt
            </Link>
          </div>
        </div>
      </section>

      {/* Inline verify widget */}
      <section className="py-14 px-4 border-b border-border">
        <div className="max-w-xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl text-ink">Verify a receipt now</h2>
            <p className="text-sm text-ink-muted">Enter a receipt number or unique identifier to confirm authenticity.</p>
          </div>
          <VerifyWidget />
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl text-ink text-center mb-12" style={{ textWrap: 'balance' }}>
            From transaction to verified record
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Register',
                desc: 'Create a free account as an individual or business. Provide your NIN or CAC number for added credibility.',
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
                className="bg-surface border border-border rounded-2xl p-6 pt-5 border-t-2"
                style={{ borderTopColor: 'oklch(0.78 0.11 82 / 0.6)' }}
              >
                <h3 className="font-heading text-xl text-ink mb-2">{title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 border-b border-border">
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
                className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-medium text-ink-muted text-center hover:border-gold/40 hover:text-ink transition-colors"
              >
                {who}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="font-heading text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Start issuing{' '}
            <span className="text-gold">verified receipts</span>{' '}
            today
          </h2>
          <p className="text-ink-muted">Free for individuals and businesses. 10 receipts per month at no cost.</p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-4 bg-gold text-bg font-semibold rounded-xl text-sm hover:bg-gold-bright transition-colors"
          >
            Create your free account
          </Link>
        </div>
      </section>
    </div>
  )
}
