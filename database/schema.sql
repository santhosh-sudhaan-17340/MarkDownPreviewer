-- Crowdfunding Platform Database Schema
-- Optimized with indexes for query performance

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER', -- USER, ADMIN
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    goal_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0.00,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, SUSPENDED, CANCELLED
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT check_goal_positive CHECK (goal_amount > 0),
    CONSTRAINT check_current_non_negative CHECK (current_amount >= 0),
    CONSTRAINT check_end_date CHECK (end_date > start_date)
);

-- Indexes for optimized campaign queries
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_current_amount ON campaigns(current_amount DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
-- Composite index for paginated queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status_created ON campaigns(status, created_at DESC);

-- Contributions table with transaction support
CREATE TABLE IF NOT EXISTS contributions (
    contribution_id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100) UNIQUE,
    payment_details JSONB,
    is_anonymous BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT check_amount_positive CHECK (amount > 0)
);

-- Indexes for contribution queries and analytics
CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(payment_status);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON contributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_transaction ON contributions(transaction_id);

-- Campaign updates/milestones
CREATE TABLE IF NOT EXISTS campaign_updates (
    update_id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_updates_campaign ON campaign_updates(campaign_id);

-- Fraud detection logs
CREATE TABLE IF NOT EXISTS fraud_alerts (
    alert_id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    user_id INTEGER,
    alert_type VARCHAR(50) NOT NULL, -- SUSPICIOUS_ACTIVITY, RAPID_CONTRIBUTIONS, FAKE_CAMPAIGN, etc.
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, RESOLVED, DISMISSED
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_campaign ON fraud_alerts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- CAMPAIGN, USER, CONTRIBUTION
    entity_id INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Session management for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- Materialized view for analytics (can be refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS campaign_analytics AS
SELECT
    c.campaign_id,
    c.title,
    c.creator_id,
    c.goal_amount,
    c.current_amount,
    c.category,
    c.status,
    COUNT(DISTINCT cont.user_id) as contributor_count,
    COUNT(cont.contribution_id) as total_contributions,
    COALESCE(SUM(cont.amount), 0) as total_raised,
    COALESCE(AVG(cont.amount), 0) as avg_contribution,
    (c.current_amount / NULLIF(c.goal_amount, 0) * 100) as progress_percentage,
    EXTRACT(EPOCH FROM (c.end_date - CURRENT_TIMESTAMP)) / 86400 as days_remaining
FROM campaigns c
LEFT JOIN contributions cont ON c.campaign_id = cont.campaign_id AND cont.payment_status = 'COMPLETED'
GROUP BY c.campaign_id, c.title, c.creator_id, c.goal_amount, c.current_amount, c.category, c.status, c.end_date;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_total_raised ON campaign_analytics(total_raised DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_contributor_count ON campaign_analytics(contributor_count DESC);

-- Function to update campaign current_amount (called after contribution)
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'COMPLETED' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'COMPLETED') THEN
        UPDATE campaigns
        SET current_amount = current_amount + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE campaign_id = NEW.campaign_id;
    ELSIF OLD.payment_status = 'COMPLETED' AND NEW.payment_status = 'REFUNDED' THEN
        UPDATE campaigns
        SET current_amount = current_amount - NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE campaign_id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update campaign amount
CREATE TRIGGER trigger_update_campaign_amount
AFTER INSERT OR UPDATE ON contributions
FOR EACH ROW
EXECUTE FUNCTION update_campaign_amount();

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_fraud_patterns()
RETURNS TRIGGER AS $$
DECLARE
    recent_contributions INTEGER;
    total_today DECIMAL;
BEGIN
    -- Check for rapid contributions from same user
    SELECT COUNT(*) INTO recent_contributions
    FROM contributions
    WHERE user_id = NEW.user_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';

    IF recent_contributions > 10 THEN
        INSERT INTO fraud_alerts (user_id, alert_type, severity, description, metadata)
        VALUES (
            NEW.user_id,
            'RAPID_CONTRIBUTIONS',
            'MEDIUM',
            'User made more than 10 contributions in 1 hour',
            jsonb_build_object('count', recent_contributions, 'contribution_id', NEW.contribution_id)
        );
    END IF;

    -- Check for large contributions
    IF NEW.amount > 10000 THEN
        INSERT INTO fraud_alerts (campaign_id, user_id, alert_type, severity, description, metadata)
        VALUES (
            NEW.campaign_id,
            NEW.user_id,
            'LARGE_CONTRIBUTION',
            'HIGH',
            'Contribution exceeds $10,000',
            jsonb_build_object('amount', NEW.amount, 'contribution_id', NEW.contribution_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fraud detection
CREATE TRIGGER trigger_fraud_detection
AFTER INSERT ON contributions
FOR EACH ROW
EXECUTE FUNCTION check_fraud_patterns();

-- Insert default admin user (password: admin123 - should be changed immediately)
-- Password hash for 'admin123' using BCrypt
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
    'admin',
    'admin@crowdfunding.com',
    '$2a$10$rBV2uGKEcC3w5mJKc6cIHOL0Yl5zL5J5GxKq5vO9Z1qF5qZ5qZ5qZ',
    'System Administrator',
    'ADMIN'
) ON CONFLICT (username) DO NOTHING;
