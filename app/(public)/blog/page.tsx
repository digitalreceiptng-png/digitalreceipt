import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import { posts } from '@/lib/blog'

export const metadata = { title: 'Blog | DigitalReceipt.ng' }

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
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={120} height={120} className="object-contain mx-auto" />
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
