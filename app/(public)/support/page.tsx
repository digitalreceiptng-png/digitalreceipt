'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    const mailto = `mailto:info@digitalreceipt.ng?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
          <Image src="/full%20logo%20for%20white%20background.png" alt="DigitalReceipt.ng" width={120} height={120} className="object-contain mx-auto" />
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

          {/* Contact details */}
          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-sm font-semibold text-ink text-center mb-6">Other ways to reach us</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href="mailto:info@digitalreceipt.ng" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-forest/40 hover:bg-forest-light transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-forest-light flex items-center justify-center shrink-0 group-hover:bg-forest/15">
                  <svg className="w-4 h-4 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-ink-dim">Email</p>
                  <p className="text-sm font-medium text-ink">info@digitalreceipt.ng</p>
                </div>
              </a>

              <a href="tel:07031031944" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-forest/40 hover:bg-forest-light transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-forest-light flex items-center justify-center shrink-0 group-hover:bg-forest/15">
                  <svg className="w-4 h-4 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-ink-dim">Phone</p>
                  <p className="text-sm font-medium text-ink">07031031944</p>
                </div>
              </a>

              <a href="https://www.instagram.com/digitalreceipt.ng" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-forest/40 hover:bg-forest-light transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-forest-light flex items-center justify-center shrink-0 group-hover:bg-forest/15">
                  <svg className="w-4 h-4 text-forest" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <div>
                  <p className="text-xs text-ink-dim">Instagram</p>
                  <p className="text-sm font-medium text-ink">@digitalreceipt.ng</p>
                </div>
              </a>

              <a href="https://x.com/dreceipt_ng?s=11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-forest/40 hover:bg-forest-light transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-forest-light flex items-center justify-center shrink-0 group-hover:bg-forest/15">
                  <svg className="w-4 h-4 text-forest" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                </div>
                <div>
                  <p className="text-xs text-ink-dim">X (Twitter)</p>
                  <p className="text-sm font-medium text-ink">@dreceipt_ng</p>
                </div>
              </a>
            </div>
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
