'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, ToggleLeft, ToggleRight, Files, Trash2, MoreHorizontal } from 'lucide-react'

interface Props {
  formId: string
  formUrl: string
  isActive: boolean
}

export default function FormsActions({ formId, formUrl, isActive }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState('')

  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(formUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading('toggle')
    await fetch(`/api/forms/${formId}/toggle`, { method: 'POST' })
    setLoading('')
    setOpen(false)
    router.refresh()
  }

  async function duplicate(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading('duplicate')
    await fetch(`/api/forms/${formId}/duplicate`, { method: 'POST' })
    setLoading('')
    setOpen(false)
    router.refresh()
  }

  async function del(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this form? This cannot be undone.')) return
    setLoading('delete')
    await fetch(`/api/forms/${formId}`, { method: 'DELETE' })
    setLoading('')
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={copy} className="p-1 text-ink-dim hover:text-forest transition-colors rounded" title="Copy link">
        {copied ? <Check size={13} className="text-forest" /> : <Copy size={13} />}
      </button>
      <div className="relative">
        <button
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          className="p-1 text-ink-dim hover:text-ink transition-colors rounded"
          title="More actions"
        >
          <MoreHorizontal size={14} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-6 z-20 bg-white border border-border rounded-xl shadow-lg py-1 w-44 text-sm">
              <button
                onClick={toggle}
                disabled={!!loading}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
              >
                {isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                {loading === 'toggle' ? 'Updating…' : isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={duplicate}
                disabled={!!loading}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
              >
                <Files size={14} />
                {loading === 'duplicate' ? 'Duplicating…' : 'Duplicate'}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={del}
                disabled={!!loading}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-danger hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                {loading === 'delete' ? 'Deleting…' : 'Delete form'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
