import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, emailLogo } from '@/lib/email'

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''
  let name: string, email: string, subject: string, message: string
  let attachmentUrls: string[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData() as any
    name    = (formData.get('name')    as string)?.trim() ?? ''
    email   = (formData.get('email')   as string)?.trim() ?? ''
    subject = (formData.get('subject') as string)?.trim() ?? ''
    message = (formData.get('message') as string)?.trim() ?? ''

    // Upload attachments to Supabase storage
    const db = createAdminClient()
    const files = formData.getAll('attachments') as File[]
    for (const file of files.slice(0, 5)) {
      if (!file.size) continue
      const ext = file.name.split('.').pop()
      const path = `support/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await db.storage
        .from('support-attachments')
        .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })
      if (!error && data) {
        const { data: { publicUrl } } = db.storage.from('support-attachments').getPublicUrl(data.path)
        attachmentUrls.push(publicUrl)
      }
    }
  } else {
    const body = await request.json()
    name    = body.name?.trim()    ?? ''
    email   = body.email?.trim()   ?? ''
    subject = body.subject?.trim() ?? ''
    message = body.message?.trim() ?? ''
  }

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('support_tickets').insert({
    name,
    email,
    subject,
    message,
    attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admin by email
  const adminEmail = process.env.ADMIN_EMAIL ?? 'ayvicola@gmail.com'
  const attachHtml = attachmentUrls.length > 0
    ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Attachments (${attachmentUrls.length}):</p>
       <div style="display:flex;flex-wrap:wrap;gap:8px;">
         ${attachmentUrls.map(url => `<a href="${url}" target="_blank" style="display:inline-block;"><img src="${url}" alt="attachment" style="max-width:180px;max-height:140px;border-radius:8px;border:1px solid #e5e7eb;" /></a>`).join('')}
       </div>`
    : ''

  await sendEmail({
    to: adminEmail,
    subject: `[Support] New ticket: ${subject}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:540px;margin:0 auto;padding:24px 16px;background:#f9fafb;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#1a2e22;padding:24px 28px;">
      ${emailLogo('dark')}
      <h1 style="font-size:18px;color:#fff;margin:16px 0 0;font-weight:700;">New Support Ticket</h1>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 0;color:#6b7280;width:90px;">From</td>
          <td style="padding:8px 0;font-weight:600;color:#111827;">${name} &lt;${email}&gt;</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 0;color:#6b7280;">Subject</td>
          <td style="padding:8px 0;color:#111827;">${subject}</td>
        </tr>
      </table>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message}</div>
      ${attachHtml}
      <div style="margin-top:24px;">
        <a href="https://admin.digitalreceipt.ng/support"
           style="display:inline-block;background:#1a2e22;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View in Admin Console
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  })

  return NextResponse.json({ success: true })
}
