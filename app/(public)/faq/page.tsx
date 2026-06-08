'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ArrowRight } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is DigitalReceipt.ng?',
        a: 'DigitalReceipt.ng is Nigeria\'s first verifiable digital receipt platform. It lets individuals and businesses generate identity-linked receipts that anyone can verify for authenticity, without needing an account.',
      },
      {
        q: 'Do I need an account to generate a receipt?',
        a: 'Yes. To generate receipts, you need to create a free account and verify your identity with your NIN (for individuals) or CAC number (for businesses). This links every receipt you issue to a verified identity.',
      },
      {
        q: 'Is it free to use?',
        a: 'Creating an account and generating receipts is free. Verification (checking if a receipt is authentic) is always free and requires no account.',
      },
      {
        q: 'What devices can I use?',
        a: 'DigitalReceipt.ng works on any device with a browser: phone, tablet, or computer. No app download is needed.',
      },
    ],
  },
  {
    category: 'Identity Verification',
    questions: [
      {
        q: 'Why do you need my NIN?',
        a: 'Your NIN links every receipt you issue to your verified identity. This prevents fraudulent receipts from being generated in your name and allows buyers to trust that the receipt came from a real, verified person.',
      },
      {
        q: 'Is my NIN stored safely?',
        a: 'Yes. Your NIN is stored encrypted and is never displayed on receipts or shared with buyers. It is used only for identity verification at the time of registration.',
      },
      {
        q: 'What if I am a business, not an individual?',
        a: 'Businesses verify using their CAC registration number (RC or BN format). Your company details are pulled directly from the Corporate Affairs Commission database.',
      },
      {
        q: 'What if my NIN is not found?',
        a: 'Ensure you are entering the correct 11-digit NIN from your National ID card or NIMC slip. If the issue persists, contact us at info@digitalreceipt.ng.',
      },
    ],
  },
  {
    category: 'Receipts',
    questions: [
      {
        q: 'Can I edit a receipt after generating it?',
        a: 'No. Receipts are immutable once generated. This is what makes them trustworthy. If you made an error, you can void the original and generate a corrected receipt.',
      },
      {
        q: 'How do I share a receipt with my buyer?',
        a: 'You can download the receipt as a PDF and send it via WhatsApp, email, or any channel. You can also share the verification link directly; buyers can open it in any browser.',
      },
      {
        q: 'What is the unique identifier on a receipt?',
        a: 'Every receipt is assigned a unique alphanumeric code (e.g. MF9V6D9DRN). This code, along with the QR code, is used to verify the receipt on our platform.',
      },
      {
        q: 'How long are receipts stored?',
        a: 'Receipts are stored indefinitely. Historical receipts remain verifiable at any point in the future.',
      },
    ],
  },
  {
    category: 'Verification',
    questions: [
      {
        q: 'How does a buyer verify a receipt?',
        a: 'The buyer can scan the QR code on the receipt using any phone camera, or visit digitalreceipt.ng/verify and enter the receipt number or unique identifier. No account is needed.',
      },
      {
        q: 'What does "verified" mean?',
        a: '"Verified" means the receipt exists in our database, was issued by a verified identity, and has not been tampered with. The status, seller details, and transaction data will all be displayed.',
      },
      {
        q: 'Can a fake PDF pass verification?',
        a: 'No. A modified PDF will still show the original data from our database, and the buyer can immediately see that the document does not match the record. The receipt in our database is the authoritative version.',
      },
    ],
  },
  {
    category: 'Account & Billing',
    questions: [
      {
        q: 'How do I delete my account?',
        a: 'Email info@digitalreceipt.ng with your registered email address and a deletion request. We will process it within 5 business days.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'Go to the login page and click "Forgot password". Enter your registered email and we will send a reset link.',
      },
      {
        q: 'Can I have multiple accounts?',
        a: 'One account per NIN or CAC number is allowed. This is to maintain the integrity of identity-linked receipts.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-ink">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-ink-muted pb-4 leading-relaxed pr-6">{a}</p>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="py-14 sm:py-20 px-4" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={120} height={120} className="object-contain mx-auto" />
          <p className="text-xs font-bold tracking-widest uppercase text-forest">FAQ</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-ink">Frequently Asked Questions</h1>
          <p className="text-sm text-ink-muted">Can&apos;t find what you&apos;re looking for? <Link href="/support" className="text-forest hover:underline">Contact support</Link>.</p>
        </div>
      </section>

      {/* FAQ sections */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-10">
          {faqs.map((section, i) => (
            <div key={i}>
              <h2 className="font-heading text-lg text-ink mb-1">{section.category}</h2>
              <div className="bg-white rounded-xl border border-border px-5 divide-y divide-border">
                {section.questions.map((item, j) => (
                  <FAQItem key={j} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4 border-t border-border" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="font-heading text-2xl text-ink">Still have questions?</h2>
          <p className="text-sm text-ink-muted">Our support team is happy to help.</p>
          <Link href="/support" className="inline-flex items-center gap-2 px-6 py-3 bg-forest text-white rounded-lg font-semibold text-sm hover:bg-forest-bright transition-colors">
            Contact support <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
