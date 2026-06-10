'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wallet, ArrowUpCircle, ArrowDownCircle, Clock, TrendingUp } from 'lucide-react'
import { formatNaira, formatDateTime } from '@/lib/formatters'

interface Transaction {
  id: number
  type: 'credit' | 'debit'
  amount: number
  description: string
  balance_after: number
  created_at: string
  receipt_id: string | null
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wallet')
      .then(r => r.json())
      .then(data => {
        setBalance(data.balance ?? 0)
        setTransactions(data.transactions ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalDebit  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-forest transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Back to dashboard
        </Link>
        <h1 className="font-heading text-2xl text-ink" style={{ letterSpacing: '-0.02em' }}>
          Wallet
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">Your DigitalReceipt.ng balance</p>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 145), oklch(0.42 0.18 145))' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-70 mb-1">Available Balance</p>
            {loading ? (
              <div className="h-10 w-36 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <p className="font-heading text-4xl font-bold" style={{ letterSpacing: '-0.03em' }}>
                {formatNaira(balance ?? 0)}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Wallet size={22} />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs opacity-60 mb-0.5">Total funded</p>
            <p className="font-semibold">{loading ? '—' : formatNaira(totalCredit)}</p>
          </div>
          <div>
            <p className="text-xs opacity-60 mb-0.5">Total spent</p>
            <p className="font-semibold">{loading ? '—' : formatNaira(totalDebit)}</p>
          </div>
        </div>
      </div>

      {/* Fund wallet */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-forest" />
          <h2 className="font-semibold text-sm text-ink">Fund Wallet</h2>
        </div>
        <p className="text-sm text-ink-muted mb-4">
          Add funds to your wallet to generate receipts beyond your free quota.
          Minimum top-up: <strong className="text-ink">₦500</strong> (individual) or{' '}
          <strong className="text-ink">₦1,000</strong> (business).
        </p>
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'oklch(0.97 0.006 145)', border: '1px dashed oklch(0.82 0.06 145)' }}
        >
          <p className="text-sm font-medium text-forest mb-1">Payment gateway coming soon</p>
          <p className="text-xs text-ink-muted">
            Wallet funding via Paystack will be available shortly.
            Contact{' '}
            <a href="mailto:info@digitalreceipt.ng" className="text-forest hover:underline">
              info@digitalreceipt.ng
            </a>{' '}
            to manually top up your wallet.
          </p>
        </div>
      </div>

      {/* Pricing reference */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Receipt Pricing</h2>
        <div className="space-y-2">
          {[
            { tier: 'Silver', price: '₦100', color: 'oklch(0.42 0.18 145)', note: '5 free lifetime + 2 free/month' },
            { tier: 'Gold',     price: '₦200',  color: 'oklch(0.58 0.15 75)',  note: 'QR code · 5yr active' },
            { tier: 'Diamond',  price: '₦500',  color: 'oklch(0.48 0.14 230)', note: 'QR code · forever active' },
            { tier: 'Platinum', price: '₦1,000', color: 'oklch(0.48 0.10 295)', note: 'QR · photo attach · forever' },
          ].map(({ tier, price, color, note }) => (
            <div key={tier} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-sm font-medium" style={{ color }}>{tier}</span>
                <span className="text-xs text-ink-dim">{note}</span>
              </div>
              <span className="text-sm font-semibold text-ink">{price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-ink">Transaction History</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-5 h-5 border-2 border-forest/30 border-t-forest rounded-full animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <Clock size={24} className="text-ink-dim mx-auto mb-2" />
            <p className="text-sm text-ink-muted">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map(t => (
              <div key={t.id} className="px-5 py-3.5 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: t.type === 'credit'
                      ? 'oklch(0.96 0.05 145)'
                      : 'oklch(0.97 0.03 25)',
                  }}
                >
                  {t.type === 'credit'
                    ? <ArrowUpCircle size={16} style={{ color: 'oklch(0.42 0.18 145)' }} />
                    : <ArrowDownCircle size={16} style={{ color: 'oklch(0.55 0.20 25)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{t.description}</p>
                  <p className="text-xs text-ink-dim mt-0.5">{formatDateTime(t.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: t.type === 'credit' ? 'oklch(0.42 0.18 145)' : 'oklch(0.45 0.18 25)' }}
                  >
                    {t.type === 'credit' ? '+' : '−'}{formatNaira(t.amount)}
                  </p>
                  <p className="text-xs text-ink-dim mt-0.5">Bal: {formatNaira(t.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
