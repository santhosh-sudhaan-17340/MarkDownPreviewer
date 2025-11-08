-- Parcel Drop-Locker Management System Database Schema

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for better type safety
CREATE TYPE slot_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE');
CREATE TYPE locker_status AS ENUM ('ACTIVE', 'MAINTENANCE', 'OFFLINE', 'FULL');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE parcel_status AS ENUM ('PENDING', 'IN_LOCKER', 'PICKED_UP', 'EXPIRED', 'RETURNED');
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'CUSTOMER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Locker locations
CREATE TABLE locker_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSONB, -- {"monday": {"open": "08:00", "close": "22:00"}, ...}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locker_locations_city ON locker_locations(city);
CREATE INDEX idx_locker_locations_coordinates ON locker_locations(latitude, longitude);

-- Main locker units
CREATE TABLE lockers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locker_locations(id) ON DELETE CASCADE,
    locker_number VARCHAR(50) NOT NULL,
    status locker_status DEFAULT 'ACTIVE',
    total_slots INTEGER NOT NULL DEFAULT 0,
    occupied_slots INTEGER NOT NULL DEFAULT 0,
    temperature_celsius DECIMAL(5, 2), -- For monitoring
    humidity_percent DECIMAL(5, 2),
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    firmware_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, locker_number)
);

CREATE INDEX idx_lockers_location ON lockers(location_id);
CREATE INDEX idx_lockers_status ON lockers(status);
CREATE INDEX idx_lockers_availability ON lockers(status, occupied_slots, total_slots) WHERE status = 'ACTIVE';

-- Individual locker slots
CREATE TABLE locker_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locker_id UUID REFERENCES lockers(id) ON DELETE CASCADE,
    slot_number VARCHAR(10) NOT NULL,
    size slot_size NOT NULL,
    status slot_status DEFAULT 'AVAILABLE',
    width_cm DECIMAL(6, 2) NOT NULL,
    height_cm DECIMAL(6, 2) NOT NULL,
    depth_cm DECIMAL(6, 2) NOT NULL,
    max_weight_kg DECIMAL(6, 2) NOT NULL,
    current_parcel_id UUID, -- Will be linked to parcels table
    last_opened TIMESTAMP,
    door_sensor_ok BOOLEAN DEFAULT TRUE,
    lock_sensor_ok BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(locker_id, slot_number)
);

CREATE INDEX idx_locker_slots_locker ON locker_slots(locker_id);
CREATE INDEX idx_locker_slots_status ON locker_slots(status);
CREATE INDEX idx_locker_slots_size_status ON locker_slots(size, status);
CREATE INDEX idx_locker_slots_available ON locker_slots(locker_id, size, status) WHERE status = 'AVAILABLE';

-- Parcels
CREATE TABLE parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    sender_id UUID REFERENCES users(id),
    sender_name VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20),
    sender_email VARCHAR(255),
    recipient_id UUID REFERENCES users(id),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    parcel_size slot_size NOT NULL,
    weight_kg DECIMAL(6, 2),
    status parcel_status DEFAULT 'PENDING',
    locker_id UUID REFERENCES lockers(id),
    slot_id UUID REFERENCES locker_slots(id),
    pickup_code VARCHAR(10) UNIQUE,
    pickup_code_expires_at TIMESTAMP,
    dropped_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    expires_at TIMESTAMP,
    days_until_expiry INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN expires_at IS NOT NULL
            THEN EXTRACT(DAY FROM (expires_at - CURRENT_TIMESTAMP))
            ELSE NULL
        END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcels_tracking ON parcels(tracking_number);
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_recipient ON parcels(recipient_email, recipient_phone);
CREATE INDEX idx_parcels_locker ON parcels(locker_id, slot_id);
CREATE INDEX idx_parcels_pickup_code ON parcels(pickup_code) WHERE pickup_code IS NOT NULL;
CREATE INDEX idx_parcels_expiry ON parcels(expires_at, status) WHERE status IN ('IN_LOCKER', 'RESERVED');

-- Reservations (for atomic slot booking)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES locker_slots(id),
    reserved_by UUID REFERENCES users(id),
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reservations_slot ON reservations(slot_id, is_active);
CREATE INDEX idx_reservations_parcel ON reservations(parcel_id);
CREATE INDEX idx_reservations_expiry ON reservations(expires_at, is_active) WHERE is_active = TRUE;

-- Audit log for all operations
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'locker', 'slot', 'parcel', 'reservation'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RESERVE', 'RELEASE', 'PICKUP'
    performed_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(performed_by);

-- Locker health metrics (time-series data)
CREATE TABLE locker_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locker_id UUID REFERENCES lockers(id) ON DELETE CASCADE,
    temperature_celsius DECIMAL(5, 2),
    humidity_percent DECIMAL(5, 2),
    power_status BOOLEAN,
    network_status BOOLEAN,
    door_errors INTEGER DEFAULT 0,
    lock_errors INTEGER DEFAULT 0,
    total_opens_24h INTEGER DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_metrics_locker_time ON locker_health_metrics(locker_id, recorded_at DESC);
CREATE INDEX idx_health_metrics_recorded ON locker_health_metrics(recorded_at DESC);

-- Triggers for automatic updates

-- Update locker occupied slots count
CREATE OR REPLACE FUNCTION update_locker_occupied_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            UPDATE lockers
            SET occupied_slots = (
                SELECT COUNT(*)
                FROM locker_slots
                WHERE locker_id = NEW.locker_id
                AND status IN ('RESERVED', 'OCCUPIED')
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.locker_id;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        UPDATE lockers
        SET total_slots = total_slots + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.locker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_locker_occupied
AFTER INSERT OR UPDATE ON locker_slots
FOR EACH ROW
EXECUTE FUNCTION update_locker_occupied_count();

-- Auto-update locker status based on capacity
CREATE OR REPLACE FUNCTION auto_update_locker_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.occupied_slots >= NEW.total_slots THEN
        NEW.status = 'FULL';
    ELSIF NEW.status = 'FULL' AND NEW.occupied_slots < NEW.total_slots THEN
        NEW.status = 'ACTIVE';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_locker_status
BEFORE UPDATE ON lockers
FOR EACH ROW
WHEN (OLD.occupied_slots IS DISTINCT FROM NEW.occupied_slots)
EXECUTE FUNCTION auto_update_locker_status();

-- Update parcel updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_parcels_updated_at
BEFORE UPDATE ON parcels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Available slots by location and size
CREATE OR REPLACE VIEW v_available_slots AS
SELECT
    ll.id as location_id,
    ll.name as location_name,
    ll.city,
    ll.address,
    l.id as locker_id,
    l.locker_number,
    ls.id as slot_id,
    ls.slot_number,
    ls.size,
    ls.width_cm,
    ls.height_cm,
    ls.depth_cm,
    ls.max_weight_kg,
    l.status as locker_status
FROM locker_locations ll
JOIN lockers l ON ll.id = l.location_id
JOIN locker_slots ls ON l.id = ls.locker_id
WHERE l.status = 'ACTIVE'
  AND ls.status = 'AVAILABLE'
  AND ll.is_active = TRUE;

-- Locker capacity overview
CREATE OR REPLACE VIEW v_locker_capacity AS
SELECT
    ll.name as location_name,
    ll.city,
    l.locker_number,
    l.status,
    l.total_slots,
    l.occupied_slots,
    (l.total_slots - l.occupied_slots) as available_slots,
    ROUND((l.occupied_slots::DECIMAL / NULLIF(l.total_slots, 0) * 100), 2) as occupancy_percent,
    l.temperature_celsius,
    l.humidity_percent,
    l.last_maintenance,
    l.next_maintenance
FROM lockers l
JOIN locker_locations ll ON l.location_id = ll.id;

-- Expired parcels that need attention
CREATE OR REPLACE VIEW v_expired_parcels AS
SELECT
    p.id,
    p.tracking_number,
    p.recipient_name,
    p.recipient_phone,
    p.recipient_email,
    ll.name as location_name,
    l.locker_number,
    ls.slot_number,
    p.dropped_at,
    p.expires_at,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.expires_at)) as days_overdue
FROM parcels p
JOIN locker_slots ls ON p.slot_id = ls.id
JOIN lockers l ON ls.locker_id = l.id
JOIN locker_locations ll ON l.location_id = ll.id
WHERE p.status = 'IN_LOCKER'
  AND p.expires_at < CURRENT_TIMESTAMP
ORDER BY p.expires_at ASC;

-- Locker health status
CREATE OR REPLACE VIEW v_locker_health_status AS
SELECT
    l.id as locker_id,
    ll.name as location_name,
    l.locker_number,
    l.status,
    l.temperature_celsius,
    l.humidity_percent,
    COUNT(ls.id) FILTER (WHERE ls.door_sensor_ok = FALSE OR ls.lock_sensor_ok = FALSE) as faulty_slots,
    l.last_maintenance,
    l.next_maintenance,
    CASE
        WHEN l.next_maintenance < CURRENT_TIMESTAMP THEN 'OVERDUE'
        WHEN l.next_maintenance < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'DUE_SOON'
        ELSE 'OK'
    END as maintenance_status
FROM lockers l
JOIN locker_locations ll ON l.location_id = ll.id
LEFT JOIN locker_slots ls ON l.id = ls.locker_id
GROUP BY l.id, ll.name;

-- Function to generate unique pickup code
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-digit alphanumeric code (excluding confusing characters like O, 0, I, 1)
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
        code := TRANSLATE(code, 'O0I1', 'ABCD');

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM parcels WHERE pickup_code = code) INTO exists;

        EXIT WHEN NOT exists;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function for atomic slot reservation with row-level locking
CREATE OR REPLACE FUNCTION reserve_slot_atomic(
    p_parcel_id UUID,
    p_location_id UUID,
    p_slot_size slot_size,
    p_user_id UUID,
    p_reservation_duration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
    success BOOLEAN,
    slot_id UUID,
    reservation_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_slot_id UUID;
    v_reservation_id UUID;
    v_locker_id UUID;
BEGIN
    -- Find and lock an available slot atomically
    SELECT ls.id, ls.locker_id INTO v_slot_id, v_locker_id
    FROM locker_slots ls
    JOIN lockers l ON ls.locker_id = l.id
    WHERE l.location_id = p_location_id
      AND ls.size = p_slot_size
      AND ls.status = 'AVAILABLE'
      AND l.status = 'ACTIVE'
    ORDER BY l.occupied_slots ASC, ls.slot_number ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED; -- Critical for atomic operations

    IF v_slot_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'No available slots of the requested size'::TEXT;
        RETURN;
    END IF;

    -- Update slot status
    UPDATE locker_slots
    SET status = 'RESERVED',
        current_parcel_id = p_parcel_id
    WHERE id = v_slot_id;

    -- Create reservation record
    INSERT INTO reservations (parcel_id, slot_id, reserved_by, expires_at)
    VALUES (
        p_parcel_id,
        v_slot_id,
        p_user_id,
        CURRENT_TIMESTAMP + (p_reservation_duration_minutes || ' minutes')::INTERVAL
    )
    RETURNING id INTO v_reservation_id;

    -- Update parcel with slot info
    UPDATE parcels
    SET slot_id = v_slot_id,
        locker_id = v_locker_id,
        status = 'RESERVED'
    WHERE id = p_parcel_id;

    RETURN QUERY SELECT TRUE, v_slot_id, v_reservation_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Release slots from expired reservations
    WITH expired_reservations AS (
        UPDATE reservations
        SET is_active = FALSE,
            cancelled_at = CURRENT_TIMESTAMP
        WHERE is_active = TRUE
          AND expires_at < CURRENT_TIMESTAMP
          AND confirmed_at IS NULL
        RETURNING slot_id, parcel_id
    )
    UPDATE locker_slots ls
    SET status = 'AVAILABLE',
        current_parcel_id = NULL
    FROM expired_reservations er
    WHERE ls.id = er.slot_id;

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- Update parcel status
    UPDATE parcels
    SET status = 'PENDING',
        slot_id = NULL,
        locker_id = NULL
    WHERE id IN (
        SELECT parcel_id FROM reservations
        WHERE is_active = FALSE
          AND cancelled_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
    );

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON DATABASE CURRENT_DATABASE IS 'Parcel Drop-Locker Management System - Production Database';
