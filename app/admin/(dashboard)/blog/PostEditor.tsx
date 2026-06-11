'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminHref } from '@/lib/admin-url'
import { Loader2, Save, Globe, EyeOff, ArrowLeft } from 'lucide-react'

const CATEGORIES = ['Insights', 'Consumer Tips', 'Business', 'Use Cases', 'Guide', 'Announcement']

const INPUT = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors bg-white'

interface Props {
  post?: {
    id: string
    title: string
    slug: string
    excerpt: string
    category: string
    content: string
    read_time: string
    published: boolean
  }
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function PostEditor({ post }: Props) {
  const router = useRouter()
  const isEdit = !!post

  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [category, setCategory] = useState(post?.category ?? 'Insights')
  const [content, setContent] = useState(post?.content ?? '')
  const [readTime, setReadTime] = useState(post?.read_time ?? '5 min read')
  const [published, setPublished] = useState(post?.published ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!isEdit) setSlug(slugify(val))
  }

  async function save(publish?: boolean) {
    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      setError('Title, slug, excerpt and content are required.')
      return
    }
    setSaving(true)
    setError('')
    const isPublished = publish ?? published
    try {
      const res = await fetch(
        isEdit ? `/api/admin/blog/${post.id}` : '/api/admin/blog',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, slug, excerpt, category, content, read_time: readTime, published: isPublished }),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      if (publish !== undefined) setPublished(isPublished)
      router.push(adminHref('/blog'))
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(adminHref('/blog'))} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-forest transition-colors">
          <ArrowLeft size={15} /> Blog
        </button>
        <span className="text-ink-dim">/</span>
        <span className="text-sm text-ink">{isEdit ? 'Edit Post' : 'New Post'}</span>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Title <span className="text-danger">*</span></label>
            <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)} className={INPUT} placeholder="Post title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Slug <span className="text-danger">*</span></label>
              <input type="text" value={slug} onChange={e => setSlug(slugify(e.target.value))} className={INPUT} placeholder="post-slug" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Read Time</label>
              <input type="text" value={readTime} onChange={e => setReadTime(e.target.value)} className={INPUT} placeholder="5 min read" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Excerpt <span className="text-danger">*</span></label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} className={INPUT + ' resize-none'} placeholder="Short summary shown in listings" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Content <span className="text-danger">*</span> <span className="font-normal text-ink-dim">(Markdown supported: ## Heading, **bold**, - list)</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} className={INPUT + ' resize-y font-mono text-xs'} placeholder="Write your post content here…" />
          </div>
        </div>

        {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <input id="published" type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-forest" />
            <label htmlFor="published" className="text-sm text-ink-muted cursor-pointer">Publish immediately</label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:border-border-bright transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
              Save Draft
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-forest text-white rounded-lg text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
