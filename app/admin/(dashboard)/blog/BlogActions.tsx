'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { adminHref } from '@/lib/admin-url'
import { Globe, EyeOff, Pencil, Trash2, Loader2 } from 'lucide-react'

export default function BlogActions({ post }: { post: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function togglePublish() {
    setLoading('publish')
    await fetch(`/api/admin/blog/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !post.published }),
    })
    setLoading(null)
    router.refresh()
  }

  async function deletePost() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    setLoading('delete')
    await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={togglePublish}
        disabled={!!loading}
        title={post.published ? 'Unpublish' : 'Publish'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50"
        style={
          post.published
            ? { background: 'oklch(0.96 0.02 145)', borderColor: 'oklch(0.82 0.06 145)', color: 'oklch(0.35 0.16 145)' }
            : { background: 'white', borderColor: 'oklch(0.90 0.01 145)', color: 'oklch(0.50 0.02 145)' }
        }
      >
        {loading === 'publish' ? <Loader2 size={11} className="animate-spin" /> : post.published ? <EyeOff size={11} /> : <Globe size={11} />}
        {post.published ? 'Unpublish' : 'Publish'}
      </button>
      <Link
        href={adminHref(`/blog/${post.id}/edit`)}
        className="p-1.5 rounded-lg text-ink-dim hover:text-forest hover:bg-forest/8 transition-colors"
        title="Edit"
      >
        <Pencil size={14} />
      </Link>
      <button
        onClick={deletePost}
        disabled={!!loading}
        className="p-1.5 rounded-lg text-ink-dim hover:text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Delete"
      >
        {loading === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  )
}
