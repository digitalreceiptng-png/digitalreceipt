import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.QOREID_CLIENT_ID,
    hasSecret:   !!process.env.QOREID_SECRET,
    clientIdLen: process.env.QOREID_CLIENT_ID?.length ?? 0,
    secretLen:   process.env.QOREID_SECRET?.length ?? 0,
  })
}
