export type ReceiptType = 'standard' | 'smart' | 'silver' | 'gold' | 'diamond' | 'platinum'
export type ReceiptStatus = 'active' | 'cancelled' | 'expired'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone?: string
  issuer_type: 'individual' | 'business'
  business_name?: string
  rc_number?: string
  address?: string
  logo_url?: string
  avatar_url?: string
  is_verified: boolean
  monthly_limit_override?: number
}

export interface ReceiptItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  sort_order: number
}

export interface Receipt {
  id: string
  receipt_number: string
  unique_identifier: string
  receipt_type: ReceiptType
  seller_name: string
  seller_phone: string
  seller_email?: string
  seller_address?: string
  seller_rc_number?: string
  buyer_name: string
  buyer_phone: string
  buyer_email?: string
  buyer_address?: string
  transaction_date: string
  payment_method: string
  reference_number?: string
  notes?: string
  subtotal: number
  discount: number
  tax: number
  total_amount: number
  amount_paid?: number
  balance_due?: number
  currency?: string
  status: ReceiptStatus
  created_at: string
  items?: ReceiptItem[]
}

export interface DraftItem {
  description: string
  quantity: string
  unit_price: string
}
