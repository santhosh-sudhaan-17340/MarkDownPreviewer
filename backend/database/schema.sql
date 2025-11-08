-- Subscription & Billing Management Platform - Database Schema
-- PostgreSQL Schema with optimistic locking, proration, and comprehensive billing features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,

    -- Indexes
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly')),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    trial_days INTEGER DEFAULT 0 CHECK (trial_days >= 0),

    -- Features and limits (JSONB for flexibility)
    features JSONB DEFAULT '{}',

    -- Plan metadata
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT subscription_plans_name_billing_cycle_unique UNIQUE (name, billing_cycle)
);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_billing_cycle ON subscription_plans(billing_cycle);

-- ============================================================================
-- SUBSCRIPTIONS TABLE (with optimistic locking)
-- ============================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),

    -- Subscription status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired', 'paused')),

    -- Billing information
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_end TIMESTAMP NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP NULL,

    -- Pricing (snapshot at subscription time, may differ from plan)
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Optimistic locking
    version INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT subscriptions_user_unique UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end);

-- ============================================================================
-- SUBSCRIPTION HISTORY TABLE (for audit trail)
-- ============================================================================
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Change tracking
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'upgraded', 'downgraded', 'renewed', 'canceled', 'paused', 'resumed', 'expired')),
    from_plan_id UUID REFERENCES subscription_plans(id),
    to_plan_id UUID REFERENCES subscription_plans(id),

    -- Pricing details
    old_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2),
    proration_amount DECIMAL(10, 2) DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Invoice status
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    amount_due DECIMAL(10, 2) NOT NULL CHECK (amount_due >= 0),
    amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (amount_paid >= 0),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Dates
    invoice_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    paid_at TIMESTAMP NULL,

    -- Billing details
    billing_address JSONB DEFAULT '{}',

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================================================
-- INVOICE ITEMS TABLE
-- ============================================================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),

    -- Proration details (if applicable)
    is_proration BOOLEAN DEFAULT false,
    proration_period_start TIMESTAMP NULL,
    proration_period_end TIMESTAMP NULL,

    -- Tax details
    tax_rate DECIMAL(5, 2) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
    tax_amount DECIMAL(10, 2) DEFAULT 0 CHECK (tax_amount >= 0),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')),

    -- Payment method
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'stripe', 'other')),
    payment_method_details JSONB DEFAULT '{}',

    -- Gateway information
    gateway VARCHAR(50) DEFAULT 'stripe',
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB DEFAULT '{}',

    -- Failure information
    failure_code VARCHAR(100),
    failure_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP NULL,
    max_retries INTEGER DEFAULT 3,

    -- Timestamps
    processed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_transaction_id ON payments(gateway_transaction_id);
CREATE INDEX idx_payments_next_retry_at ON payments(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- ============================================================================
-- PAYMENT LOGS TABLE (for detailed tracking)
-- ============================================================================
CREATE TABLE payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

    -- Log details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'processing', 'succeeded', 'failed', 'retry_scheduled', 'retry_attempted', 'refunded', 'canceled')),
    message TEXT,

    -- Request/Response data
    request_data JSONB DEFAULT '{}',
    response_data JSONB DEFAULT '{}',

    -- Error details
    error_code VARCHAR(100),
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_logs_payment_id ON payment_logs(payment_id);
CREATE INDEX idx_payment_logs_event_type ON payment_logs(event_type);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at);

-- ============================================================================
-- COUPONS TABLE
-- ============================================================================
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,

    -- Discount details
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
    currency VARCHAR(3) DEFAULT 'USD', -- Only for fixed_amount type

    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,

    -- Usage limits
    max_redemptions INTEGER NULL, -- NULL = unlimited
    times_redeemed INTEGER DEFAULT 0,
    max_redemptions_per_user INTEGER DEFAULT 1,

    -- Applicable plans (NULL = all plans)
    applicable_plan_ids JSONB DEFAULT '[]',

    -- Restrictions
    minimum_amount DECIMAL(10, 2) DEFAULT 0,
    first_time_transaction_only BOOLEAN DEFAULT false,

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT coupons_code_unique UNIQUE (code),
    CONSTRAINT coupons_discount_check CHECK (
        (discount_type = 'percentage' AND discount_value <= 100) OR
        (discount_type = 'fixed_amount' AND discount_value > 0)
    )
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);

-- ============================================================================
-- COUPON REDEMPTIONS TABLE
-- ============================================================================
CREATE TABLE coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Discount applied
    discount_amount DECIMAL(10, 2) NOT NULL CHECK (discount_amount >= 0),

    -- Timestamp
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    CONSTRAINT coupon_redemptions_unique_user_coupon UNIQUE (coupon_id, user_id, invoice_id)
);

CREATE INDEX idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);
CREATE INDEX idx_coupon_redemptions_invoice_id ON coupon_redemptions(invoice_id);

-- ============================================================================
-- TAX RULES TABLE
-- ============================================================================
CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Geographic scope
    country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
    state_code VARCHAR(10) NULL, -- For US states, etc.

    -- Tax details
    tax_name VARCHAR(100) NOT NULL, -- e.g., "VAT", "GST", "Sales Tax"
    tax_rate DECIMAL(5, 2) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 100),

    -- Validity
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,

    -- Tax calculation rules
    applies_to_shipping BOOLEAN DEFAULT false,
    inclusive BOOLEAN DEFAULT false, -- Is tax included in price?

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT tax_rules_unique_location UNIQUE (country_code, state_code, effective_from)
);

CREATE INDEX idx_tax_rules_country_code ON tax_rules(country_code);
CREATE INDEX idx_tax_rules_state_code ON tax_rules(state_code);
CREATE INDEX idx_tax_rules_is_active ON tax_rules(is_active);

-- ============================================================================
-- REVENUE ANALYTICS MATERIALIZED VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW revenue_analytics AS
SELECT
    DATE_TRUNC('month', p.created_at) as month,
    COUNT(DISTINCT p.user_id) as paying_users,
    COUNT(p.id) as total_transactions,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) / NULLIF(COUNT(DISTINCT p.user_id), 0) as arpu, -- Average Revenue Per User
    SUM(CASE WHEN p.status = 'failed' THEN p.amount ELSE 0 END) as failed_revenue,
    COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
    ROUND(
        (COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END)::DECIMAL / NULLIF(COUNT(p.id), 0)) * 100,
        2
    ) as success_rate_percentage
FROM payments p
GROUP BY DATE_TRUNC('month', p.created_at)
ORDER BY month DESC;

CREATE UNIQUE INDEX idx_revenue_analytics_month ON revenue_analytics(month);

-- ============================================================================
-- MRR (Monthly Recurring Revenue) VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW mrr_analytics AS
SELECT
    DATE_TRUNC('month', s.current_period_start) as month,
    COUNT(s.id) as active_subscriptions,
    SUM(
        CASE
            WHEN sp.billing_cycle = 'monthly' THEN s.price
            WHEN sp.billing_cycle = 'yearly' THEN s.price / 12
            WHEN sp.billing_cycle = 'quarterly' THEN s.price / 3
            ELSE 0
        END
    ) as mrr,
    AVG(
        CASE
            WHEN sp.billing_cycle = 'monthly' THEN s.price
            WHEN sp.billing_cycle = 'yearly' THEN s.price / 12
            WHEN sp.billing_cycle = 'quarterly' THEN s.price / 3
            ELSE 0
        END
    ) as average_mrr_per_user,
    COUNT(CASE WHEN s.status = 'trial' THEN 1 END) as trial_subscriptions,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_paying_subscriptions,
    COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as canceled_subscriptions
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('trial', 'active')
GROUP BY DATE_TRUNC('month', s.current_period_start)
ORDER BY month DESC;

CREATE UNIQUE INDEX idx_mrr_analytics_month ON mrr_analytics(month);

-- ============================================================================
-- CHURN ANALYTICS VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW churn_analytics AS
WITH monthly_stats AS (
    SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscriptions
    FROM subscriptions
    GROUP BY DATE_TRUNC('month', created_at)
),
cancellations AS (
    SELECT
        DATE_TRUNC('month', canceled_at) as month,
        COUNT(*) as canceled_subscriptions
    FROM subscriptions
    WHERE canceled_at IS NOT NULL
    GROUP BY DATE_TRUNC('month', canceled_at)
),
active_subs AS (
    SELECT
        DATE_TRUNC('month', current_period_start) as month,
        COUNT(*) as active_count
    FROM subscriptions
    WHERE status IN ('active', 'trial')
    GROUP BY DATE_TRUNC('month', current_period_start)
)
SELECT
    ms.month,
    COALESCE(ms.new_subscriptions, 0) as new_subscriptions,
    COALESCE(c.canceled_subscriptions, 0) as canceled_subscriptions,
    COALESCE(a.active_count, 0) as active_subscriptions,
    ROUND(
        (COALESCE(c.canceled_subscriptions, 0)::DECIMAL / NULLIF(COALESCE(a.active_count, 0), 0)) * 100,
        2
    ) as churn_rate_percentage,
    ROUND(
        (COALESCE(ms.new_subscriptions, 0)::DECIMAL / NULLIF(COALESCE(a.active_count, 0), 0)) * 100,
        2
    ) as growth_rate_percentage
FROM monthly_stats ms
LEFT JOIN cancellations c ON ms.month = c.month
LEFT JOIN active_subs a ON ms.month = a.month
ORDER BY ms.month DESC;

CREATE UNIQUE INDEX idx_churn_analytics_month ON churn_analytics(month);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON tax_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Refresh Analytics Views
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mrr_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY churn_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE subscriptions IS 'Core subscription table with optimistic locking via version column';
COMMENT ON COLUMN subscriptions.version IS 'Optimistic locking version number - increment on each update';
COMMENT ON TABLE invoices IS 'Invoice records for all billing transactions';
COMMENT ON TABLE payments IS 'Payment transaction records with retry logic support';
COMMENT ON TABLE payment_logs IS 'Detailed audit log for all payment events';
COMMENT ON TABLE coupons IS 'Discount coupon codes with usage limits';
COMMENT ON TABLE tax_rules IS 'Geographic-based tax calculation rules';
COMMENT ON MATERIALIZED VIEW revenue_analytics IS 'Monthly revenue metrics aggregated from payments';
COMMENT ON MATERIALIZED VIEW mrr_analytics IS 'Monthly Recurring Revenue metrics';
COMMENT ON MATERIALIZED VIEW churn_analytics IS 'Subscription churn and growth analytics';
