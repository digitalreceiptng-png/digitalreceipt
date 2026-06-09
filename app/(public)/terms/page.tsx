import Image from 'next/image'

export const metadata = { title: 'Terms & Conditions | DigitalReceipt.ng' }

export default function TermsPage() {
  return (
    <div className="bg-white">
      <section className="py-14 sm:py-20 px-4" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-3xl mx-auto">
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={100} height={100} className="object-contain mb-4" />
          <p className="text-xs font-bold tracking-widest uppercase text-forest mb-3">Legal</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-ink mb-4">Terms &amp; Conditions</h1>
          <p className="text-sm text-ink-muted">Last updated: June 2026</p>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto prose prose-sm prose-slate">
          <div className="space-y-10 text-sm text-ink-muted leading-relaxed">

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using DigitalReceipt.ng ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">2. Description of Service</h2>
              <p>DigitalReceipt.ng provides a digital receipt generation and verification service for individuals and businesses in Nigeria. Users can create identity-linked receipts with unique identifiers that can be independently verified by any third party.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">3. Account Registration</h2>
              <p>To generate receipts, you must create an account and verify your identity using a valid National Identification Number (NIN) for individuals, or a CAC registration number for businesses. You are responsible for maintaining the confidentiality of your account credentials.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">4. Acceptable Use</h2>
              <p>You agree not to use the Platform to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Issue fraudulent, false, or misleading receipts</li>
                <li>Impersonate any person or organisation</li>
                <li>Circumvent identity verification requirements</li>
                <li>Engage in any activity that violates Nigerian law</li>
                <li>Attempt to reverse-engineer, scrape, or disrupt the Platform</li>
              </ul>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">5. Identity Verification</h2>
              <p>NIN and CAC data is verified through licensed third-party identity providers. We store only the minimum data required for receipt attribution. We do not sell your identity data to third parties.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">6. Receipt Immutability</h2>
              <p>Once a receipt is generated, its core transaction data (amount, date, parties) cannot be altered. Any modification to a downloaded PDF will cause verification to fail, demonstrating tampering. This is a feature, not a limitation.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">7. Liability</h2>
              <p>DigitalReceipt.ng is a platform service. We are not responsible for the accuracy of transaction details entered by users, disputes between customers and sellers, or any loss arising from misuse of the Platform.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">8. Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or damage the integrity of the verification system.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">9. Changes to Terms</h2>
              <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
            </article>

            <article>
              <h2 className="font-heading text-xl text-ink mb-3">10. Governing Law</h2>
              <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the jurisdiction of Nigerian courts.</p>
            </article>

          </div>
        </div>
      </section>

      {/* Privacy Policy */}
      <section className="py-12 sm:py-16 px-4 border-t border-border" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-forest mb-3">Legal</p>
          <h2 className="font-heading text-3xl sm:text-4xl text-ink mb-2">Privacy Policy</h2>
          <p className="text-sm text-ink-muted mb-10">Last updated: June 2026</p>

          <div className="space-y-10 text-sm text-ink-muted leading-relaxed">

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">1. Information We Collect</h3>
              <p>We collect the information you provide during registration (name, email, phone, NIN or CAC number) and the transaction details you enter when generating receipts. We also collect standard usage data such as IP addresses and browser type for security purposes.</p>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">2. How We Use Your Information</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>To verify your identity and link it to receipts you issue</li>
                <li>To enable customers and third parties to verify receipt authenticity</li>
                <li>To maintain the integrity of the verification database</li>
                <li>To respond to support requests</li>
                <li>To comply with applicable Nigerian law and regulations</li>
              </ul>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">3. Data Sharing</h3>
              <p>We do not sell your personal data. We share identity data only with our licensed verification partner (QoreID) to validate NIN and CAC numbers. Receipt data (seller name, customer name, transaction details) is publicly accessible via the verification URL to enable verification by any party.</p>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">4. Data Security</h3>
              <p>All data is stored on Supabase infrastructure with encryption at rest and in transit. Access to sensitive fields is restricted to authenticated users and administrative processes.</p>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">5. Data Retention</h3>
              <p>Receipt records are retained indefinitely to preserve the verifiability of historical transactions. You may request deletion of your account data; however, anonymised receipt records may be retained to maintain verification integrity.</p>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">6. Your Rights</h3>
              <p>You have the right to access, correct, or request deletion of your personal data. Contact us at <a href="mailto:info@digitalreceipt.ng" className="text-forest hover:underline">info@digitalreceipt.ng</a>.</p>
            </article>

            <article>
              <h3 className="font-heading text-xl text-ink mb-3">7. Contact</h3>
              <p>For privacy-related enquiries, email <a href="mailto:info@digitalreceipt.ng" className="text-forest hover:underline">info@digitalreceipt.ng</a>.</p>
            </article>

          </div>
        </div>
      </section>
    </div>
  )
}
