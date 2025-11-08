-- Initialize Database with Sample Data for MLCP System

-- Insert Parking Floors
INSERT INTO parking_floor (floor_id, floor_number, floor_name, total_slots, created_at) VALUES
(1, 1, 'Ground Floor', 50, CURRENT_TIMESTAMP),
(2, 2, 'First Floor', 50, CURRENT_TIMESTAMP),
(3, 3, 'Second Floor', 50, CURRENT_TIMESTAMP),
(4, 4, 'Third Floor', 50, CURRENT_TIMESTAMP);

-- Insert Entry Gates
INSERT INTO entry_gate (gate_id, gate_name, floor_id, x_coordinate, y_coordinate, is_active) VALUES
(1, 'Gate A - Ground', 1, 0, 0, TRUE),
(2, 'Gate B - Ground', 1, 100, 0, TRUE),
(3, 'Gate C - First', 2, 0, 0, TRUE),
(4, 'Gate D - Second', 3, 0, 0, TRUE);

-- Insert Parking Slots for Ground Floor
-- Two-Wheeler Slots (1-20)
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('G-2W-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    1,
    'TWO_WHEELER',
    'AVAILABLE',
    CASE WHEN n <= 5 THEN TRUE ELSE FALSE END,
    CASE WHEN n <= 2 THEN TRUE ELSE FALSE END,
    (n * 5),
    10,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(1, 20) n;

-- Car Slots (21-40)
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('G-CAR-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    1,
    'CAR',
    'AVAILABLE',
    CASE WHEN n <= 25 THEN TRUE ELSE FALSE END,
    CASE WHEN n <= 22 THEN TRUE ELSE FALSE END,
    (n * 5),
    30,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(21, 40) n;

-- Truck Slots (41-50)
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('G-TRK-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    1,
    'TRUCK',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    50,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(41, 50) n;

-- Insert Parking Slots for First Floor
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F1-2W-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    2,
    'TWO_WHEELER',
    'AVAILABLE',
    CASE WHEN n <= 3 THEN TRUE ELSE FALSE END,
    FALSE,
    (n * 5),
    10,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(1, 15) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F1-CAR-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    2,
    'CAR',
    'AVAILABLE',
    CASE WHEN n <= 20 THEN TRUE ELSE FALSE END,
    CASE WHEN n <= 18 THEN TRUE ELSE FALSE END,
    (n * 5),
    30,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(16, 40) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F1-TRK-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    2,
    'TRUCK',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    50,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(41, 50) n;

-- Insert Parking Slots for Second Floor
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F2-2W-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    3,
    'TWO_WHEELER',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    10,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(1, 20) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F2-CAR-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    3,
    'CAR',
    'AVAILABLE',
    CASE WHEN n <= 25 THEN TRUE ELSE FALSE END,
    FALSE,
    (n * 5),
    30,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(21, 45) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F2-TRK-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    3,
    'TRUCK',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    50,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(46, 50) n;

-- Insert Parking Slots for Third Floor
INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F3-2W-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    4,
    'TWO_WHEELER',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    10,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(1, 15) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F3-CAR-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    4,
    'CAR',
    'AVAILABLE',
    CASE WHEN n <= 20 THEN TRUE ELSE FALSE END,
    FALSE,
    (n * 5),
    30,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(16, 45) n;

INSERT INTO parking_slot (slot_number, floor_id, vehicle_type, slot_status, is_ev_charging, is_vip, x_coordinate, y_coordinate, version, created_at, updated_at)
SELECT
    CONCAT('F3-TRK-', LPAD(CAST(n AS VARCHAR), 3, '0')),
    4,
    'TRUCK',
    'AVAILABLE',
    FALSE,
    FALSE,
    (n * 5),
    50,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM SYSTEM_RANGE(46, 50) n;

-- Insert Pricing Rules
INSERT INTO pricing_rule (vehicle_type, base_price, hourly_rate, daily_rate, penalty_rate, ev_charging_rate, vip_discount_percent, effective_from, is_active) VALUES
('TWO_WHEELER', 10.00, 5.00, 50.00, 2.00, 3.00, 10, CURRENT_TIMESTAMP, TRUE),
('CAR', 20.00, 10.00, 100.00, 5.00, 5.00, 15, CURRENT_TIMESTAMP, TRUE),
('TRUCK', 40.00, 20.00, 200.00, 10.00, 0.00, 5, CURRENT_TIMESTAMP, TRUE);
