-- Parcel Drop-Locker Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locker Locations Table
CREATE TABLE locker_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSONB, -- {"open": "06:00", "close": "22:00"}
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slot Size Types
CREATE TYPE slot_size AS ENUM ('small', 'medium', 'large', 'extra_large');

-- Locker Slots Table
CREATE TABLE locker_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locker_location_id UUID NOT NULL REFERENCES locker_locations(id) ON DELETE CASCADE,
    slot_number VARCHAR(20) NOT NULL,
    size slot_size NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'broken')),
    last_health_check TIMESTAMP,
    health_status VARCHAR(20) DEFAULT 'good' CHECK (health_status IN ('good', 'warning', 'critical', 'unknown')),
    temperature DECIMAL(5, 2), -- For temperature monitoring
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(locker_location_id, slot_number)
);

-- Create index for faster slot searches
CREATE INDEX idx_locker_slots_status ON locker_slots(status);
CREATE INDEX idx_locker_slots_location_status ON locker_slots(locker_location_id, status);
CREATE INDEX idx_locker_slots_size_status ON locker_slots(size, status);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'operator')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parcels Table
CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    sender_phone VARCHAR(20),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    size slot_size NOT NULL,
    weight DECIMAL(10, 2), -- in kg
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_transit', 'delivered_to_locker',
        'picked_up', 'expired', 'returned', 'cancelled'
    )),
    delivery_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcels_tracking ON parcels(tracking_number);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_recipient_email ON parcels(recipient_email);

-- Reservations Table (Links Parcels to Locker Slots)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES locker_slots(id) ON DELETE CASCADE,
    pickup_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    pickup_attempts INTEGER DEFAULT 0,
    last_pickup_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_pickup_code ON reservations(pickup_code);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);
CREATE INDEX idx_reservations_parcel_id ON reservations(parcel_id);
CREATE INDEX idx_reservations_slot_id ON reservations(slot_id);

-- Locker Health Logs Table
CREATE TABLE locker_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES locker_slots(id) ON DELETE CASCADE,
    health_status VARCHAR(20) NOT NULL,
    temperature DECIMAL(5, 2),
    door_status VARCHAR(20), -- 'open', 'closed', 'jammed'
    sensor_status JSONB, -- {"motion": "ok", "light": "ok", "lock": "ok"}
    error_message TEXT,
    checked_by UUID REFERENCES admin_users(id),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_logs_slot_id ON locker_health_logs(slot_id);
CREATE INDEX idx_health_logs_checked_at ON locker_health_logs(checked_at);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'reservation', 'parcel', 'slot', 'user'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'pickup', 'expire'
    performed_by UUID, -- Can be user_id or admin_user_id
    performed_by_type VARCHAR(20), -- 'user', 'admin', 'system'
    changes JSONB, -- Store old and new values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Analytics/Metrics Table
CREATE TABLE locker_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locker_location_id UUID NOT NULL REFERENCES locker_locations(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_pickups INTEGER DEFAULT 0,
    expired_parcels INTEGER DEFAULT 0,
    average_pickup_time_hours DECIMAL(10, 2),
    peak_occupancy_percentage DECIMAL(5, 2),
    maintenance_events INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(locker_location_id, metric_date)
);

CREATE INDEX idx_locker_metrics_date ON locker_metrics(metric_date);

-- Notification Queue Table
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20),
    notification_type VARCHAR(50) NOT NULL, -- 'delivery_confirmation', 'expiry_warning', 'pickup_reminder'
    subject VARCHAR(255),
    message TEXT NOT NULL,
    parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_locker_locations_updated_at BEFORE UPDATE ON locker_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locker_slots_updated_at BEFORE UPDATE ON locker_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for locker occupancy status
CREATE OR REPLACE VIEW locker_occupancy_status AS
SELECT
    ll.id as locker_location_id,
    ll.name as locker_name,
    ll.city,
    ll.status as locker_status,
    COUNT(ls.id) as total_slots,
    COUNT(CASE WHEN ls.status = 'available' THEN 1 END) as available_slots,
    COUNT(CASE WHEN ls.status = 'occupied' THEN 1 END) as occupied_slots,
    COUNT(CASE WHEN ls.status = 'reserved' THEN 1 END) as reserved_slots,
    COUNT(CASE WHEN ls.status = 'maintenance' THEN 1 END) as maintenance_slots,
    COUNT(CASE WHEN ls.status = 'broken' THEN 1 END) as broken_slots,
    ROUND(COUNT(CASE WHEN ls.status IN ('occupied', 'reserved') THEN 1 END)::NUMERIC / NULLIF(COUNT(ls.id), 0) * 100, 2) as occupancy_percentage
FROM locker_locations ll
LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
GROUP BY ll.id, ll.name, ll.city, ll.status;

-- Create view for expiring parcels
CREATE OR REPLACE VIEW expiring_parcels AS
SELECT
    r.id as reservation_id,
    r.pickup_code,
    r.expires_at,
    p.tracking_number,
    p.recipient_name,
    p.recipient_email,
    p.recipient_phone,
    ls.slot_number,
    ll.name as locker_name,
    ll.address as locker_address,
    EXTRACT(EPOCH FROM (r.expires_at - CURRENT_TIMESTAMP))/3600 as hours_until_expiry
FROM reservations r
JOIN parcels p ON r.parcel_id = p.id
JOIN locker_slots ls ON r.slot_id = ls.id
JOIN locker_locations ll ON ls.locker_location_id = ll.id
WHERE r.status = 'active'
    AND r.expires_at > CURRENT_TIMESTAMP
    AND r.expires_at < CURRENT_TIMESTAMP + INTERVAL '24 hours'
ORDER BY r.expires_at;
