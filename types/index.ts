export type IssuerType = 'individual' | 'business';
export type ReceiptType = 'standard' | 'smart' | 'silver' | 'gold' | 'diamond' | 'platinum';
export type ReceiptStatus = 'active' | 'cancelled' | 'expired';
export type LimitRequestStatus = 'pending' | 'approved' | 'denied';
export type VerificationMethod = 'search' | 'qr';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  issuer_type: IssuerType;
  business_name?: string;
  nin?: string;
  rc_number?: string;
  address?: string;
  logo_url?: string;
  is_verified: boolean;
  is_admin: boolean;
  monthly_limit_override?: number;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  receipt_number: string;
  unique_identifier: string;
  receipt_type: ReceiptType;
  seller_name: string;
  seller_phone: string;
  seller_email?: string;
  seller_address?: string;
  seller_rc_number?: string;
  seller_nin?: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  transaction_date: string;
  payment_date?: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  verification_expires_at?: string;
  qr_code_url?: string;
  status: ReceiptStatus;
  created_at: string;
  updated_at: string;
  items?: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export interface LimitRequest {
  id: string;
  user_id: string;
  reason: string;
  requested_count: number;
  status: LimitRequestStatus;
  admin_note?: string;
  request_month: string;
  created_at: string;
  resolved_at?: string;
  profile?: Profile;
}

export interface Verification {
  id: string;
  receipt_id: string;
  unique_identifier: string;
  method: VerificationMethod;
  ip_address?: string;
  user_agent?: string;
  verified_at: string;
}
