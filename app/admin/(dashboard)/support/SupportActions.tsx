'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
]

export default function SupportActions({ ticket }: { ticket: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState(ticket.admin_note ?? '')
  const [showDetail, setShowDetail] = useState(false)

  async function setStatus(status: string) {
    setLoading(true)
    await fetch(`/api/admin/support/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  async function saveNote() {
    await fetch(`/api/admin/support/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_note: note }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setShowDetail(true)}
          className="text-xs font-medium text-forest hover:text-forest-bright transition-colors"
        >
          View
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink border border-border rounded-lg px-2.5 py-1.5 bg-white hover:border-forest/30 transition-colors"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <ChevronDown size={11} />}
            Status
          </button>
          {open && (
            <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface transition-colors ${ticket.status === opt.value ? 'font-semibold text-forest' : 'text-ink-muted'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDetail(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{ticket.subject}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{ticket.name} · {ticket.email}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-1.5 text-ink-dim hover:text-ink rounded-lg hover:bg-surface transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="bg-surface rounded-xl p-4 text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
              {ticket.message}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Admin Note (internal)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                placeholder="Add an internal note…"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${ticket.status === opt.value ? 'bg-forest text-white border-forest' : 'bg-white border-border text-ink-muted hover:border-forest/40'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={saveNote}
                  className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-bright transition-colors"
                >
                  Save note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
