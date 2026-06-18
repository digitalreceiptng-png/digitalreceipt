import { NextResponse } from 'next/server'
import { paymentReminderHtml } from '@/lib/email'

// Preview-only route — remove before going to production or restrict to admins
export async function GET() {
  const html = paymentReminderHtml({
    buyerName:      'Chukwuemeka Obi',
    sellerName:     'Adaeze Beauty Studio',
    receiptNumber:  'DRN-LAG-2026-X5T8M1',
    totalAmount:    150000,
    amountPaid:     50000,
    balanceDue:     100000,
    transactionDate: '2026-06-10',
    paymentMethod:  'Bank Transfer',
    receiptUrl:     'https://digitalreceipt.ng/r/X5T8M1ABCD',
    sendCount:      2,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
