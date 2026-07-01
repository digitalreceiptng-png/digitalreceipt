'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, X, Paperclip, MessageSquare, StickyNote, Send, CheckCircle2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
]

type Tab = 'details' | 'reply' | 'note'

export default function SupportActions({ ticket }: { ticket: any }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState(ticket.admin_note ?? '')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [tab, setTab] = useState<Tab>('details')

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

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true); setSendError(''); setSent(false)
    try {
      const res = await fetch(`/api/admin/support/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_message: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setSendError(data.error ?? 'Failed to send reply.'); return }
      setSent(true)
      setReply('')
      router.refresh()
    } catch {
      setSendError('Could not send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const hasReplied = !!ticket.admin_reply

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        {hasReplied && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest bg-forest/10 border border-forest/20 rounded-full px-2 py-0.5">
            <CheckCircle2 size={10} /> Replied
          </span>
        )}
        <button
          onClick={() => { setShowDetail(true); setTab('details') }}
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
          <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-ink">{ticket.subject}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{ticket.name} · {ticket.email}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-1.5 text-ink-dim hover:text-ink rounded-lg hover:bg-surface transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {([
                { id: 'details', label: 'Message',      icon: MessageSquare },
                { id: 'reply',   label: 'Reply to Sender', icon: Send },
                { id: 'note',    label: 'Internal Note', icon: StickyNote },
              ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === id
                      ? 'border-forest text-forest'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                  {id === 'reply' && hasReplied && (
                    <span className="w-1.5 h-1.5 rounded-full bg-forest ml-0.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6 space-y-4">

              {/* ── Message tab ── */}
              {tab === 'details' && (
                <>
                  <div className="bg-surface rounded-xl p-4 text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </div>
                  {ticket.attachments?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
                        <Paperclip size={12} /> Attachments ({ticket.attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ticket.attachments.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`attachment ${i + 1}`} className="w-32 h-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Status buttons */}
                  <div className="flex gap-1.5 pt-1 flex-wrap">
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
                </>
              )}

              {/* ── Reply tab ── */}
              {tab === 'reply' && (
                <div className="space-y-3">
                  {/* Previous reply */}
                  {hasReplied && (
                    <div className="bg-forest/5 border border-forest/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-forest mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Last reply sent
                      </p>
                      <p className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">{ticket.admin_reply}</p>
                      {ticket.replied_at && (
                        <p className="text-[10px] text-ink-dim mt-2">
                          Sent {new Date(ticket.replied_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })} WAT
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply to info */}
                  <div className="flex items-center gap-2 text-xs text-ink-muted bg-surface rounded-lg px-3 py-2">
                    <Send size={11} className="text-ink-dim shrink-0" />
                    Sending to: <span className="font-semibold text-ink">{ticket.name}</span>
                    <span className="text-ink-dim">({ticket.email})</span>
                  </div>

                  {/* Message composer */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1.5">Your reply</label>
                    <textarea
                      value={reply}
                      onChange={e => { setReply(e.target.value); setSent(false); setSendError('') }}
                      rows={6}
                      className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                      placeholder={`Hi ${ticket.name},\n\nThank you for reaching out…`}
                    />
                    <p className="text-[10px] text-ink-dim mt-1">
                      The original message and a link to contact support again will be included automatically.
                    </p>
                  </div>

                  {sendError && (
                    <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">{sendError}</p>
                  )}
                  {sent && (
                    <p className="text-xs text-forest bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Reply sent successfully to {ticket.email}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
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
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {sending ? 'Sending…' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Internal note tab ── */}
              {tab === 'note' && (
                <div className="space-y-3">
                  <p className="text-xs text-ink-dim">Internal notes are never shown to the user.</p>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                    placeholder="Add an internal note…"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
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
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
