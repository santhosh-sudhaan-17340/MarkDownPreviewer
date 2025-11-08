const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'lockers.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Creating database schema...');

// Create tables with proper indexing
db.exec(`
    -- Locker Locations
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status TEXT CHECK(status IN ('active', 'maintenance', 'inactive')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Locker Units (physical lockers at locations)
    CREATE TABLE IF NOT EXISTS lockers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        locker_number TEXT NOT NULL,
        total_slots INTEGER NOT NULL,
        status TEXT CHECK(status IN ('operational', 'maintenance', 'full', 'offline')) DEFAULT 'operational',
        last_health_check DATETIME,
        health_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        UNIQUE(location_id, locker_number)
    );

    -- Locker Slots (individual compartments)
    CREATE TABLE IF NOT EXISTS slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locker_id INTEGER NOT NULL,
        slot_number TEXT NOT NULL,
        size TEXT CHECK(size IN ('small', 'medium', 'large', 'extra_large')) NOT NULL,
        dimensions TEXT, -- e.g., "30x30x40cm"
        status TEXT CHECK(status IN ('available', 'occupied', 'reserved', 'maintenance')) DEFAULT 'available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (locker_id) REFERENCES lockers(id) ON DELETE CASCADE,
        UNIQUE(locker_id, slot_number)
    );

    -- Parcels
    CREATE TABLE IF NOT EXISTS parcels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_number TEXT NOT NULL UNIQUE,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        sender_phone TEXT,
        recipient_name TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        size TEXT CHECK(size IN ('small', 'medium', 'large', 'extra_large')) NOT NULL,
        weight_kg DECIMAL(10, 2),
        description TEXT,
        status TEXT CHECK(status IN ('pending', 'in_transit', 'delivered', 'picked_up', 'expired', 'returned')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Reservations (with atomic locking)
    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parcel_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        pickup_code TEXT NOT NULL UNIQUE,
        pin_code TEXT NOT NULL, -- 4-digit PIN for verification
        reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        delivered_at DATETIME,
        expires_at DATETIME NOT NULL,
        picked_up_at DATETIME,
        status TEXT CHECK(status IN ('reserved', 'delivered', 'picked_up', 'expired', 'cancelled')) DEFAULT 'reserved',
        reminder_sent BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE CASCADE,
        FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE RESTRICT,
        UNIQUE(parcel_id)
    );

    -- Audit Log for all operations
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        user_type TEXT, -- 'user', 'admin', 'system'
        user_id TEXT,
        old_value TEXT,
        new_value TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Health Check Logs
    CREATE TABLE IF NOT EXISTS health_check_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locker_id INTEGER NOT NULL,
        check_type TEXT NOT NULL,
        status TEXT CHECK(status IN ('pass', 'warning', 'fail')) NOT NULL,
        details TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (locker_id) REFERENCES lockers(id) ON DELETE CASCADE
    );

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
    CREATE INDEX IF NOT EXISTS idx_lockers_location ON lockers(location_id);
    CREATE INDEX IF NOT EXISTS idx_lockers_status ON lockers(status);
    CREATE INDEX IF NOT EXISTS idx_slots_locker ON slots(locker_id);
    CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
    CREATE INDEX IF NOT EXISTS idx_slots_size_status ON slots(size, status);
    CREATE INDEX IF NOT EXISTS idx_parcels_tracking ON parcels(tracking_number);
    CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
    CREATE INDEX IF NOT EXISTS idx_reservations_parcel ON reservations(parcel_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(slot_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_pickup_code ON reservations(pickup_code);
    CREATE INDEX IF NOT EXISTS idx_reservations_expires ON reservations(expires_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_health_locker ON health_check_logs(locker_id);
    CREATE INDEX IF NOT EXISTS idx_health_checked_at ON health_check_logs(checked_at);
`);

console.log('Database schema created successfully!');

// Insert sample data
console.log('Inserting sample data...');

// Sample locations
const insertLocation = db.prepare(`
    INSERT INTO locations (name, address, city, state, zip_code, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const locations = [
    ['Downtown Hub', '123 Main St', 'New York', 'NY', '10001', 40.7128, -74.0060],
    ['Midtown Center', '456 Park Ave', 'New York', 'NY', '10022', 40.7589, -73.9851],
    ['Brooklyn Station', '789 Atlantic Ave', 'Brooklyn', 'NY', '11217', 40.6782, -73.9442]
];

locations.forEach(loc => insertLocation.run(...loc));

// Sample lockers
const insertLocker = db.prepare(`
    INSERT INTO lockers (location_id, locker_number, total_slots)
    VALUES (?, ?, ?)
`);

for (let loc = 1; loc <= 3; loc++) {
    for (let i = 1; i <= 3; i++) {
        insertLocker.run(loc, `L${i}`, 20);
    }
}

// Sample slots for each locker
const insertSlot = db.prepare(`
    INSERT INTO slots (locker_id, slot_number, size, dimensions)
    VALUES (?, ?, ?, ?)
`);

const slotSizes = [
    ['small', '30x30x20cm'],
    ['medium', '40x40x40cm'],
    ['large', '60x60x60cm'],
    ['extra_large', '80x80x80cm']
];

const lockerCount = db.prepare('SELECT COUNT(*) as count FROM lockers').get().count;

for (let lockerId = 1; lockerId <= lockerCount; lockerId++) {
    // 10 small, 6 medium, 3 large, 1 extra_large per locker
    for (let i = 1; i <= 10; i++) {
        insertSlot.run(lockerId, `S${i}`, 'small', slotSizes[0][1]);
    }
    for (let i = 11; i <= 16; i++) {
        insertSlot.run(lockerId, `M${i}`, 'medium', slotSizes[1][1]);
    }
    for (let i = 17; i <= 19; i++) {
        insertSlot.run(lockerId, `L${i}`, 'large', slotSizes[2][1]);
    }
    insertSlot.run(lockerId, 'XL20', 'extra_large', slotSizes[3][1]);
}

console.log('Sample data inserted successfully!');
console.log('\nDatabase statistics:');
console.log(`- Locations: ${db.prepare('SELECT COUNT(*) as count FROM locations').get().count}`);
console.log(`- Lockers: ${db.prepare('SELECT COUNT(*) as count FROM lockers').get().count}`);
console.log(`- Slots: ${db.prepare('SELECT COUNT(*) as count FROM slots').get().count}`);

db.close();
console.log('\nDatabase initialization complete!');
