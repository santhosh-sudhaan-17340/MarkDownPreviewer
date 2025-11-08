const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'lockers.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Helper function for atomic transactions
function transaction(fn) {
    return db.transaction(fn);
}

// Audit log helper
function logAudit(entityType, entityId, action, userType = 'system', userId = null, oldValue = null, newValue = null) {
    const stmt = db.prepare(`
        INSERT INTO audit_logs (entity_type, entity_id, action, user_type, user_id, old_value, new_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(entityType, entityId, action, userType, userId, oldValue, newValue);
}

module.exports = {
    db,
    transaction,
    logAudit
};
