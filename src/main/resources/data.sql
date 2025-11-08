-- Sample Data for Hotel Booking Application

-- Insert sample hotels
INSERT INTO hotels (name, address, city, state, country, zip_code, phone, email, rating, description, created_at, updated_at)
VALUES
    ('Grand Plaza Hotel', '123 Main Street', 'New York', 'NY', 'USA', '10001', '+1-212-555-0100', 'info@grandplaza.com', 4.5, 'Luxury hotel in the heart of New York City', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Ocean View Resort', '456 Beach Road', 'Miami', 'FL', 'USA', '33139', '+1-305-555-0200', 'reservations@oceanview.com', 4.8, 'Beautiful beachfront resort with stunning ocean views', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Mountain Lodge', '789 Peak Avenue', 'Denver', 'CO', 'USA', '80202', '+1-303-555-0300', 'contact@mountainlodge.com', 4.3, 'Cozy mountain retreat perfect for nature lovers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample rooms
INSERT INTO rooms (hotel_id, room_number, room_type, floor_number, max_occupancy, base_price, current_price, description, amenities, is_available, created_at, updated_at)
VALUES
    -- Grand Plaza Hotel rooms
    (1, '101', 'SINGLE', 1, 1, 150.00, 150.00, 'Comfortable single room with city view', 'WiFi, TV, Mini-bar, Air conditioning', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, '102', 'DOUBLE', 1, 2, 200.00, 200.00, 'Spacious double room with city view', 'WiFi, TV, Mini-bar, Air conditioning, Coffee maker', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, '201', 'SUITE', 2, 4, 400.00, 400.00, 'Luxury suite with panoramic city views', 'WiFi, TV, Mini-bar, Air conditioning, Jacuzzi, Living room', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (1, '202', 'DELUXE', 2, 2, 300.00, 300.00, 'Deluxe room with premium amenities', 'WiFi, TV, Mini-bar, Air conditioning, Work desk, Balcony', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Ocean View Resort rooms
    (2, '101', 'DOUBLE', 1, 2, 250.00, 250.00, 'Ocean-facing double room', 'WiFi, TV, Mini-bar, Air conditioning, Balcony', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, '102', 'SUITE', 1, 4, 500.00, 500.00, 'Beachfront suite with private terrace', 'WiFi, TV, Mini-bar, Air conditioning, Kitchen, Private terrace', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, '201', 'DELUXE', 2, 3, 350.00, 350.00, 'Deluxe ocean view room', 'WiFi, TV, Mini-bar, Air conditioning, Ocean view balcony', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Mountain Lodge rooms
    (3, '101', 'DOUBLE', 1, 2, 180.00, 180.00, 'Mountain view double room', 'WiFi, TV, Fireplace, Air conditioning', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, '102', 'SUITE', 1, 4, 380.00, 380.00, 'Family suite with mountain views', 'WiFi, TV, Fireplace, Air conditioning, Kitchenette', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, '201', 'SINGLE', 2, 1, 120.00, 120.00, 'Cozy single room', 'WiFi, TV, Air conditioning', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample users
INSERT INTO users (first_name, last_name, email, phone, address, city, state, country, zip_code, created_at, updated_at)
VALUES
    ('John', 'Doe', 'john.doe@email.com', '+1-555-0101', '100 Park Ave', 'New York', 'NY', 'USA', '10001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Jane', 'Smith', 'jane.smith@email.com', '+1-555-0102', '200 Ocean Drive', 'Miami', 'FL', 'USA', '33139', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Bob', 'Johnson', 'bob.johnson@email.com', '+1-555-0103', '300 Mountain Road', 'Denver', 'CO', 'USA', '80202', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Alice', 'Williams', 'alice.williams@email.com', '+1-555-0104', '400 Maple Street', 'Boston', 'MA', 'USA', '02101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample reservations
INSERT INTO reservations (room_id, user_id, check_in_date, check_out_date, number_of_guests, total_price, status, booking_date, cancellation_policy, is_refundable, refund_percentage, created_at, updated_at)
VALUES
    (1, 1, DATEADD('DAY', 7, CURRENT_DATE), DATEADD('DAY', 10, CURRENT_DATE), 1, 450.00, 'CONFIRMED', CURRENT_TIMESTAMP, 'MODERATE', true, 100.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 2, DATEADD('DAY', 14, CURRENT_DATE), DATEADD('DAY', 21, CURRENT_DATE), 2, 1750.00, 'CONFIRMED', CURRENT_TIMESTAMP, 'FLEXIBLE', true, 100.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (8, 3, DATEADD('DAY', 30, CURRENT_DATE), DATEADD('DAY', 35, CURRENT_DATE), 2, 900.00, 'PENDING', CURRENT_TIMESTAMP, 'MODERATE', true, 100.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert cancellation rules
INSERT INTO cancellation_rules (policy_name, days_before_checkin, refund_percentage, description, created_at)
VALUES
    ('FLEXIBLE', 1, 100.00, 'Full refund if cancelled at least 1 day before check-in', CURRENT_TIMESTAMP),
    ('FLEXIBLE', 0, 50.00, '50% refund if cancelled on check-in day', CURRENT_TIMESTAMP),
    ('MODERATE', 7, 100.00, 'Full refund if cancelled at least 7 days before check-in', CURRENT_TIMESTAMP),
    ('MODERATE', 3, 50.00, '50% refund if cancelled 3-6 days before check-in', CURRENT_TIMESTAMP),
    ('MODERATE', 0, 0.00, 'No refund if cancelled less than 3 days before check-in', CURRENT_TIMESTAMP),
    ('STRICT', 14, 100.00, 'Full refund if cancelled at least 14 days before check-in', CURRENT_TIMESTAMP),
    ('STRICT', 7, 50.00, '50% refund if cancelled 7-13 days before check-in', CURRENT_TIMESTAMP),
    ('STRICT', 0, 0.00, 'No refund if cancelled less than 7 days before check-in', CURRENT_TIMESTAMP);

-- Insert sample pricing history
INSERT INTO pricing_history (room_id, old_price, new_price, effective_date, reason, changed_by, created_at)
VALUES
    (1, 140.00, 150.00, DATEADD('DAY', -30, CURRENT_DATE), 'Seasonal price adjustment', 'ADMIN', CURRENT_TIMESTAMP),
    (2, 180.00, 200.00, DATEADD('DAY', -30, CURRENT_DATE), 'High demand period', 'ADMIN', CURRENT_TIMESTAMP),
    (5, 230.00, 250.00, DATEADD('DAY', -15, CURRENT_DATE), 'Summer season pricing', 'ADMIN', CURRENT_TIMESTAMP);

-- Insert sample audit logs
INSERT INTO audit_log (entity_type, entity_id, action, details, performed_by, created_at)
VALUES
    ('RESERVATION', 1, 'CREATE', 'Reservation created for room 101', 'SYSTEM', CURRENT_TIMESTAMP),
    ('RESERVATION', 1, 'UPDATE', 'Reservation confirmed', 'SYSTEM', CURRENT_TIMESTAMP),
    ('PRICING', 1, 'UPDATE', 'Price updated from 140.00 to 150.00', 'ADMIN', CURRENT_TIMESTAMP);
