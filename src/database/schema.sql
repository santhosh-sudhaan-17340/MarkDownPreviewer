-- P2P Payment App Database Schema

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) CHECK (account_type IN ('SAVINGS', 'CURRENT')),
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_number, ifsc_code)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(50) UNIQUE NOT NULL,
    sender_account_id UUID REFERENCES bank_accounts(id),
    receiver_account_id UUID REFERENCES bank_accounts(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'INR',
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('P2P', 'QR_PAYMENT', 'REQUEST')),
    status VARCHAR(20) CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED')) DEFAULT 'PENDING',
    description TEXT,
    qr_code_id UUID,
    retry_count INTEGER DEFAULT 0,
    fraud_score DECIMAL(5, 2) DEFAULT 0.00,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CHECK (sender_account_id != receiver_account_id)
);

-- Transaction attempts (for retry mechanism)
CREATE TABLE transaction_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud alerts table
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    alert_type VARCHAR(50) NOT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'REVIEWED', 'CLEARED', 'BLOCKED')) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- Disputes table
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    raised_by_user_id UUID REFERENCES users(id),
    dispute_type VARCHAR(50) CHECK (dispute_type IN ('UNAUTHORIZED', 'AMOUNT_MISMATCH', 'NOT_RECEIVED', 'DUPLICATE', 'OTHER')),
    description TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')) DEFAULT 'OPEN',
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- QR codes table
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    account_id UUID REFERENCES bank_accounts(id),
    qr_data TEXT NOT NULL,
    amount DECIMAL(15, 2),
    description TEXT,
    is_dynamic BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Beneficiaries table
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    beneficiary_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    nickname VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank integration status table
CREATE TABLE bank_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(100) UNIQUE NOT NULL,
    bank_code VARCHAR(20) UNIQUE NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_health_check TIMESTAMP,
    health_status VARCHAR(20) CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'DOWN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_transactions_sender ON transactions(sender_account_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_account_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_fraud_alerts_user ON fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
