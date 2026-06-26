import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, QrCode, Smartphone, FileText, BadgeCheck, Search } from 'lucide-react'

export const metadata = { title: 'How It Works | DigitalReceipt.ng' }

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Create your account',
    description: 'Sign up as an individual or business. Verify your identity with your NIN or CAC registration number so every receipt you issue is linked to a verified identity.',
  },
  {
    number: '02',
    icon: FileText,
    title: 'Fill in the receipt details',
    description: 'Enter the customer\'s information, items purchased, amounts, payment method, and any reference numbers. The form is fast and mobile-friendly.',
  },
  {
    number: '03',
    icon: QrCode,
    title: 'Generate a verified receipt',
    description: 'Your receipt is saved to our database and assigned a unique identifier plus a QR code. You can download it as a PDF or share the link directly.',
  },
  {
    number: '04',
    icon: Smartphone,
    title: 'Customer receives the receipt',
    description: 'Send the PDF or link to your customer via WhatsApp, SMS, email, or any channel. The receipt carries your verified identity and transaction record.',
  },
  {
    number: '05',
    icon: Search,
    title: 'Anyone can verify it',
    description: 'The customer, an auditor, or any third party can scan the QR code or visit digitalreceipt.ng/verify and enter the receipt number to confirm it is authentic.',
  },
  {
    number: '06',
    icon: BadgeCheck,
    title: 'Tamper-proof record',
    description: 'Every receipt is stored immutably. If anyone alters the PDF, verification will fail, proving the document is fake. Your original is always on record.',
  },
]

const useCases = [
  { title: 'Schools & Tutors', detail: 'Issue fee receipts that parents can verify at any time.' },
  { title: 'Landlords', detail: 'Provide rent receipts tenants can present to banks or courts.' },
  { title: 'Hospitals & Clinics', detail: 'Patients get verified payment records for insurance claims.' },
  { title: 'Market Traders', detail: 'Issue receipts for high-value goods to prevent disputes.' },
  { title: 'Freelancers', detail: 'Professional receipts tied to your NIN build client trust.' },
  { title: 'SMEs & Businesses', detail: 'CAC-verified receipts for B2B transactions and audits.' },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 text-center" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-2xl mx-auto space-y-5">
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={120} height={120} className="object-contain mx-auto" />
          <p className="text-xs font-bold tracking-widest uppercase text-forest">How It Works</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-ink" style={{ textWrap: 'balance' }}>
            From transaction to verified proof in seconds
          </h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            DigitalReceipt.ng turns every sale into a tamper-proof, identity-linked record that anyone can verify, with no technical knowledge needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/generate"
              className="px-6 py-3 bg-forest text-white rounded-lg font-semibold text-sm hover:bg-forest-bright transition-all flex items-center justify-center gap-2"
              style={{ boxShadow: '0 2px 8px oklch(0.42 0.18 145 / 0.20)' }}
            >
              Generate a receipt <ArrowRight size={15} />
            </Link>
            <Link href="/verify" className="px-6 py-3 border border-border text-ink rounded-lg font-semibold text-sm hover:bg-surface transition-colors">
              Verify a receipt
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl text-ink text-center mb-12">Step by step</h2>
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-6 sm:gap-10 group">
                {/* Line + number */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center shrink-0 text-xs font-bold">
                    {step.number}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-2 mb-2" style={{ minHeight: 40 }} />}
                </div>
                {/* Content */}
                <div className="pb-10 pt-1 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon size={18} className="text-forest shrink-0" />
                    <h3 className="font-semibold text-ink text-base">{step.title}</h3>
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 sm:py-20 px-4 border-t border-border" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl text-ink text-center mb-3">Who uses DigitalReceipt.ng</h2>
          <p className="text-sm text-ink-muted text-center mb-10">Anyone who collects money and needs proof.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5">
                <p className="font-semibold text-ink text-sm mb-1">{uc.title}</p>
                <p className="text-xs text-ink-muted leading-relaxed">{uc.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verify explainer */}
      <section className="py-16 sm:py-20 px-4 border-t border-border">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <ShieldCheck size={40} className="text-forest mx-auto" />
          <h2 className="font-heading text-2xl sm:text-3xl text-ink" style={{ textWrap: 'balance' }}>
            Verification is always free
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Anyone can verify any receipt on DigitalReceipt.ng without creating an account. Just enter the receipt number or scan the QR code.
          </p>
          <Link href="/verify" className="inline-flex items-center gap-2 px-6 py-3 bg-forest text-white rounded-lg font-semibold text-sm hover:bg-forest-bright transition-colors">
            Try verifying a receipt <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
