import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function BlogPostPage() {
  return (
    <div className="bg-white min-h-[70vh]">
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-forest transition-colors mb-8">
            <ArrowLeft size={15} /> Back to blog
          </Link>
          <div className="text-center py-16 space-y-4">
            <p className="text-xs font-bold tracking-widest uppercase text-forest">Coming Soon</p>
            <h1 className="font-heading text-3xl text-ink">This article is being written</h1>
            <p className="text-sm text-ink-muted">Check back soon or <Link href="/blog" className="text-forest hover:underline">browse all articles</Link>.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
