export type BillingPeriod = 'monthly' | 'yearly';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export type DiscountType = 'percentage' | 'fixed';

export interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string;
    billing_period: BillingPeriod;
    price: number;
    trial_days: number;
    features?: Record<string, any>;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: SubscriptionStatus;
    current_period_start: Date;
    current_period_end: Date;
    trial_end?: Date;
    cancel_at_period_end: boolean;
    canceled_at?: Date;
    version: number; // For optimistic locking
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}

export interface SubscriptionHistory {
    id: string;
    subscription_id: string;
    action: string;
    old_plan_id?: string;
    new_plan_id?: string;
    old_status?: string;
    new_status?: string;
    proration_amount?: number;
    metadata?: Record<string, any>;
    created_at: Date;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    subscription_id: string;
    user_id: string;
    status: InvoiceStatus;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    currency: string;
    coupon_id?: string;
    tax_rule_id?: string;
    billing_period_start: Date;
    billing_period_end: Date;
    due_date: Date;
    paid_at?: Date;
    voided_at?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}

export interface InvoiceLineItem {
    id: string;
    invoice_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    proration: boolean;
    period_start?: Date;
    period_end?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
}

export interface Payment {
    id: string;
    invoice_id: string;
    subscription_id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    payment_method?: string;
    payment_gateway?: string;
    gateway_transaction_id?: string;
    failure_code?: string;
    failure_message?: string;
    retry_count: number;
    next_retry_at?: Date;
    metadata?: Record<string, any>;
    created_at: Date;
    updated_at: Date;
}

export interface PaymentRetryLog {
    id: string;
    payment_id: string;
    retry_attempt: number;
    status: string;
    failure_reason?: string;
    attempted_at: Date;
}

export interface Coupon {
    id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    max_redemptions?: number;
    current_redemptions: number;
    valid_from: Date;
    valid_until?: Date;
    applicable_plans?: string[]; // Array of plan IDs
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface TaxRule {
    id: string;
    country_code: string;
    state_code?: string;
    tax_rate: number;
    tax_name: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface ProrationCalculation {
    credit_amount: number; // Amount to credit from old plan
    charge_amount: number; // Amount to charge for new plan
    net_amount: number; // Net amount (charge - credit)
    days_remaining: number;
    days_in_period: number;
}

export interface RevenueAnalytics {
    total_revenue: number;
    monthly_recurring_revenue: number;
    annual_recurring_revenue: number;
    active_subscriptions: number;
    trial_subscriptions: number;
    churned_subscriptions: number;
    average_revenue_per_user: number;
    period_start: Date;
    period_end: Date;
}

export class OptimisticLockError extends Error {
    constructor(message: string = 'Subscription was modified by another transaction') {
        super(message);
        this.name = 'OptimisticLockError';
    }
}

export class InsufficientCreditsError extends Error {
    constructor(message: string = 'Insufficient credits for operation') {
        super(message);
        this.name = 'InsufficientCreditsError';
    }
}

export class InvalidCouponError extends Error {
    constructor(message: string = 'Invalid or expired coupon') {
        super(message);
        this.name = 'InvalidCouponError';
    }
}
