const { db, transaction, logAudit } = require('../database/db');

/**
 * Perform health check on a locker
 */
const performHealthCheck = transaction((lockerId, checkType = 'routine') => {
    const locker = db.prepare('SELECT * FROM lockers WHERE id = ?').get(lockerId);

    if (!locker) {
        throw new Error('Locker not found');
    }

    // Check slot consistency
    const slotStats = db.prepare(`
        SELECT
            COUNT(*) as total_slots,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
            SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
            SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
        FROM slots
        WHERE locker_id = ?
    `).get(lockerId);

    // Determine health status
    let status = 'pass';
    let details = [];

    if (slotStats.maintenance > 0) {
        status = 'warning';
        details.push(`${slotStats.maintenance} slots in maintenance`);
    }

    if (slotStats.total_slots !== locker.total_slots) {
        status = 'fail';
        details.push(`Slot count mismatch: expected ${locker.total_slots}, found ${slotStats.total_slots}`);
    }

    const occupancyRate = (slotStats.occupied + slotStats.reserved) / slotStats.total_slots;
    if (occupancyRate >= 0.9) {
        status = status === 'fail' ? 'fail' : 'warning';
        details.push(`High occupancy: ${(occupancyRate * 100).toFixed(1)}%`);
    }

    // Log health check
    db.prepare(`
        INSERT INTO health_check_logs (locker_id, check_type, status, details)
        VALUES (?, ?, ?, ?)
    `).run(lockerId, checkType, status, details.join('; '));

    // Update locker health status
    db.prepare(`
        UPDATE lockers
        SET last_health_check = CURRENT_TIMESTAMP,
            health_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(status, lockerId);

    logAudit('locker', lockerId, 'health_check', 'admin', null, null, JSON.stringify({ status, details }));

    return {
        lockerId,
        status,
        details,
        slotStats
    };
});

/**
 * Get overfill report for all locations
 */
function getOverfillReport(threshold = 0.8) {
    const report = db.prepare(`
        SELECT
            loc.id as location_id,
            loc.name as location_name,
            loc.city,
            loc.state,
            l.id as locker_id,
            l.locker_number,
            l.total_slots,
            COUNT(s.id) as total_actual_slots,
            SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
            SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) as reserved,
            CAST(SUM(CASE WHEN s.status IN ('occupied', 'reserved') THEN 1 ELSE 0 END) AS FLOAT) / COUNT(s.id) as occupancy_rate
        FROM locations loc
        JOIN lockers l ON loc.id = l.location_id
        JOIN slots s ON l.id = s.locker_id
        WHERE loc.status = 'active' AND l.status = 'operational'
        GROUP BY loc.id, l.id
        HAVING occupancy_rate >= ?
        ORDER BY occupancy_rate DESC
    `).all(threshold);

    return report;
}

/**
 * Get utilization analytics
 */
function getUtilizationAnalytics(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = db.prepare(`
        SELECT
            DATE(r.created_at) as date,
            COUNT(*) as total_reservations,
            SUM(CASE WHEN r.status = 'picked_up' THEN 1 ELSE 0 END) as successful_pickups,
            SUM(CASE WHEN r.status = 'expired' THEN 1 ELSE 0 END) as expired,
            AVG(CASE
                WHEN r.picked_up_at IS NOT NULL
                THEN (julianday(r.picked_up_at) - julianday(r.delivered_at)) * 24
                ELSE NULL
            END) as avg_pickup_time_hours
        FROM reservations r
        WHERE r.created_at >= ?
        GROUP BY DATE(r.created_at)
        ORDER BY date DESC
    `).all(startDate.toISOString());

    return analytics;
}

/**
 * Get location performance metrics
 */
function getLocationPerformance() {
    const performance = db.prepare(`
        SELECT
            loc.id,
            loc.name,
            loc.city,
            loc.state,
            COUNT(DISTINCT l.id) as total_lockers,
            COUNT(DISTINCT s.id) as total_slots,
            SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available_slots,
            SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) as occupied_slots,
            COUNT(DISTINCT r.id) as total_reservations,
            SUM(CASE WHEN r.status = 'picked_up' THEN 1 ELSE 0 END) as successful_pickups,
            SUM(CASE WHEN r.status = 'expired' THEN 1 ELSE 0 END) as expired_reservations,
            CAST(SUM(CASE WHEN s.status IN ('occupied', 'reserved') THEN 1 ELSE 0 END) AS FLOAT) / COUNT(DISTINCT s.id) as current_occupancy_rate,
            CAST(SUM(CASE WHEN r.status = 'picked_up' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(DISTINCT r.id) as success_rate
        FROM locations loc
        LEFT JOIN lockers l ON loc.id = l.location_id
        LEFT JOIN slots s ON l.id = s.locker_id
        LEFT JOIN reservations r ON s.id = r.slot_id
        WHERE loc.status = 'active'
        GROUP BY loc.id
        ORDER BY total_reservations DESC
    `).all();

    return performance;
}

/**
 * Optimize locker allocation - suggests which lockers to activate/deactivate
 */
function getOptimizationSuggestions() {
    // Find underutilized lockers
    const underutilized = db.prepare(`
        SELECT
            l.id,
            l.locker_number,
            loc.name as location_name,
            COUNT(r.id) as total_reservations,
            CAST(SUM(CASE WHEN s.status IN ('occupied', 'reserved') THEN 1 ELSE 0 END) AS FLOAT) / COUNT(s.id) as current_occupancy
        FROM lockers l
        JOIN locations loc ON l.location_id = loc.id
        JOIN slots s ON l.id = s.locker_id
        LEFT JOIN reservations r ON s.id = r.slot_id
            AND r.created_at >= datetime('now', '-30 days')
        WHERE l.status = 'operational'
        GROUP BY l.id
        HAVING current_occupancy < 0.2 AND total_reservations < 10
        ORDER BY current_occupancy ASC
    `).all();

    // Find locations needing more capacity
    const needsCapacity = db.prepare(`
        SELECT
            loc.id,
            loc.name,
            loc.city,
            COUNT(DISTINCT l.id) as active_lockers,
            CAST(SUM(CASE WHEN s.status IN ('occupied', 'reserved') THEN 1 ELSE 0 END) AS FLOAT) / COUNT(s.id) as occupancy_rate,
            COUNT(r.id) as reservations_last_30_days
        FROM locations loc
        JOIN lockers l ON loc.id = l.location_id
        JOIN slots s ON l.id = s.locker_id
        LEFT JOIN reservations r ON s.id = r.slot_id
            AND r.created_at >= datetime('now', '-30 days')
        WHERE loc.status = 'active' AND l.status = 'operational'
        GROUP BY loc.id
        HAVING occupancy_rate > 0.8
        ORDER BY occupancy_rate DESC
    `).all();

    // Slot size distribution analysis
    const sizeDistribution = db.prepare(`
        SELECT
            s.size,
            COUNT(*) as total_slots,
            SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available,
            COUNT(r.id) as reservations_last_30_days,
            CAST(SUM(CASE WHEN s.status IN ('occupied', 'reserved') THEN 1 ELSE 0 END) AS FLOAT) / COUNT(s.id) as utilization_rate
        FROM slots s
        LEFT JOIN reservations r ON s.id = r.slot_id
            AND r.created_at >= datetime('now', '-30 days')
        GROUP BY s.size
        ORDER BY utilization_rate DESC
    `).all();

    return {
        underutilizedLockers: underutilized,
        locationsNeedingCapacity: needsCapacity,
        sizeDistribution
    };
}

/**
 * Get reservations expiring soon
 */
function getExpiringSoon(hours = 24) {
    const expiryThreshold = new Date();
    expiryThreshold.setHours(expiryThreshold.getHours() + hours);

    const expiring = db.prepare(`
        SELECT
            r.id,
            r.pickup_code,
            r.expires_at,
            p.tracking_number,
            p.recipient_name,
            p.recipient_email,
            p.recipient_phone,
            s.slot_number,
            l.locker_number,
            loc.name as location_name
        FROM reservations r
        JOIN parcels p ON r.parcel_id = p.id
        JOIN slots s ON r.slot_id = s.id
        JOIN lockers l ON s.locker_id = l.id
        JOIN locations loc ON l.location_id = loc.id
        WHERE r.status = 'delivered'
          AND r.expires_at <= ?
          AND r.reminder_sent = 0
        ORDER BY r.expires_at ASC
    `).all(expiryThreshold.toISOString());

    return expiring;
}

/**
 * Mark reminder as sent
 */
function markReminderSent(reservationId) {
    db.prepare(`
        UPDATE reservations
        SET reminder_sent = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(reservationId);

    logAudit('reservation', reservationId, 'reminder_sent', 'system');
}

/**
 * Get audit logs with filters
 */
function getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (filters.entityType) {
        query += ' AND entity_type = ?';
        params.push(filters.entityType);
    }

    if (filters.entityId) {
        query += ' AND entity_id = ?';
        params.push(filters.entityId);
    }

    if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
    }

    if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(filters.startDate);
    }

    if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 100);

    return db.prepare(query).all(...params);
}

module.exports = {
    performHealthCheck,
    getOverfillReport,
    getUtilizationAnalytics,
    getLocationPerformance,
    getOptimizationSuggestions,
    getExpiringSoon,
    markReminderSent,
    getAuditLogs
};
