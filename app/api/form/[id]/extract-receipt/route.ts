import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json()
  if (!imageUrl) return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })

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
  "total_amount": "numeric amount paid as a number (digits only, no currency symbol), else null",
  "payment_date": "date in YYYY-MM-DD format if visible, else null"
}
If a field is not clearly visible or cannot be determined, use null for that field.`,
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
