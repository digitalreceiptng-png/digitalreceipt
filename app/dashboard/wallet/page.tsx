'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wallet, ArrowUpCircle, ArrowDownCircle, Clock, TrendingUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
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

  // On mount: load wallet data and handle Paystack callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')

    if (reference) {
      // Clean the URL immediately
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
            setFundMessage(`₦${(data.amount ?? 0).toLocaleString()} has been added to your wallet.`)
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
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-forest" />
          <h2 className="font-semibold text-sm text-ink">Fund Wallet</h2>
        </div>

        {/* Payment verification states */}
        {fundStatus === 'verifying' && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-forest-light border border-forest/20 mb-4">
            <Loader2 size={18} className="text-forest animate-spin shrink-0" />
            <p className="text-sm text-forest font-medium">Verifying your payment…</p>
          </div>
        )}
        {fundStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 mb-4">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-800 font-medium">{fundMessage}</p>
          </div>
        )}
        {fundStatus === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 mb-4">
            <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger">{fundMessage}</p>
          </div>
        )}

        <form onSubmit={handleFund} className="space-y-4">
          {/* Quick amounts */}
          <div>
            <p className="text-xs text-ink-muted mb-2">Quick select</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    amount === String(q)
                      ? 'bg-forest text-white border-forest'
                      : 'bg-white text-ink border-border hover:border-forest/50 hover:text-forest'
                  }`}
                >
                  ₦{(q / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-xs text-ink-muted mb-1.5">Or enter amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-dim font-medium">₦</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="500"
                min={500}
                step={100}
                className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/60 transition-colors"
              />
            </div>
            <p className="text-xs text-ink-dim mt-1.5">Minimum ₦500 (individual) · ₦1,000 (business)</p>
          </div>

          <button
            type="submit"
            disabled={!amount || parseInt(amount) < 500 || fundStatus === 'initializing' || fundStatus === 'verifying'}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-forest hover:bg-forest-bright disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {fundStatus === 'initializing' && <Loader2 size={14} className="animate-spin" />}
            {fundStatus === 'initializing' ? 'Opening payment page…' : 'Fund Wallet via Paystack'}
          </button>
        </form>
      </div>

      {/* Pricing reference */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Receipt Pricing</h2>
        <div className="space-y-2">
          {[
            { tier: 'Silver',   price: '₦100',   color: 'oklch(0.42 0.18 145)', note: '5 free lifetime + 2 free/month' },
            { tier: 'Gold',     price: '₦200',   color: 'oklch(0.58 0.15 75)',  note: 'QR code · 5yr active' },
            { tier: 'Diamond',  price: '₦500',   color: 'oklch(0.48 0.14 230)', note: 'QR code · forever active' },
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
                  style={{ background: t.type === 'credit' ? 'oklch(0.96 0.05 145)' : 'oklch(0.97 0.03 25)' }}
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
