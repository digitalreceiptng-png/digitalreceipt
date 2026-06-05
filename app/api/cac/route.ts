import { NextRequest, NextResponse } from 'next/server'

// Replace CAC_API_KEY and CAC_API_URL with your chosen provider
// (e.g. Dojah, Prembly / IdentityPass, Youverify, or CAC's own portal API)
const CAC_API_KEY = process.env.CAC_API_KEY ?? ''
const CAC_API_URL = process.env.CAC_API_URL ?? ''

export async function GET(req: NextRequest) {
  const rc = req.nextUrl.searchParams.get('rc')?.trim()

  if (!rc || !/^\d{5,8}$/.test(rc)) {
    return NextResponse.json({ error: 'Enter a valid RC number (5–8 digits).' }, { status: 400 })
  }

  if (!CAC_API_URL || !CAC_API_KEY) {
    return NextResponse.json({ error: 'CAC API not configured.' }, { status: 503 })
  }

  try {
    const res = await fetch(`${CAC_API_URL}?rc=${rc}`, {
      headers: {
        Authorization: `Bearer ${CAC_API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: body.message ?? 'Company not found. Check the RC number and try again.' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // Normalise to a consistent shape regardless of provider
    // Adjust these field names to match your CAC API provider's response
    const company = {
      rcNumber: rc,
      name: data.company_name ?? data.name ?? data.companyName ?? '',
      type: data.company_type ?? data.type ?? '',
      status: data.status ?? data.company_status ?? '',
      dateRegistered: data.registration_date ?? data.date_of_registration ?? data.registrationDate ?? '',
      address: data.address ?? data.registered_address ?? '',
    }

    return NextResponse.json({ company })
  } catch {
    return NextResponse.json({ error: 'Failed to reach CAC API. Please try again.' }, { status: 502 })
  }
}
