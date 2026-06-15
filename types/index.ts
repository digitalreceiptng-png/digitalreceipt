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

export interface StaffMember {
  id: string;
  owner_id: string;
  staff_id: string;
  invite_id?: string;
  role: string;
  can_create_receipts: boolean;
  can_view_all_receipts: boolean;
  can_view_wallet: boolean;
  is_active: boolean;
  created_at: string;
  staff_profile?: Pick<Profile, 'id' | 'full_name' | 'email'>;
}

export interface StaffInvite {
  id: string;
  owner_id: string;
  email: string;
  token: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  can_create_receipts: boolean;
  can_view_all_receipts: boolean;
  can_view_wallet: boolean;
  expires_at: string;
  created_at: string;
}

export type FormPurposeType = 'fixed' | 'multiple';
export type FieldVisibility = 'required' | 'optional' | 'hidden';
export type SubmissionStatus = 'pending' | 'confirmed' | 'rejected';

export interface ReceiptFormPurpose {
  id: string;
  form_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

export interface ReceiptForm {
  id: string;
  user_id: string;
  title: string | null;
  is_active: boolean;
  vat_enabled: boolean;
  vat_rate: number | null;
  require_payment_evidence: boolean;
  additional_instructions: string | null;
  purpose_type: FormPurposeType;
  fixed_purpose: string | null;
  field_labels: Record<string, string>;
  field_config: Record<string, FieldVisibility>;
  created_at: string;
  updated_at: string;
  purposes?: ReceiptFormPurpose[];
}

export interface ReceiptFormSubmission {
  id: string;
  form_id: string | null;
  issuer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  purpose_of_payment: string | null;
  item_description: string | null;
  unit_label: string | null;
  unit_value: string | null;
  unit_price: number | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  additional_notes: string | null;
  payment_evidence_url: string | null;
  payment_evidence_name: string | null;
  form_snapshot: Record<string, string> | null;
  status: SubmissionStatus;
  rejection_reason: string | null;
  receipt_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  form?: Pick<ReceiptForm, 'id' | 'title'> | null;
  receipt?: Pick<Receipt, 'id' | 'receipt_number' | 'unique_identifier'> | null;
}
