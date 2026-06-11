import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { getPost, posts } from '@/lib/blog'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }))
}

async function getDbPost(slug: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('blog_posts')
    .select('title, slug, excerpt, content, category, read_time, published_at')
    .eq('slug', slug)
    .eq('published', true)
    .single()
  if (!data) return null
  return {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    category: data.category,
    readTime: data.read_time,
    date: data.published_at ?? new Date().toISOString(),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug) ?? await getDbPost(slug)
  if (!post) return {}
  return {
    title: `${post.title} | DigitalReceipt.ng`,
    description: post.excerpt,
  }
}

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

function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="font-heading text-2xl text-ink mt-10 mb-4" style={{ textWrap: 'balance' }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="font-heading text-xl text-ink mt-8 mb-3">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('- ')) {
      const listItems: string[] = []
      let j = i
      while (j < lines.length && lines[j].startsWith('- ')) {
        listItems.push(lines[j].slice(2))
        j++
      }
      i = j - 1
      elements.push(
        <ul key={key++} className="space-y-2 my-4 pl-4">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-base text-ink-muted leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
    } else if (line.trim() === '') {
      // skip blank lines (paragraph spacing handled by margin)
    } else {
      elements.push(
        <p key={key++} className="text-base text-ink-muted leading-relaxed my-4">
          {renderInline(line)}
        </p>
      )
    }
  }

  return elements
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug) ?? await getDbPost(slug)
  if (!post) notFound()

  return (
    <div className="bg-white min-h-[70vh]">
      {/* Hero band */}
      <div className="h-2 bg-forest w-full" />

      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors mb-8">
            <ArrowLeft size={15} /> Back to blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-surface text-ink-muted'}`}>
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-ink-dim">
              <Calendar size={11} />{formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1 text-xs text-ink-dim">
              <Clock size={11} />{post.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-heading text-3xl sm:text-4xl text-ink leading-tight mb-6" style={{ textWrap: 'balance' }}>
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-base text-ink-muted leading-relaxed border-l-2 border-forest pl-4 mb-8 italic">
            {post.excerpt}
          </p>

          {/* Divider */}
          <hr className="border-border mb-8" />

          {/* Content */}
          <article className="max-w-none">
            {renderContent(post.content)}
          </article>

          {/* Footer CTA */}
          <div className="mt-14 p-6 rounded-2xl border border-border bg-surface text-center space-y-3">
            <p className="font-heading text-xl text-ink">Ready to issue your first verified receipt?</p>
            <p className="text-sm text-ink-muted">Free for individuals and businesses. No credit card required.</p>
            <Link
              href="/generate"
              className="inline-block px-6 py-3 bg-forest text-white font-semibold rounded-xl text-sm hover:bg-forest-bright transition-colors"
            >
              Generate a receipt, free
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-10">
            <Link href="/blog" className="inline-flex items-center gap-2 px-4 py-2 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors">
              <ArrowLeft size={15} /> All articles
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
