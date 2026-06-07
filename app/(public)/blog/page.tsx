import Link from 'next/link'
import { ArrowRight, Calendar, Clock } from 'lucide-react'

export const metadata = { title: 'Blog | DigitalReceipt.ng' }

const posts = [
  {
    slug: 'why-digital-receipts-matter-nigeria',
    title: 'Why Digital Receipts Are the Future of Commerce in Nigeria',
    excerpt: 'Paper receipts are easy to forge, easy to lose, and impossible to verify. Here\'s why Nigerian businesses are switching to verified digital receipts.',
    date: '2026-06-01',
    readTime: '4 min read',
    category: 'Insights',
  },
  {
    slug: 'how-to-protect-yourself-from-fake-receipts',
    title: 'How to Protect Yourself from Fake Receipts as a Nigerian Consumer',
    excerpt: 'Fraudulent receipts cost Nigerian consumers billions every year. Learn the simple steps to verify any receipt before accepting it.',
    date: '2026-05-20',
    readTime: '3 min read',
    category: 'Consumer Tips',
  },
  {
    slug: 'cac-verification-digitalreceipt',
    title: 'CAC Verification on DigitalReceipt.ng: What It Means for Your Business',
    excerpt: 'Linking your CAC registration to your receipts builds instant trust with buyers. Here\'s what CAC verification does, and why it matters.',
    date: '2026-05-10',
    readTime: '5 min read',
    category: 'Business',
  },
  {
    slug: 'digitalreceipt-for-landlords',
    title: 'Why Every Nigerian Landlord Should Issue Digital Rent Receipts',
    excerpt: 'Tenant disputes often come down to who has proof. Verifiable digital rent receipts protect both parties and hold up in court.',
    date: '2026-04-28',
    readTime: '4 min read',
    category: 'Use Cases',
  },
  {
    slug: 'nin-receipt-fraud-prevention',
    title: 'How NIN-Linked Receipts Are Reducing Receipt Fraud in Nigeria',
    excerpt: 'Tying every receipt to a verified National ID number makes fraudulent issuance traceable. An explanation of how the system works.',
    date: '2026-04-15',
    readTime: '6 min read',
    category: 'Insights',
  },
  {
    slug: 'getting-started-digitalreceipt',
    title: 'Getting Started with DigitalReceipt.ng: A Complete Guide',
    excerpt: 'From creating your account to issuing your first verified receipt: everything you need to know in one place.',
    date: '2026-04-01',
    readTime: '7 min read',
    category: 'Guide',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  Insights: 'bg-blue-50 text-blue-700',
  'Consumer Tips': 'bg-amber-50 text-amber-700',
  Business: 'bg-forest-light text-forest',
  'Use Cases': 'bg-purple-50 text-purple-700',
  Guide: 'bg-red-50 text-red-700',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BlogPage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="py-14 sm:py-20 px-4" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-forest">Blog</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-ink">Resources &amp; Insights</h1>
          <p className="text-sm text-ink-muted">Guides, tips, and updates from the DigitalReceipt.ng team.</p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Featured post */}
          <div className="mb-10">
            <Link href={`/blog/${posts[0].slug}`} className="group block bg-white rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 sm:h-64 flex items-center justify-center" style={{ background: 'oklch(0.22 0.14 145)' }}>
                <span className="font-heading text-4xl text-white/20">DigitalReceipt.ng</span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[posts[0].category] ?? 'bg-surface text-ink-muted'}`}>{posts[0].category}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-dim"><Calendar size={11} />{formatDate(posts[0].date)}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-dim"><Clock size={11} />{posts[0].readTime}</span>
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl text-ink mb-2 group-hover:text-forest transition-colors" style={{ textWrap: 'balance' }}>{posts[0].title}</h2>
                <p className="text-sm text-ink-muted leading-relaxed">{posts[0].excerpt}</p>
                <p className="mt-4 text-sm font-semibold text-forest flex items-center gap-1">Read article <ArrowRight size={13} /></p>
              </div>
            </Link>
          </div>

          {/* Rest of posts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.slice(1).map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-surface text-ink-muted'}`}>{post.category}</span>
                </div>
                <h3 className="font-semibold text-ink text-sm mb-2 group-hover:text-forest transition-colors leading-snug" style={{ textWrap: 'balance' }}>{post.title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-4">{post.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-ink-dim">
                  <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(post.date)}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{post.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
