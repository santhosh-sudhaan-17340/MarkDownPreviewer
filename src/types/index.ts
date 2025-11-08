export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  account_type: 'SAVINGS' | 'CURRENT';
  is_primary: boolean;
  is_verified: boolean;
  balance: number;
  created_at: Date;
}

export interface Transaction {
  id: string;
  transaction_ref: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  currency: string;
  transaction_type: 'P2P' | 'QR_PAYMENT' | 'REQUEST';
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  description?: string;
  qr_code_id?: string;
  retry_count: number;
  fraud_score: number;
  is_flagged: boolean;
  created_at: Date;
  completed_at?: Date;
}

export interface FraudAlert {
  id: string;
  transaction_id: string;
  user_id: string;
  alert_type: string;
  risk_score: number;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'CLEARED' | 'BLOCKED';
  created_at: Date;
  reviewed_at?: Date;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  raised_by_user_id: string;
  dispute_type: 'UNAUTHORIZED' | 'AMOUNT_MISMATCH' | 'NOT_RECEIVED' | 'DUPLICATE' | 'OTHER';
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  created_at: Date;
  resolved_at?: Date;
}

export interface QRCode {
  id: string;
  user_id: string;
  account_id: string;
  qr_data: string;
  amount?: number;
  description?: string;
  is_dynamic: boolean;
  is_active: boolean;
  expires_at?: Date;
  created_at: Date;
  used_at?: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}
