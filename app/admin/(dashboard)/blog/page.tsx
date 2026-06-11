import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/formatters'
import { adminHref } from '@/lib/admin-url'
import Link from 'next/link'
import { PenLine, Plus, Globe, EyeOff } from 'lucide-react'
import BlogActions from './BlogActions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Blog & Content | Admin Console' }

export default async function AdminBlogPage() {
  const db = createAdminClient()
  const { data: posts } = await db
    .from('blog_posts')
    .select('id, slug, title, excerpt, category, published, published_at, read_time, created_at')
    .order('created_at', { ascending: false })

  const published = (posts ?? []).filter((p: any) => p.published).length
  const drafts = (posts ?? []).length - published

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>Blog &amp; Content</h1>
          <p className="text-sm text-ink-muted mt-0.5">{published} published · {drafts} draft{drafts !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href={adminHref('/blog/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors"
        >
          <Plus size={15} />
          New Post
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {!posts?.length ? (
          <div className="py-14 text-center">
            <PenLine size={28} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No posts yet</p>
            <Link href={adminHref('/blog/new')} className="inline-block mt-3 text-sm text-forest font-medium hover:underline">Write your first post →</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(posts as any[]).map(post => (
              <div key={post.id} className="px-5 py-4 flex items-start gap-4 group hover:bg-surface/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.published ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                        <Globe size={11} /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-ink-dim">
                        <EyeOff size={11} /> Draft
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.97 0.006 145)', color: 'oklch(0.40 0.058 145)' }}>
                      {post.category}
                    </span>
                    <span className="text-xs text-ink-dim">{post.read_time}</span>
                  </div>
                  <h3 className="font-semibold text-ink text-sm leading-snug">{post.title}</h3>
                  <p className="text-xs text-ink-muted mt-1 line-clamp-2">{post.excerpt}</p>
                  <p className="text-xs text-ink-dim mt-1.5">
                    {post.published && post.published_at ? `Published ${formatDate(post.published_at)}` : `Created ${formatDate(post.created_at)}`}
                    {' · '}<span className="font-mono">/blog/{post.slug}</span>
                  </p>
                </div>
                <BlogActions post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
