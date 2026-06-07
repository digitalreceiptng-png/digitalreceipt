export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  category: string
  content: string
}

export const posts: BlogPost[] = [
  {
    slug: 'why-digital-receipts-matter-nigeria',
    title: 'Why Digital Receipts Are the Future of Commerce in Nigeria',
    excerpt: 'Paper receipts are easy to forge, easy to lose, and impossible to verify. Here\'s why Nigerian businesses are switching to verified digital receipts.',
    date: '2026-06-01',
    readTime: '4 min read',
    category: 'Insights',
    content: `
In Lagos, a fashion designer collected a deposit of ₦150,000 from a client. Three weeks later, the client claimed she never paid. The designer had a paper receipt — but it was handwritten, unsigned, and the client simply denied it. No court. No resolution. Just lost money and a broken business relationship.

This story is not unusual. It plays out every day across Nigeria — in markets in Aba, fabric stores in Kano, mechanic workshops in Port Harcourt, and provision stores in Ibadan. The root problem is the same everywhere: **paper receipts offer zero real protection.**

## The Problem with Paper Receipts

Paper receipts fail in four specific ways that matter deeply in the Nigerian context.

**They are easy to forge.** Any printer, any handwriting, any stamp. A fraudulent seller can issue a fake receipt for a transaction that never happened — or deny the authenticity of a real one.

**They are impossible to verify.** When a buyer shows a paper receipt, there is no way to confirm it came from the seller it claims to represent. No signature standard. No registration link. No audit trail.

**They get lost.** A receipt kept in a bag gets wet during rainy season. One kept in a pocket goes through the wash. Digital files do not get lost.

**They hold no legal weight.** In any dispute, a handwritten paper receipt is merely a piece of paper. A verified digital receipt with a traceable identifier, linked to a registered issuer, is evidence.

## What Verification Actually Means

A verified digital receipt is not just a PDF sent over WhatsApp. It is a receipt issued through a system that:

- Assigns a unique identifier to each transaction
- Links the receipt to the issuer's registered identity (NIN or CAC)
- Records the timestamp, buyer details, items, and amount on an immutable ledger
- Allows anyone — the buyer, a third party, a regulator — to confirm the receipt is genuine by entering the identifier at DigitalReceipt.ng

When a buyer scans the QR code or enters the receipt number, the system either confirms: *"This receipt is genuine, issued by [Seller Name], on [Date], for ₦[Amount]"* — or it says it does not exist.

There is no grey area.

## Why Nigerian Businesses Are Making the Switch

The adoption is being driven by two groups: sellers who want protection, and buyers who demand trust.

On the seller side, businesses that issue verified receipts immediately distinguish themselves. In a market where fraud is common, displaying the DigitalReceipt.ng badge signals that you are a legitimate operator. Clients notice. They return. They refer others.

On the buyer side, particularly for high-value transactions — rent payments, school fees, medical consultations, deposits for events and services — buyers are increasingly asking: *"Can I verify this receipt?"* If you cannot answer yes, you lose the transaction to a competitor who can.

## The Bigger Picture

Nigeria processes millions of informal commercial transactions every day. Most of them leave no verifiable trace. This is why receipt fraud, tenancy disputes, market scams, and payment denials are so common.

DigitalReceipt.ng is building the infrastructure that makes every transaction provable. Not just for large businesses with POS systems — but for the suya seller, the event planner, the private school, the freelance developer, the landlord managing three flats.

The future of Nigerian commerce is verified. It starts with the receipt.
    `.trim(),
  },
  {
    slug: 'how-to-protect-yourself-from-fake-receipts',
    title: 'How to Protect Yourself from Fake Receipts as a Nigerian Consumer',
    excerpt: 'Fraudulent receipts cost Nigerian consumers billions every year. Learn the simple steps to verify any receipt before accepting it.',
    date: '2026-05-20',
    readTime: '3 min read',
    category: 'Consumer Tips',
    content: `
You paid. You have the receipt. And then, three months later, you discover the receipt is fake — the seller denies the transaction ever happened, and there is nothing you can do.

This is one of the most common forms of commercial fraud in Nigeria, and it happens across every sector: rent, school fees, hospital bills, market purchases, event deposits, and professional services.

The good news: verifying a receipt now takes less than 30 seconds.

## The Signs of a Fake Paper Receipt

Not all fake receipts look obviously fraudulent. Here is what to watch for:

**No business registration details.** Legitimate businesses can provide their CAC registration number. If a seller refuses or cannot produce one, be cautious with large payments.

**Handwritten amounts with no carbon copy.** When a seller writes an amount by hand and gives you only one copy — with no triplicate or digital record — there is nothing to cross-reference if a dispute arises.

**No date or timestamp.** Legitimate receipts always include the exact date. Vague dates ("June 2026") without a day are a warning sign.

**Receipt number that doesn't match any system.** Sellers who generate sequential numbers manually (Receipt 001, Receipt 002) have no system to verify those numbers against.

## The Simple Rule: If You Can't Verify It, It Doesn't Count

This is the standard you should apply for any transaction above ₦10,000. Before you leave with your receipt, ask the seller: *"Can I verify this at DigitalReceipt.ng?"*

If they say yes, go to DigitalReceipt.ng, enter the receipt number, and confirm in seconds. If they say no — or if the number doesn't exist in the system — you have received a piece of paper with no protection.

## How to Verify a DigitalReceipt.ng Receipt

1. Visit **DigitalReceipt.ng/verify** on your phone or computer — no account required
2. Enter the receipt identifier (found on the receipt as a number or QR code)
3. The system instantly shows you: the seller's name, registration status, date, items, and amount
4. If it matches what you paid — you are protected. If it doesn't exist — escalate immediately

## What to Do If a Receipt Fails Verification

Do not leave the premises. Calmly inform the seller that the receipt did not verify and ask them to issue a valid one. If they refuse or become evasive, take the following steps:

- Document everything with your phone (photos of the receipt, the premises, signage)
- File a report with the Consumer Protection Council (CPC) at consumerprotection.gov.ng
- Report the seller to DigitalReceipt.ng so the incident is flagged

The more consumers demand verifiable receipts, the faster fraud becomes unprofitable in Nigeria.

## The Bottom Line

You work hard for your money. A receipt that cannot be verified is not a receipt — it is a piece of paper. Protect yourself by insisting on digital, verifiable proof for every transaction that matters.
    `.trim(),
  },
  {
    slug: 'cac-verification-digitalreceipt',
    title: 'CAC Verification on DigitalReceipt.ng: What It Means for Your Business',
    excerpt: 'Linking your CAC registration to your receipts builds instant trust with buyers. Here\'s what CAC verification does, and why it matters.',
    date: '2026-05-10',
    readTime: '5 min read',
    category: 'Business',
    content: `
In Nigerian business culture, trust is everything — and trust is built on proof. Proof that you are who you say you are. Proof that your business is registered. Proof that the transaction happened as described.

CAC verification on DigitalReceipt.ng connects your Corporate Affairs Commission registration directly to every receipt you issue. Here is what that means in practice, and why it is transforming how Nigerian businesses operate.

## What Is CAC Verification?

The Corporate Affairs Commission (CAC) is Nigeria's official body for registering businesses. When you register a business in Nigeria, you receive either an RC number (for companies) or a BN number (for business names).

CAC verification on DigitalReceipt.ng means your business registration is confirmed and linked to your issuer profile. Every receipt you issue will display your registered business name, registration type, and a verification badge — pulling directly from the CAC database.

## Why It Matters to Your Buyers

Think about what a buyer sees when they scan a receipt from a CAC-verified business:

- Your registered business name (exactly as it appears in the CAC database)
- Your registration number (RC or BN)
- A green "CAC Verified" badge
- The confirmed transaction details

This is the equivalent of seeing a business's full documentation before deciding to trust them — except it happens in seconds, on a phone, without any paperwork.

For high-value transactions, this matters enormously. A client paying ₦500,000 for an event, or ₦2 million for a property deposit, wants to know they are dealing with a real registered entity. A CAC-verified receipt removes that doubt completely.

## The Trust Premium

Businesses that adopt CAC verification consistently report two measurable effects:

**Faster conversions.** Buyers who might have hesitated — asked more questions, demanded meetings, delayed payment — proceed faster when they can verify the business registration in seconds.

**Fewer disputes.** When both parties have a verified, immutable record of the transaction, the number of "I never paid" or "that's not what we agreed" disputes drops significantly. There is simply nothing to dispute.

## How to Get CAC-Verified on DigitalReceipt.ng

1. Create your account at DigitalReceipt.ng
2. Go to your profile and select "Verify Business (CAC)"
3. Enter your RC or BN number
4. The system queries the CAC database in real time and confirms your registration
5. Your profile and all future receipts are immediately marked as CAC-verified

The process takes under five minutes for any legitimately registered business.

## A Note for Businesses Still Operating Informally

If your business is not yet registered with the CAC, this is an important reason to do so. Registration costs are low (from ₦10,000 for a business name), the process has been significantly streamlined by the CAC's online portal, and the benefits — including full access to verified receipting — are substantial.

An unregistered business issuing receipts is a liability. A registered business with verified receipts is a brand.

## The Bottom Line

CAC verification is not a bureaucratic formality. It is a trust signal — one that your buyers see on every transaction, that differentiates you from unverified competitors, and that protects your business in the event of any dispute.

If you are a registered Nigerian business, linking your CAC to your DigitalReceipt.ng account is the single highest-return action you can take this week.
    `.trim(),
  },
  {
    slug: 'digitalreceipt-for-landlords',
    title: 'Why Every Nigerian Landlord Should Issue Digital Rent Receipts',
    excerpt: 'Tenant disputes often come down to who has proof. Verifiable digital rent receipts protect both parties and hold up in court.',
    date: '2026-04-28',
    readTime: '4 min read',
    category: 'Use Cases',
    content: `
A landlord in Abuja collected two years of rent upfront from a new tenant — ₦1.8 million. He issued a handwritten receipt. Eighteen months later, a family dispute required him to sell the property. The new owner claimed the rent had not been paid. The tenant's paper receipt was challenged. The case went on for months.

This situation — with minor variations — is one of the most common property disputes in Nigeria. And it is almost entirely preventable.

## The Unique Vulnerability of Rent Transactions

Rent is unusual as a financial transaction because:

- The amounts are large (often hundreds of thousands to millions of naira)
- Payments cover long future periods (one or two years upfront is standard in Nigeria)
- Circumstances change — landlords sell, die, transfer property; tenants move, sublet, or dispute conditions
- Paper receipts can be lost, damaged, or disputed years after the fact

In most Western countries, rent transactions are managed through banks with automatic records. In Nigeria, the overwhelming majority of landlord-tenant transactions are still cash-based, with handwritten receipts as the only evidence.

## What a Verified Digital Rent Receipt Provides

When a landlord issues rent receipts through DigitalReceipt.ng, every payment creates an immutable, verifiable record that includes:

- The landlord's identity (NIN-verified or CAC-linked)
- The tenant's name and contact details
- The property address
- The exact amount paid and the period it covers
- The date of payment
- A unique identifier that can be verified by any third party at any time

This record cannot be altered after issuance. If a dispute arises — between tenant and landlord, or involving a new property owner, an estate administrator, or a court — the receipt can be verified in seconds.

## Real Scenarios Where This Matters

**Landlord sells the property.** The new owner cannot deny rent already paid and properly receipted. The tenant simply verifies their receipt.

**Landlord passes away.** Family members or estate administrators cannot claim rent was not received. The receipts are tied to the landlord's NIN and exist in the DigitalReceipt.ng system.

**Tenant claims they paid when they didn't.** The absence of a receipt in the system is definitive. There is no "I lost it" or "you didn't give me one."

**Dispute goes to court.** A verified digital receipt with a unique identifier is far more credible evidence than a handwritten paper note.

## For Tenants: Always Insist on a Digital Receipt

If your landlord is not yet on DigitalReceipt.ng, forward this article to them. The platform is free to use for up to 10 receipts per month, and the process of issuing a digital rent receipt takes under two minutes.

Your rent payment — often the single largest financial commitment you make — deserves more protection than a paper note.

## A Simple System for Landlords Managing Multiple Properties

If you manage multiple units, DigitalReceipt.ng lets you:

- Maintain a complete digital record of every tenant payment
- Issue receipts from your phone immediately upon receiving payment
- Access your full transaction history from your dashboard at any time
- Provide tenants with a receipt they can verify independently

For landlords managing five, ten, or twenty units, this is not just protection — it is professional property management.

## The Bottom Line

In Nigerian property, disputes are inevitable. What determines who wins is who has proof. Issue verified digital receipts, and you will always have proof.
    `.trim(),
  },
  {
    slug: 'nin-receipt-fraud-prevention',
    title: 'How NIN-Linked Receipts Are Reducing Receipt Fraud in Nigeria',
    excerpt: 'Tying every receipt to a verified National ID number makes fraudulent issuance traceable. An explanation of how the system works.',
    date: '2026-04-15',
    readTime: '6 min read',
    category: 'Insights',
    content: `
Receipt fraud in Nigeria is not a small problem. It ranges from individual sellers denying transactions they actually completed, to organised schemes where fake receipts are issued for goods or services never delivered. The common thread in virtually every case is the same: the issuer was never accountable because their identity was never verified.

NIN-linked receipts change that equation entirely.

## Why Anonymity Enables Fraud

Traditional paper receipt fraud works because the issuer has no skin in the game. A seller can:

- Issue a receipt for a transaction that never happened (to support a fraudulent insurance or warranty claim)
- Issue a receipt for a higher amount than was actually paid (and pocket the difference)
- Deny issuing a receipt that they did issue
- Create a fake business identity that leads nowhere

In all of these cases, the reason it works is that there is no verified link between the receipt and a real, traceable person or entity.

## What NIN Verification Does

When an issuer on DigitalReceipt.ng verifies their National Identification Number, their identity is confirmed against the NIMC (National Identity Management Commission) database. This means:

- The issuer is a real, traceable Nigerian individual
- Their name, as it appears in the NIMC system, is attached to every receipt they issue
- If fraud is alleged, there is a clear, government-registered identity to investigate

This does not mean DigitalReceipt.ng shares personal NIN data with buyers. The buyer sees only the issuer's name and a "NIN Verified" badge — confirmation that the person is real and has been identity-checked. The underlying NIN remains private.

## The Deterrent Effect

The most important effect of NIN verification is not what happens after fraud is detected — it is that fraud becomes far less likely to be attempted in the first place.

When a fraudulent seller knows that:
- Their real identity is attached to every receipt
- The receipt exists in a system that cannot be altered
- Any buyer can verify the receipt independently
- Any dispute creates a traceable record linked to their NIN

...the calculus of fraud changes completely. The risk is no longer acceptable.

This is exactly how formal financial systems work. Banks record every transaction against the account holder's verified identity. The fact that your identity is attached to your transactions is what makes it safe to transact.

## What Happens When Fraud Is Reported

When a buyer reports a fraudulent receipt on DigitalReceipt.ng:

1. The report is flagged against the specific receipt identifier
2. The issuer's NIN-verified profile is linked to the flag
3. DigitalReceipt.ng investigates and, where fraud is confirmed, the account is suspended
4. The report, along with the issuer's identity, can be passed to appropriate authorities

This creates accountability that simply does not exist with paper receipts.

## The Network Effect of Verified Commerce

As more Nigerian issuers become NIN-verified, the effect compounds. Buyers begin to expect verification as the standard — not the exception. Unverified sellers face a growing trust deficit. The commercial incentive to verify increases.

This is how infrastructure works. The value of a phone network increases with every phone that joins it. The value of a verified receipt network increases with every issuer that joins it.

## A Note on Privacy

Some business owners worry about privacy when they hear "NIN verification." This is a reasonable concern, and it is worth addressing clearly.

DigitalReceipt.ng does not display your NIN on your receipts or to buyers. Your NIN is used once — to verify your identity against the NIMC database — and the result is a "Verified" badge on your profile. Nothing else is shared.

The same model is used by financial institutions, telecoms, and any formal Nigerian business that onboards customers: your identity is confirmed privately, and the result is your ability to transact with trust.

## The Bottom Line

NIN verification is not just a compliance checkbox. It is the mechanism that transforms a receipt from a piece of paper into a credible, fraud-resistant instrument. It protects buyers. It protects honest sellers. And it makes Nigeria's commercial ecosystem more trustworthy for everyone who participates in it.
    `.trim(),
  },
  {
    slug: 'getting-started-digitalreceipt',
    title: 'Getting Started with DigitalReceipt.ng: A Complete Guide',
    excerpt: 'From creating your account to issuing your first verified receipt: everything you need to know in one place.',
    date: '2026-04-01',
    readTime: '7 min read',
    category: 'Guide',
    content: `
Whether you are a freelancer in Lagos, a shop owner in Enugu, a landlord in Kano, or a school administrator in Port Harcourt — issuing your first verified digital receipt on DigitalReceipt.ng takes less than five minutes.

This guide walks you through every step, from creating your account to sharing a receipt your buyer can instantly verify.

## Step 1: Go to DigitalReceipt.ng/generate

You do not need to create an account first. On DigitalReceipt.ng, your email address is your account. The first time you generate a receipt, you verify your email, set a password, and you are done. No long sign-up forms. No waiting for approval.

Simply visit DigitalReceipt.ng and tap "Generate a receipt."

## Step 2: Choose New or Returning

If this is your first time, select "New here." If you have generated receipts before, select "Returning" and sign in with your email and password.

**For new users:**
- Enter your email address
- You will receive a 6-digit verification code in your inbox (check your spam folder if it does not arrive within 60 seconds)
- Enter the code on the page
- Set a password you will remember — this is what you will use to sign in next time

## Step 3: Enter Buyer Details

Fill in the details of who you are issuing the receipt to:

- **Buyer name** (required) — the full name of the person or company paying you
- **Buyer phone** (optional but recommended) — useful if you want to forward the receipt via WhatsApp
- **Buyer email** (optional) — the system can send the receipt directly to the buyer
- **Buyer address** (optional) — important for property transactions

## Step 4: Add Your Items

This is where you describe what was sold or what service was provided.

For each item or service:
- Write a clear description (e.g., "One month tailoring service" or "Samsung Galaxy A35 — 256GB")
- Enter the quantity
- Enter the unit price in naira

The system automatically calculates the line total and the overall subtotal. If VAT applies to your transaction, enter the VAT percentage and the system adds it to the total.

Add as many line items as needed. There is no limit.

## Step 5: Payment Details

- **Transaction date** — when the payment was received (defaults to today)
- **Payment method** — Cash, Bank Transfer, POS, Cheque, Mobile Money, or Other
- **Reference number** (optional) — if payment was by bank transfer, enter the transaction reference for extra traceability
- **Notes** (optional) — any additional information relevant to the transaction

## Step 6: Choose How to Issue

You can issue as an **individual** (your personal name) or as a **business** (your registered or trading name). If you have a CAC-registered business, issuing as a business and linking your CAC gives buyers the highest level of trust.

## Step 7: Verify Your Identity

Before your first receipt is issued, you will be asked to verify your identity. This is a one-time process.

**NIN Verification:** Enter your National Identification Number. The system checks it against the NIMC database and confirms your identity in seconds. Your NIN is kept private — buyers only see a "Verified" badge.

**CAC Verification (optional):** If you have a registered business, enter your RC or BN number to link your CAC registration. This adds a business verification badge to all your receipts.

Once verified, you never need to do this again.

## Step 8: Your Receipt Is Generated

Within seconds, your verified digital receipt is created. You will see:

- A unique receipt number (e.g., DR-2026-XXXXX)
- A QR code that links directly to the verification page
- All transaction details as entered
- Your verification badges (NIN Verified, CAC Verified if applicable)

## Step 9: Share with Your Buyer

You can share the receipt in several ways:

- **Copy the link** — share via WhatsApp, SMS, or email
- **Download as PDF** — send as an attachment or print if needed
- **Let the buyer scan the QR code** — they can verify instantly without even clicking a link

## Step 10: Your Buyer Verifies (Optional but Powerful)

Tell your buyer: "You can verify this receipt at DigitalReceipt.ng — no account needed." When they enter the receipt number or scan the QR code, they will see the full transaction details confirmed by the system.

This single step — the buyer's ability to verify — is what separates a DigitalReceipt.ng receipt from any other document you could send them.

## Managing Your Receipts

All receipts you issue are stored in your dashboard at DigitalReceipt.ng. You can:

- View the full history of every receipt you have ever issued
- Download any receipt as a PDF
- See which receipts have been verified by buyers

## Free Plan: What You Get

The free plan includes **10 receipts per month** — enough for most individuals and small businesses getting started. There is no credit card required, no time limit, and no feature restrictions on the free plan.

## The First Receipt Changes Everything

Many issuers report that the moment a buyer verifies their receipt for the first time — sees their name, the amount, the date, all confirmed by the system — the relationship changes. The buyer trusts them differently. They come back. They refer others.

Your first verified receipt is five minutes away.
    `.trim(),
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug)
}
