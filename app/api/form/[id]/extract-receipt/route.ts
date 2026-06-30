import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json()
  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
  }

  // SSRF protection: only allow HTTPS URLs from known safe hosts
  let parsedUrl: URL
  try { parsedUrl = new URL(imageUrl) } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  const ALLOWED_HOSTS = [
    'digitalreceipt.ng', 'www.digitalreceipt.ng',
    'digitalreceiptng.supabase.co',
    'firebasestorage.googleapis.com', 'storage.googleapis.com',
    'res.cloudinary.com', 's3.amazonaws.com',
  ]
  const hostOk = ALLOWED_HOSTS.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`))
  if (parsedUrl.protocol !== 'https:' || !hostOk) {
    return NextResponse.json({ error: 'Image host not allowed' }, { status: 400 })
  }

  try {
    // Fetch the image and convert to base64
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return NextResponse.json({ error: 'Could not fetch image' }, { status: 400 })

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const mediaType = (contentType.startsWith('image/') ? contentType : 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract the following from this payment receipt image and return ONLY valid JSON with no extra text:
{
  "customer_name": "the payer or sender name if visible, else null",
  "total_amount": "the amount paid as digits only with no currency symbol or commas (e.g. 5000 or 1500.00), else null",
  "payment_date": "the transaction or payment date converted to YYYY-MM-DD format. Look for any date on the receipt in any format (DD/MM/YYYY, MM/DD/YYYY, '23 Jun 2026', 'June 23 2026', timestamp like '2026-06-23 14:30', etc.) and convert it to YYYY-MM-DD. If no date found, return null."
}
Return ONLY the JSON object. No explanation, no markdown, no extra text.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ customer_name: null, total_amount: null, payment_date: null })

    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      customer_name: extracted.customer_name ?? null,
      total_amount: extracted.total_amount ? String(extracted.total_amount).replace(/[^\d.]/g, '') : null,
      payment_date: extracted.payment_date ?? null,
    })
  } catch (err) {
    console.error('Receipt extract error:', err)
    return NextResponse.json({ customer_name: null, total_amount: null, payment_date: null })
  }
}
