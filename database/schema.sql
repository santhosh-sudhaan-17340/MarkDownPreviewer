-- Inventory & Warehouse Tracking System Database Schema
-- Features: Batch tracking, Transaction logs, Optimistic locking, Low-stock alerts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- WAREHOUSES TABLE
-- ========================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    manager_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1 -- For optimistic locking
);

-- ========================================
-- ITEMS TABLE (with optimistic locking)
-- ========================================
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10, -- Minimum stock level before alert
    reorder_quantity INTEGER NOT NULL DEFAULT 50, -- Quantity to reorder
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1 -- For optimistic locking
);

-- ========================================
-- BATCHES TABLE (Batch tracking)
-- ========================================
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    manufacturing_date DATE,
    expiry_date DATE,
    supplier VARCHAR(255),
    cost_per_unit DECIMAL(10, 2) CHECK (cost_per_unit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1, -- For optimistic locking
    UNIQUE(batch_number, item_id, warehouse_id),
    CHECK (expiry_date IS NULL OR expiry_date > manufacturing_date)
);

-- ========================================
-- TRANSACTION TYPES ENUM
-- ========================================
CREATE TYPE transaction_type AS ENUM (
    'INBOUND',      -- Receiving stock
    'OUTBOUND',     -- Shipping/selling stock
    'TRANSFER',     -- Moving between warehouses
    'ADJUSTMENT',   -- Manual adjustments (damage, loss, etc.)
    'RETURN'        -- Customer returns
);

-- ========================================
-- INVENTORY TRANSACTIONS TABLE (Transaction logging)
-- ========================================
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type transaction_type NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    batch_id UUID REFERENCES batches(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2),
    reference_number VARCHAR(100), -- PO number, invoice number, etc.
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- For transfers, track source and destination
    transfer_from_warehouse_id UUID REFERENCES warehouses(id),
    transfer_to_warehouse_id UUID REFERENCES warehouses(id),

    -- Metadata
    metadata JSONB -- Additional flexible data
);

-- ========================================
-- LOW STOCK ALERTS TABLE
-- ========================================
CREATE TABLE low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL,
    reorder_level INTEGER NOT NULL,
    alert_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- INVENTORY SUMMARY VIEW (for performance)
-- ========================================
CREATE VIEW inventory_summary AS
SELECT
    i.id AS item_id,
    i.sku,
    i.name AS item_name,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    COALESCE(SUM(b.quantity), 0) AS total_quantity,
    i.reorder_level,
    i.unit_price,
    CASE
        WHEN COALESCE(SUM(b.quantity), 0) <= i.reorder_level THEN true
        ELSE false
    END AS is_low_stock
FROM items i
CROSS JOIN warehouses w
LEFT JOIN batches b ON b.item_id = i.id AND b.warehouse_id = w.id
WHERE i.is_active = true AND w.is_active = true
GROUP BY i.id, i.sku, i.name, w.id, w.name, i.reorder_level, i.unit_price;

-- ========================================
-- INDEXES for Performance
-- ========================================
-- Items
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_active ON items(is_active);

-- Batches
CREATE INDEX idx_batches_item_id ON batches(item_id);
CREATE INDEX idx_batches_warehouse_id ON batches(warehouse_id);
CREATE INDEX idx_batches_batch_number ON batches(batch_number);
CREATE INDEX idx_batches_expiry_date ON batches(expiry_date);

-- Transactions
CREATE INDEX idx_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX idx_transactions_warehouse_id ON inventory_transactions(warehouse_id);
CREATE INDEX idx_transactions_batch_id ON inventory_transactions(batch_id);
CREATE INDEX idx_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON inventory_transactions(created_at DESC);

-- Low Stock Alerts
CREATE INDEX idx_alerts_item_warehouse ON low_stock_alerts(item_id, warehouse_id);
CREATE INDEX idx_alerts_status ON low_stock_alerts(alert_status);

-- ========================================
-- TRIGGERS for automatic timestamp updates
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- TRIGGER for automatic low stock alert creation
-- ========================================
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_qty INTEGER;
    reorder_lvl INTEGER;
BEGIN
    -- Calculate current quantity for this item in this warehouse
    SELECT COALESCE(SUM(quantity), 0) INTO current_qty
    FROM batches
    WHERE item_id = NEW.item_id AND warehouse_id = NEW.warehouse_id;

    -- Get reorder level
    SELECT reorder_level INTO reorder_lvl
    FROM items
    WHERE id = NEW.item_id;

    -- If stock is low, create alert if not already exists
    IF current_qty <= reorder_lvl THEN
        INSERT INTO low_stock_alerts (item_id, warehouse_id, current_quantity, reorder_level)
        VALUES (NEW.item_id, NEW.warehouse_id, current_qty, reorder_lvl)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_low_stock
AFTER INSERT OR UPDATE ON batches
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- ========================================
-- Sample Data (optional)
-- ========================================
-- Insert sample warehouses
INSERT INTO warehouses (name, location, capacity, manager_name, contact_email) VALUES
('Main Warehouse', '123 Industrial Blvd, City, State 12345', 10000, 'John Doe', 'john@example.com'),
('Secondary Warehouse', '456 Commerce Dr, Town, State 67890', 5000, 'Jane Smith', 'jane@example.com');
