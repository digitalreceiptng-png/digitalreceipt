import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ServiceStatus = {
  name: string
  configured: boolean
  connected: boolean
  error?: string
  latency?: number
}

type StatusResponse = {
  timestamp: string
  environment: string
  services: {
    [key: string]: ServiceStatus
  }
  envVars: {
    [key: string]: boolean
  }
}

async function testSupabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey || !serviceRoleKey) {
      return {
        name: 'Supabase',
        configured: false,
        connected: false,
        error: 'Missing credentials (URL, anon key, or service role key)',
      }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.from('profiles').select('id').limit(1)

    const latency = Date.now() - start

    if (error) {
      return {
        name: 'Supabase',
        configured: true,
        connected: false,
        error: error.message,
        latency,
      }
    }

    return {
      name: 'Supabase',
      configured: true,
      connected: true,
      latency,
    }
  } catch (err) {
    const latency = Date.now() - start
    return {
      name: 'Supabase',
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      latency,
    }
  }
}

async function testQoreID(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const clientId = process.env.QOREID_CLIENT_ID
    const secret = process.env.QOREID_SECRET

    if (!clientId || !secret) {
      return {
        name: 'QoreID',
        configured: false,
        connected: false,
        error: 'Missing CLIENT_ID or SECRET',
      }
    }

    const res = await fetch('https://api.qoreid.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        secret,
      }),
      cache: 'no-store',
    })

    const latency = Date.now() - start

    if (!res.ok) {
      const text = await res.text()
      return {
        name: 'QoreID',
        configured: true,
        connected: false,
        error: `Auth failed (${res.status}): ${text}`,
        latency,
      }
    }

    const data = await res.json()
    const token = data.accessToken ?? data.access_token

    if (!token) {
      return {
        name: 'QoreID',
        configured: true,
        connected: false,
        error: 'Token not returned',
        latency,
      }
    }

    return {
      name: 'QoreID',
      configured: true,
      connected: true,
      latency,
    }
  } catch (err) {
    const latency = Date.now() - start
    return {
      name: 'QoreID',
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      latency,
    }
  }
}

async function testResend(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return {
        name: 'Resend',
        configured: false,
        connected: false,
        error: 'Missing API_KEY',
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const latency = Date.now() - start

    if (!res.ok) {
      return {
        name: 'Resend',
        configured: true,
        connected: false,
        error: `API error (${res.status})`,
        latency,
      }
    }

    return {
      name: 'Resend',
      configured: true,
      connected: true,
      latency,
    }
  } catch (err) {
    const latency = Date.now() - start
    return {
      name: 'Resend',
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      latency,
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const [supabase, qoreid, resend] = await Promise.all([
      testSupabase(),
      testQoreID(),
      testResend(),
    ])

    const envVars = {
      'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      'QOREID_CLIENT_ID': !!process.env.QOREID_CLIENT_ID,
      'QOREID_SECRET': !!process.env.QOREID_SECRET,
      'RESEND_API_KEY': !!process.env.RESEND_API_KEY,
      'NEXT_PUBLIC_APP_URL': !!process.env.NEXT_PUBLIC_APP_URL,
    }

    const response: StatusResponse = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      services: {
        supabase,
        qoreid,
        resend,
      },
      envVars,
    }

    return NextResponse.json(response)
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
