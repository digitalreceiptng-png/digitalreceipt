import { NextRequest, NextResponse } from 'next/server'

// Supported providers: Prembly (IdentityPass), Dojah, Youverify
// Set these in Vercel environment variables:
//   NIN_API_URL  — the provider's NIN lookup endpoint
//   NIN_API_KEY  — your API key / secret key
//   NIN_APP_ID   — Dojah only: your App ID header (leave blank for Prembly/Youverify)

const NIN_API_URL = process.env.NIN_API_URL ?? ''
const NIN_API_KEY = process.env.NIN_API_KEY ?? ''
const NIN_APP_ID  = process.env.NIN_APP_ID  ?? ''

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const nin = String(body.nin ?? '').trim()

  if (!/^\d{11}$/.test(nin)) {
    return NextResponse.json({ error: 'Enter a valid 11-digit NIN.' }, { status: 400 })
  }

  if (!NIN_API_URL || !NIN_API_KEY) {
    return NextResponse.json({ error: 'NIN_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const res = await fetch(NIN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NIN_API_KEY}`,
        'Content-Type': 'application/json',
        ...(NIN_APP_ID ? { 'app-id': NIN_APP_ID } : {}),
      },
      body: JSON.stringify({ number: nin }),
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.detail ?? err.message ?? 'NIN not found. Check the number and try again.' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Normalise across Prembly / Dojah / Youverify response shapes
    const entity = data.entity ?? data.data ?? data

    const person = {
      nin,
      firstName:   entity.firstname   ?? entity.first_name   ?? entity.firstName   ?? '',
      lastName:    entity.lastname    ?? entity.last_name    ?? entity.lastName    ?? '',
      middleName:  entity.middlename  ?? entity.middle_name  ?? entity.middleName  ?? '',
      dateOfBirth: entity.birthdate   ?? entity.date_of_birth ?? entity.dob        ?? '',
      gender:      entity.gender      ?? '',
      phone:       entity.phone       ?? entity.mobile       ?? '',
    }

    return NextResponse.json({ person })
  } catch {
    return NextResponse.json({ error: 'Failed to reach NIN verification service. Please try again.' }, { status: 502 })
  }
}
