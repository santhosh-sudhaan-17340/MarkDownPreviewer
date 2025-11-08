-- PostgreSQL Initialization Script for Delivery Platform

-- Create tables for transactional data

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(255) NOT NULL,
    restaurant_id VARCHAR(255) NOT NULL,
    delivery_partner_id VARCHAR(255),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    delivery_address JSONB NOT NULL,
    restaurant_address JSONB NOT NULL,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    special_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    transaction_id VARCHAR(255) UNIQUE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    gateway_response JSONB,
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    refund_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order tracking history
CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    status VARCHAR(50) NOT NULL,
    location JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery partner locations (for real-time tracking)
CREATE TABLE IF NOT EXISTS partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    bearing DECIMAL(5, 2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud detection logs
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'order', 'user', 'payment'
    entity_id VARCHAR(255) NOT NULL,
    risk_score DECIMAL(5, 2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    fraud_indicators JSONB,
    action_taken VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_partner ON orders(delivery_partner_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);

CREATE INDEX idx_tracking_order ON order_tracking(order_id);
CREATE INDEX idx_tracking_created ON order_tracking(created_at DESC);

CREATE INDEX idx_partner_locations_partner ON partner_locations(partner_id);
CREATE INDEX idx_partner_locations_timestamp ON partner_locations(timestamp DESC);

CREATE INDEX idx_fraud_entity ON fraud_logs(entity_type, entity_id);
CREATE INDEX idx_fraud_risk ON fraud_logs(risk_level);
CREATE INDEX idx_fraud_created ON fraud_logs(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
