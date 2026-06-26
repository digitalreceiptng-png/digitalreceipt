import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailLogo } from '@/lib/email'

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  resolved:    'Resolved',
  closed:      'Closed',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  in_progress: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  resolved:    { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  closed:      { bg: '#f9fafb', text: '#374151', border: '#d1d5db' },
}

const STATUS_MESSAGES: Record<string, string> = {
  in_progress: 'Our support team has picked up your request and is actively working on it. We will get back to you shortly.',
  resolved:    'Great news — your support request has been resolved. If you feel the issue was not fully addressed, please do not hesitate to reach out again.',
  closed:      'Your support ticket has been closed. Thank you for contacting us. If you need further assistance, you are always welcome to submit a new request.',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const allowed = ['status', 'admin_note']
  const update: Record<string, unknown> = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  if (update.status === 'resolved' && !update.resolved_at) {
    update.resolved_at = new Date().toISOString()
  }

  const db = createAdminClient()

  // Fetch ticket before update to get submitter info and check status change
  const { data: ticket } = await db.from('support_tickets').select('name, email, subject, status').eq('id', id).single()

  const { error } = await db.from('support_tickets').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to submitter when status changes to in_progress, resolved, or closed
  const newStatus = update.status as string | undefined
  if (newStatus && newStatus !== ticket?.status && STATUS_LABELS[newStatus] && ticket?.email) {
    const label = STATUS_LABELS[newStatus]
    const colors = STATUS_COLORS[newStatus]
    const message = STATUS_MESSAGES[newStatus]

    await sendEmail({
      to: ticket.email,
      subject: `Your support request has been ${label.toLowerCase()} — DigitalReceipt.ng`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:540px;margin:0 auto;padding:24px 16px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1a2e22;padding:24px 28px;">
      ${emailLogo('dark')}
      <h1 style="font-size:18px;color:#fff;margin:16px 0 0;font-weight:700;">Support Update</h1>
    </div>
    <div style="padding:28px;">
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
        Hi <strong>${ticket.name}</strong>,
      </p>

      <div style="background:${colors.bg};border:1px solid ${colors.border};border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <p style="font-size:11px;color:${colors.text};margin:0 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Status Update</p>
        <p style="font-size:22px;font-weight:800;color:${colors.text};margin:0;">${label}</p>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <p style="font-size:12px;color:#6b7280;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your request</p>
        <p style="font-size:14px;color:#111827;margin:0;font-weight:600;">${ticket.subject}</p>
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px;">${message}</p>

      <a href="https://www.digitalreceipt.ng/support"
         style="display:block;text-align:center;background:#1a2e22;color:#fff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:20px;">
        Submit Another Request
      </a>

      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;line-height:1.6;">
        This is an automated update from DigitalReceipt.ng Support.<br/>
        Reference: Ticket #${id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  </div>
</body>
</html>`,
    })
  }

  return NextResponse.json({ success: true })
}
