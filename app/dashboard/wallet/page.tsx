'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
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

type FundStatus = 'idle' | 'initializing' | 'verifying' | 'success' | 'error'

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000]

const TIERS = [
  { tier: 'Silver',   price: '₦100',   color: 'oklch(0.42 0.18 145)', note: 'Basic receipt' },
  { tier: 'Gold',     price: '₦200',   color: 'oklch(0.58 0.15 75)',  note: 'QR · 5yr active' },
  { tier: 'Diamond',  price: '₦500',   color: 'oklch(0.48 0.14 230)', note: 'QR · forever' },
  { tier: 'Platinum', price: '₦1,000', color: 'oklch(0.48 0.10 295)', note: 'QR · photo · forever' },
]

export default function WalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const [amount, setAmount] = useState('')
  const [fundStatus, setFundStatus] = useState<FundStatus>('idle')
  const [fundMessage, setFundMessage] = useState('')

  const fetchWallet = useCallback(() => {
    return fetch('/api/wallet')
      .then(r => r.json())
      .then(data => {
        setBalance(data.balance ?? 0)
        setTransactions(data.transactions ?? [])
      })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')

    if (reference) {
      router.replace('/dashboard/wallet')
      setFundStatus('verifying')
      fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setFundStatus('success')
            setFundMessage(`₦${(data.amount ?? 0).toLocaleString()} added to your wallet.`)
            fetchWallet()
          } else {
            setFundStatus('error')
            setFundMessage(data.error ?? 'Payment could not be verified. Contact support if your balance was debited.')
          }
        })
        .catch(() => {
          setFundStatus('error')
          setFundMessage('Could not verify payment. Contact support if your balance was debited.')
        })
    }

    fetchWallet().finally(() => setLoading(false))
  }, [fetchWallet, router])

  async function handleFund(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(amount, 10)
    if (!num || num < 500) return
    setFundStatus('initializing')
    setFundMessage('')

    try {
      const res = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFundStatus('error')
        setFundMessage(data.error ?? 'Could not initialize payment.')
        return
      }
      window.location.href = data.authorization_url
    } catch {
      setFundStatus('error')
      setFundMessage('Could not connect to payment provider. Try again.')
    }
  }

  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalDebit  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-full px-6 py-8 sm:px-10 sm:py-10 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-forest transition-colors mb-6"
        >
          <ArrowLeft size={12} />
          Back to dashboard
        </Link>
        <h1 className="font-heading text-3xl text-ink" style={{ letterSpacing: '-0.025em' }}>Wallet</h1>
        <p className="text-sm text-ink-muted mt-1">Your DigitalReceipt.ng balance</p>
      </div>

      {/* Balance hero card */}
      <div
        className="rounded-2xl p-8 text-white relative overflow-hidden mb-7"
        style={{ background: 'linear-gradient(135deg, oklch(0.28 0.13 145) 0%, oklch(0.40 0.18 145) 100%)' }}
      >
        {/* Watermark */}
        <span
          className="absolute -right-4 -bottom-6 font-heading select-none pointer-events-none"
          style={{ fontSize: '11rem', lineHeight: 1, color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.05em' }}
          aria-hidden
        >
          ₦
        </span>

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase opacity-50 mb-3">Available Balance</p>
            {loading ? (
              <div className="h-14 w-48 bg-white/15 rounded-xl animate-pulse" />
            ) : (
              <p className="font-heading text-5xl sm:text-6xl" style={{ letterSpacing: '-0.035em', fontWeight: 700 }}>
                {formatNaira(balance ?? 0)}
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs opacity-40 mb-1.5 tracking-wide">Total funded</p>
            {loading
              ? <div className="h-5 w-24 bg-white/15 rounded animate-pulse" />
              : <p className="font-semibold text-base">{formatNaira(totalCredit)}</p>
            }
          </div>
          <div>
            <p className="text-xs opacity-40 mb-1.5 tracking-wide">Total spent</p>
            {loading
              ? <div className="h-5 w-24 bg-white/15 rounded animate-pulse" />
              : <p className="font-semibold text-base">{formatNaira(totalDebit)}</p>
            }
          </div>
        </div>
      </div>

      {/* Two-column: Fund wallet + Pricing */}
      <div className="grid md:grid-cols-[3fr_2fr] gap-5 mb-10">

        {/* Fund wallet */}
        <div className="bg-white rounded-2xl border border-border p-7">
          <h2 className="font-heading text-xl text-ink mb-5" style={{ letterSpacing: '-0.015em' }}>
            Add funds
          </h2>

          {/* Status banners */}
          {fundStatus === 'verifying' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-forest-light border border-forest/20 mb-5">
              <Loader2 size={16} className="text-forest animate-spin shrink-0" />
              <p className="text-sm text-forest font-medium">Verifying your payment…</p>
            </div>
          )}
          {fundStatus === 'success' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 mb-5">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-medium">{fundMessage}</p>
            </div>
          )}
          {fundStatus === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 mb-5">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{fundMessage}</p>
            </div>
          )}

          <form onSubmit={handleFund} className="space-y-5">
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`py-2.5 rounded-full text-sm font-semibold border transition-all ${
                    amount === String(q)
                      ? 'bg-forest text-white border-forest shadow-sm'
                      : 'bg-white text-ink-muted border-border hover:border-forest/40 hover:text-forest'
                  }`}
                >
                  ₦{(q / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-dim font-medium select-none">₦</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Custom amount"
                  min={500}
                  step={100}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-border rounded-xl text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
                />
              </div>
              <p className="text-xs text-ink-dim mt-2">Minimum ₦500 (individual) · ₦1,000 (business)</p>
            </div>

            <button
              type="submit"
              disabled={!amount || parseInt(amount) < 500 || fundStatus === 'initializing' || fundStatus === 'verifying'}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-forest hover:bg-forest-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {fundStatus === 'initializing' && <Loader2 size={14} className="animate-spin" />}
              {fundStatus === 'initializing' ? 'Opening payment page…' : 'Fund via Paystack'}
            </button>
          </form>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-border p-7">
          <h2 className="font-heading text-xl text-ink mb-5" style={{ letterSpacing: '-0.015em' }}>
            Pricing
          </h2>
          <div className="space-y-1">
            {TIERS.map(({ tier, price, color, note }) => (
              <div key={tier} className="py-3 border-b border-border last:border-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-semibold" style={{ color }}>{tier}</span>
                  </div>
                  <span className="text-sm font-bold text-ink tabular-nums">{price}</span>
                </div>
                <p className="text-xs text-ink-dim pl-3.5">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl text-ink" style={{ letterSpacing: '-0.015em' }}>Transactions</h2>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-2xl">
            <Clock size={22} className="text-ink-dim mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No transactions yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden bg-white">
            {transactions.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-4 px-6 py-5 ${i < transactions.length - 1 ? 'border-b border-border' : ''}`}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: t.type === 'credit' ? 'oklch(0.94 0.05 145)' : 'oklch(0.97 0.03 25)' }}
                >
                  {t.type === 'credit'
                    ? <ArrowUpCircle size={17} style={{ color: 'oklch(0.38 0.18 145)' }} />
                    : <ArrowDownCircle size={17} style={{ color: 'oklch(0.50 0.20 25)' }} />
                  }
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate leading-snug">{t.description}</p>
                  <p className="text-xs text-ink-dim mt-0.5">{formatDateTime(t.created_at)}</p>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p
                    className="text-base font-bold tabular-nums leading-snug"
                    style={{ color: t.type === 'credit' ? 'oklch(0.38 0.18 145)' : 'oklch(0.45 0.18 25)' }}
                  >
                    {t.type === 'credit' ? '+' : '−'}{formatNaira(t.amount)}
                  </p>
                  <p className="text-xs text-ink-dim mt-0.5">bal {formatNaira(t.balance_after)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
