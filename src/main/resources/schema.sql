-- Hotel Booking Application Database Schema

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    rating DECIMAL(2,1),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hotel_id BIGINT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50) NOT NULL, -- SINGLE, DOUBLE, SUITE, DELUXE
    floor_number INT,
    max_occupancy INT NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    amenities TEXT, -- JSON or comma-separated
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room (hotel_id, room_number)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL, -- PENDING, CONFIRMED, CANCELLED, COMPLETED
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancellation_date TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    is_refundable BOOLEAN DEFAULT TRUE,
    refund_percentage DECIMAL(5,2) DEFAULT 100.00,
    cancellation_policy VARCHAR(50), -- FLEXIBLE, MODERATE, STRICT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_room_dates (room_id, check_in_date, check_out_date),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);

-- Pricing History table - tracks room price changes over time
CREATE TABLE IF NOT EXISTS pricing_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    reason VARCHAR(255),
    changed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_date (room_id, effective_date)
);

-- Cancellation Rules table - defines cancellation policies
CREATE TABLE IF NOT EXISTS cancellation_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    policy_name VARCHAR(50) NOT NULL UNIQUE, -- FLEXIBLE, MODERATE, STRICT
    days_before_checkin INT NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default cancellation rules
INSERT INTO cancellation_rules (policy_name, days_before_checkin, refund_percentage, description)
VALUES
    ('FLEXIBLE', 1, 100.00, 'Full refund if cancelled at least 1 day before check-in'),
    ('FLEXIBLE', 0, 50.00, '50% refund if cancelled on check-in day'),
    ('MODERATE', 7, 100.00, 'Full refund if cancelled at least 7 days before check-in'),
    ('MODERATE', 3, 50.00, '50% refund if cancelled 3-6 days before check-in'),
    ('MODERATE', 0, 0.00, 'No refund if cancelled less than 3 days before check-in'),
    ('STRICT', 14, 100.00, 'Full refund if cancelled at least 14 days before check-in'),
    ('STRICT', 7, 50.00, '50% refund if cancelled 7-13 days before check-in'),
    ('STRICT', 0, 0.00, 'No refund if cancelled less than 7 days before check-in')
ON DUPLICATE KEY UPDATE days_before_checkin=days_before_checkin;

-- Audit Log table - tracks all important operations
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- RESERVATION, ROOM, PRICING
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, CANCEL
    details TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
);
