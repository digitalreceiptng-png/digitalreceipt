export async function sendTermiiSms(to: string, message: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'D-Receipt'

  if (!apiKey) throw new Error('TERMII_API_KEY not configured')

  const payload = {
    api_key: apiKey,
    to,
    from: senderId,
    sms: message,
    type: 'plain',
    channel: 'generic',
  }

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  console.log('[Termii SMS]', { to, status: res.status, response: data })

  // Termii returns message_id on success; any error body or non-OK status = failure
  const isError =
    !res.ok ||
    data.code === 'error' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('error')) ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('invalid')) ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('fail')) ||
    (!data.message_id && !data.messages && data.code !== 'ok')

  if (isError) {
    throw new Error(`Termii SMS failed (${res.status}): ${JSON.stringify(data)}`)
  }

  return data
}
