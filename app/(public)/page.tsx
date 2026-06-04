import Link from 'next/link'
import VerifyWidget from './VerifyWidget'

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-[#f4faf6] border-b border-[#e0ede5] py-20 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-block bg-[#1a6b2f]/10 text-[#1a6b2f] text-sm font-medium px-4 py-1.5 rounded-full border border-[#1a6b2f]/20">
            Nigeria's Receipt Verification Infrastructure
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl text-[#0f1f13] leading-tight">
            Generate tamper-proof receipts anyone can verify
          </h1>
          <p className="text-lg text-[#4a6b55] max-w-xl mx-auto">
            Issue authenticated digital receipts in seconds. Every receipt has a unique ID that buyers, auditors, or regulators can verify instantly — no login required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-[#1a6b2f] text-white rounded-xl font-medium text-sm hover:bg-[#155a27] transition-colors"
            >
              Generate a Receipt — Free
            </Link>
            <Link
              href="/verify"
              className="px-6 py-3 border border-[#1a6b2f] text-[#1a6b2f] rounded-xl font-medium text-sm hover:bg-[#f4faf6] transition-colors"
            >
              Verify a Receipt
            </Link>
          </div>
        </div>
      </section>

      {/* Inline verify widget */}
      <section className="py-14 px-4 bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-heading text-2xl text-[#0f1f13]">Verify a receipt right now</h2>
          <p className="text-sm text-[#4a6b55]">Enter a receipt number or unique identifier to check its authenticity.</p>
          <VerifyWidget />
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-[#f4faf6]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl text-[#0f1f13] text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Register', desc: 'Create a free account as an individual or business. Provide your NIN or RC Number for credibility.' },
              { step: '02', title: 'Generate', desc: 'Fill in transaction details and line items. A unique, verifiable receipt is generated instantly.' },
              { step: '03', title: 'Verify', desc: 'Share the receipt link or identifier. Anyone can verify it at digitalreceipt.ng/verify — no account needed.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-2xl border border-[#e0ede5] p-6">
                <span className="font-heading text-4xl text-[#2ecc5f] opacity-60">{step}</span>
                <h3 className="font-heading text-xl text-[#0f1f13] mt-2 mb-2">{title}</h3>
                <p className="text-sm text-[#4a6b55] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl text-[#0f1f13] text-center mb-10">Built for every Nigerian issuer</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {['Schools', 'Hospitals & Clinics', 'Landlords', 'Freelancers', 'Retailers & SMEs', 'Government Agencies'].map(who => (
              <div key={who} className="bg-[#f4faf6] border border-[#e0ede5] rounded-xl px-4 py-3 text-sm font-medium text-[#0f1f13] text-center">
                {who}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1a6b2f]">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-heading text-3xl text-white">Start issuing verified receipts today</h2>
          <p className="text-[#a8d5b5]">Free for individuals and businesses. 10 receipts per month at no cost.</p>
          <Link
            href="/auth/register"
            className="inline-block px-7 py-3 bg-[#2ecc5f] text-[#0f1f13] font-semibold rounded-xl text-sm hover:bg-[#25b351] transition-colors"
          >
            Create your free account
          </Link>
        </div>
      </section>
    </div>
  )
}
