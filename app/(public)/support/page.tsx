'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Paperclip, X, Send, CheckCircle, MessageSquare } from 'lucide-react'

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const INPUT = 'w-full px-4 py-3 bg-white border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors'

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const valid = selected.filter(f => f.size <= 3 * 1024 * 1024 && /\.(png|jpe?g)$/i.test(f.name))
    setFiles(prev => [...prev, ...valid].slice(0, 5))
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    const valid = dropped.filter(f => f.size <= 3 * 1024 * 1024 && /\.(png|jpe?g)$/i.test(f.name))
    setFiles(prev => [...prev, ...valid].slice(0, 5))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !subject || !message) { setError('Please fill in all required fields.'); return }
    setError('')
    setSubmitting(true)

    // Build mailto as fallback (no backend email yet — open issue to wire up)
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`
    const mailto = `mailto:support@digitalreceipt.ng?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto

    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 bg-forest-light border border-forest/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-forest" />
          </div>
          <h2 className="font-heading text-2xl text-ink">Message sent</h2>
          <p className="text-sm text-ink-muted">Your email client has opened with your message pre-filled. Send it to reach our support team. We respond within 24 hours.</p>
          <button onClick={() => { setSubmitted(false); setName(''); setEmail(''); setSubject(''); setMessage(''); setFiles([]) }} className="text-sm text-forest hover:underline">Send another message</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="py-14 sm:py-20 px-4" style={{ background: 'oklch(0.97 0.01 145)' }}>
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-forest">Support</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-ink">Contact us</h1>
          <p className="text-sm text-ink-muted">A member of our team will respond within 24 hours. For quick answers, check the <Link href="/faq" className="text-forest hover:underline">FAQ</Link>.</p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Name <span className="text-danger">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="Your full name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email <span className="text-danger">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Subject <span className="text-danger">*</span></label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className={INPUT} placeholder="Brief description of your issue" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Message <span className="text-danger">*</span></label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                className={INPUT + ' resize-none'}
                placeholder="Please enter the details of your request. A member of our support staff will respond as soon as possible."
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <p className="text-sm font-medium text-ink mb-1.5">
                <span className="inline-flex items-center gap-1"><Paperclip size={14} /> Attachments</span>{' '}
                <span className="font-normal text-ink-dim">(optional)</span>
              </p>
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-forest/40 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <Paperclip size={22} className="text-ink-dim mx-auto mb-2" />
                <p className="text-sm text-ink-muted">
                  <span className="text-forest font-medium">Upload</span> or drag and drop
                </p>
                <p className="text-xs text-ink-dim mt-1">PNG and JPG (max. 3MB)</p>
                <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg" multiple className="hidden" onChange={handleFiles} />
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 text-sm">
                      <span className="text-ink truncate">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-ink-dim hover:text-danger ml-3 shrink-0"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-danger bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-forest text-white rounded-xl text-sm font-semibold hover:bg-forest-bright transition-colors disabled:opacity-60"
            >
              <Send size={15} />
              {submitting ? 'Opening email…' : 'Send message'}
            </button>
          </form>

          {/* Alt contact */}
          <div className="mt-10 pt-8 border-t border-border text-center">
            <p className="text-sm text-ink-muted mb-1">You can also email us directly at</p>
            <a href="mailto:support@digitalreceipt.ng" className="text-forest font-medium text-sm hover:underline">support@digitalreceipt.ng</a>
          </div>

          {/* FAQ link */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-muted">
            <MessageSquare size={14} className="text-forest" />
            Looking for quick answers?{' '}
            <Link href="/faq" className="text-forest font-medium hover:underline">Visit the FAQ</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
