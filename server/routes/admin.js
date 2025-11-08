const express = require('express');
const router = express.Router();
const { query, param, body, validationResult } = require('express-validator');
const db = require('../config/database');
const lockerService = require('../services/lockerService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

/**
 * GET /api/admin/dashboard - Dashboard overview
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Get summary statistics
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM lockers WHERE status = 'ACTIVE') as active_lockers,
                (SELECT COUNT(*) FROM lockers WHERE status = 'FULL') as full_lockers,
                (SELECT COUNT(*) FROM lockers WHERE status = 'MAINTENANCE') as maintenance_lockers,
                (SELECT COUNT(*) FROM locker_slots WHERE status = 'AVAILABLE') as available_slots,
                (SELECT COUNT(*) FROM locker_slots WHERE status = 'OCCUPIED') as occupied_slots,
                (SELECT COUNT(*) FROM parcels WHERE status = 'IN_LOCKER') as parcels_in_lockers,
                (SELECT COUNT(*) FROM parcels WHERE status = 'PICKED_UP' AND picked_up_at > CURRENT_DATE) as pickups_today,
                (SELECT COUNT(*) FROM parcels WHERE status = 'IN_LOCKER' AND expires_at < CURRENT_TIMESTAMP) as expired_parcels,
                (SELECT COUNT(*) FROM parcels WHERE created_at > CURRENT_DATE) as parcels_created_today
        `);

        // Get capacity by location
        const capacity = await lockerService.getLockerCapacity();

        // Get recent activity
        const recentActivity = await db.query(`
            SELECT
                action,
                entity_type,
                created_at,
                new_values
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                statistics: stats.rows[0],
                capacity: capacity,
                recentActivity: recentActivity.rows
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
});

/**
 * GET /api/admin/health-checks - Locker health status
 */
router.get('/health-checks', async (req, res) => {
    try {
        const healthData = await lockerService.getLockerHealthStatus();

        // Get detailed health metrics for the last 24 hours
        const metricsQuery = await db.query(`
            SELECT
                l.locker_number,
                ll.name as location_name,
                hm.temperature_celsius,
                hm.humidity_percent,
                hm.power_status,
                hm.network_status,
                hm.door_errors,
                hm.lock_errors,
                hm.recorded_at
            FROM locker_health_metrics hm
            JOIN lockers l ON hm.locker_id = l.id
            JOIN locker_locations ll ON l.location_id = ll.id
            WHERE hm.recorded_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
            ORDER BY hm.recorded_at DESC
        `);

        // Get lockers with issues
        const issuesQuery = await db.query(`
            SELECT
                l.id,
                l.locker_number,
                ll.name as location_name,
                l.status,
                COUNT(ls.id) FILTER (WHERE ls.door_sensor_ok = FALSE) as door_sensor_errors,
                COUNT(ls.id) FILTER (WHERE ls.lock_sensor_ok = FALSE) as lock_sensor_errors,
                l.temperature_celsius,
                l.humidity_percent,
                l.last_maintenance,
                l.next_maintenance
            FROM lockers l
            JOIN locker_locations ll ON l.location_id = ll.id
            LEFT JOIN locker_slots ls ON l.id = ls.locker_id
            WHERE l.status IN ('MAINTENANCE', 'OFFLINE')
               OR l.next_maintenance < CURRENT_TIMESTAMP
               OR l.temperature_celsius NOT BETWEEN 5 AND 35
               OR l.humidity_percent > 80
            GROUP BY l.id, ll.name
            ORDER BY l.status DESC
        `);

        res.json({
            success: true,
            data: {
                healthStatus: healthData,
                recentMetrics: metricsQuery.rows,
                lockerIssues: issuesQuery.rows
            }
        });
    } catch (error) {
        console.error('Error fetching health checks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch health check data'
        });
    }
});

/**
 * GET /api/admin/overfill-report - Lockers approaching capacity
 */
router.get('/overfill-report', async (req, res) => {
    try {
        const threshold = parseInt(req.query.threshold) || 80; // Default 80% threshold

        const overfillQuery = await db.query(`
            SELECT
                ll.name as location_name,
                ll.city,
                ll.address,
                l.locker_number,
                l.total_slots,
                l.occupied_slots,
                (l.total_slots - l.occupied_slots) as available_slots,
                ROUND((l.occupied_slots::DECIMAL / NULLIF(l.total_slots, 0) * 100), 2) as occupancy_percent,
                l.status,
                -- Slot size breakdown
                COUNT(ls.id) FILTER (WHERE ls.size = 'SMALL' AND ls.status = 'AVAILABLE') as small_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'MEDIUM' AND ls.status = 'AVAILABLE') as medium_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'LARGE' AND ls.status = 'AVAILABLE') as large_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'XLARGE' AND ls.status = 'AVAILABLE') as xlarge_available,
                -- Projected full time based on current trend
                CASE
                    WHEN l.occupied_slots >= l.total_slots THEN 0
                    ELSE EXTRACT(EPOCH FROM (
                        (l.total_slots - l.occupied_slots)::DECIMAL /
                        NULLIF(
                            (SELECT COUNT(*) FROM parcels p2
                             WHERE p2.locker_id = l.id
                             AND p2.dropped_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'),
                            0
                        ) * 24 * 3600
                    ))::INTEGER
                END as estimated_full_seconds
            FROM lockers l
            JOIN locker_locations ll ON l.location_id = ll.id
            LEFT JOIN locker_slots ls ON l.id = ls.locker_id
            WHERE l.status = 'ACTIVE'
              AND (l.occupied_slots::DECIMAL / NULLIF(l.total_slots, 0) * 100) >= $1
            GROUP BY l.id, ll.id
            ORDER BY occupancy_percent DESC, estimated_full_seconds ASC
        `, [threshold]);

        // Get historical occupancy trends
        const trendQuery = await db.query(`
            SELECT
                ll.name as location_name,
                DATE_TRUNC('hour', al.created_at) as hour,
                AVG(
                    (al.new_values->>'occupied_slots')::INTEGER::DECIMAL /
                    NULLIF((al.new_values->>'total_slots')::INTEGER, 0) * 100
                ) as avg_occupancy
            FROM audit_logs al
            JOIN lockers l ON al.entity_id = l.id
            JOIN locker_locations ll ON l.location_id = ll.id
            WHERE al.entity_type = 'locker'
              AND al.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
              AND al.new_values ? 'occupied_slots'
            GROUP BY ll.name, DATE_TRUNC('hour', al.created_at)
            ORDER BY hour DESC
            LIMIT 168
        `);

        res.json({
            success: true,
            data: {
                overfillLockers: overfillQuery.rows,
                occupancyTrends: trendQuery.rows,
                threshold: threshold
            }
        });
    } catch (error) {
        console.error('Error generating overfill report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate overfill report'
        });
    }
});

/**
 * GET /api/admin/logistics-optimization - Complex SQL for logistics optimization
 */
router.get('/logistics-optimization', async (req, res) => {
    try {
        // 1. Identify optimal locker locations for expansion based on demand
        const expansionAnalysis = await db.query(`
            WITH city_demand AS (
                SELECT
                    ll.city,
                    COUNT(DISTINCT ll.id) as existing_locations,
                    SUM(l.total_slots) as total_capacity,
                    SUM(l.occupied_slots) as total_occupied,
                    COUNT(p.id) as total_parcels_handled,
                    COUNT(p.id) FILTER (WHERE p.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as recent_parcels,
                    AVG(EXTRACT(EPOCH FROM (p.picked_up_at - p.dropped_at)) / 3600) as avg_storage_hours
                FROM locker_locations ll
                LEFT JOIN lockers l ON ll.id = l.location_id
                LEFT JOIN parcels p ON l.id = p.locker_id
                GROUP BY ll.city
            ),
            city_metrics AS (
                SELECT
                    city,
                    existing_locations,
                    total_capacity,
                    total_occupied,
                    total_parcels_handled,
                    recent_parcels,
                    ROUND(avg_storage_hours::NUMERIC, 2) as avg_storage_hours,
                    ROUND((total_occupied::DECIMAL / NULLIF(total_capacity, 0) * 100), 2) as avg_occupancy_percent,
                    ROUND((recent_parcels::DECIMAL / NULLIF(existing_locations, 0)), 2) as parcels_per_location
                FROM city_demand
            )
            SELECT
                city,
                existing_locations,
                total_capacity,
                avg_occupancy_percent,
                parcels_per_location,
                recent_parcels,
                avg_storage_hours,
                CASE
                    WHEN avg_occupancy_percent > 75 AND parcels_per_location > 50 THEN 'HIGH'
                    WHEN avg_occupancy_percent > 60 OR parcels_per_location > 30 THEN 'MEDIUM'
                    ELSE 'LOW'
                END as expansion_priority
            FROM city_metrics
            ORDER BY
                CASE
                    WHEN avg_occupancy_percent > 75 AND parcels_per_location > 50 THEN 1
                    WHEN avg_occupancy_percent > 60 OR parcels_per_location > 30 THEN 2
                    ELSE 3
                END,
                avg_occupancy_percent DESC
        `);

        // 2. Optimal slot size distribution analysis
        const slotSizeOptimization = await db.query(`
            WITH size_demand AS (
                SELECT
                    ll.city,
                    ll.name as location_name,
                    p.parcel_size,
                    COUNT(*) as demand_count,
                    COUNT(*) FILTER (WHERE p.status = 'PENDING') as unfulfilled_count
                FROM parcels p
                LEFT JOIN lockers l ON p.locker_id = l.id
                LEFT JOIN locker_locations ll ON l.location_id = ll.id
                WHERE p.created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
                GROUP BY ll.city, ll.name, p.parcel_size
            ),
            size_supply AS (
                SELECT
                    ll.city,
                    ll.name as location_name,
                    ls.size,
                    COUNT(*) as available_slots,
                    COUNT(*) FILTER (WHERE ls.status = 'AVAILABLE') as currently_available
                FROM locker_slots ls
                JOIN lockers l ON ls.locker_id = l.id
                JOIN locker_locations ll ON l.location_id = ll.id
                GROUP BY ll.city, ll.name, ls.size
            )
            SELECT
                COALESCE(sd.city, ss.city) as city,
                COALESCE(sd.location_name, ss.location_name) as location,
                COALESCE(sd.parcel_size, ss.size) as size,
                COALESCE(sd.demand_count, 0) as demand,
                COALESCE(ss.available_slots, 0) as supply,
                COALESCE(ss.currently_available, 0) as current_available,
                COALESCE(sd.unfulfilled_count, 0) as unfulfilled,
                ROUND(
                    (COALESCE(sd.demand_count, 0)::DECIMAL /
                    NULLIF(COALESCE(ss.available_slots, 0), 0)),
                    2
                ) as demand_supply_ratio,
                CASE
                    WHEN COALESCE(sd.demand_count, 0)::DECIMAL / NULLIF(COALESCE(ss.available_slots, 0), 0) > 2 THEN 'INCREASE_CAPACITY'
                    WHEN COALESCE(sd.demand_count, 0)::DECIMAL / NULLIF(COALESCE(ss.available_slots, 0), 0) < 0.3 THEN 'REDUCE_CAPACITY'
                    ELSE 'OPTIMAL'
                END as recommendation
            FROM size_demand sd
            FULL OUTER JOIN size_supply ss
                ON sd.city = ss.city
                AND sd.location_name = ss.location_name
                AND sd.parcel_size = ss.size
            ORDER BY demand_supply_ratio DESC NULLS LAST
        `);

        // 3. Peak hours and load balancing
        const peakHoursAnalysis = await db.query(`
            SELECT
                EXTRACT(HOUR FROM dropped_at) as hour_of_day,
                EXTRACT(DOW FROM dropped_at) as day_of_week,
                COUNT(*) as parcel_count,
                AVG(EXTRACT(EPOCH FROM (picked_up_at - dropped_at)) / 3600) as avg_storage_hours,
                ll.city,
                CASE EXTRACT(DOW FROM dropped_at)
                    WHEN 0 THEN 'Sunday'
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                END as day_name
            FROM parcels p
            JOIN lockers l ON p.locker_id = l.id
            JOIN locker_locations ll ON l.location_id = ll.id
            WHERE p.dropped_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
            GROUP BY EXTRACT(HOUR FROM dropped_at), EXTRACT(DOW FROM dropped_at), ll.city
            ORDER BY parcel_count DESC
            LIMIT 50
        `);

        // 4. Maintenance optimization schedule
        const maintenanceOptimization = await db.query(`
            WITH locker_usage AS (
                SELECT
                    l.id,
                    ll.name as location_name,
                    l.locker_number,
                    COUNT(DISTINCT ls.id) as total_slots,
                    COUNT(DISTINCT p.id) as total_parcels_handled,
                    AVG(ls.last_opened) as avg_last_opened,
                    MAX(ls.last_opened) as most_recent_open,
                    l.last_maintenance,
                    l.next_maintenance,
                    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - l.last_maintenance)) as days_since_maintenance
                FROM lockers l
                JOIN locker_locations ll ON l.location_id = ll.id
                LEFT JOIN locker_slots ls ON l.id = ls.locker_id
                LEFT JOIN parcels p ON l.id = p.locker_id
                GROUP BY l.id, ll.name
            )
            SELECT
                location_name,
                locker_number,
                total_slots,
                total_parcels_handled,
                days_since_maintenance,
                next_maintenance,
                EXTRACT(DAY FROM (next_maintenance - CURRENT_TIMESTAMP)) as days_until_maintenance,
                CASE
                    WHEN next_maintenance < CURRENT_TIMESTAMP THEN 'OVERDUE'
                    WHEN next_maintenance < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'URGENT'
                    WHEN days_since_maintenance > 30 THEN 'SCHEDULED'
                    ELSE 'OK'
                END as maintenance_priority,
                -- Recommend maintenance during low-usage periods
                (
                    SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM dropped_at)::INTEGER ORDER BY EXTRACT(HOUR FROM dropped_at)::INTEGER)
                    FROM parcels p2
                    WHERE p2.locker_id = id
                    AND p2.dropped_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
                ) as busy_hours
            FROM locker_usage
            WHERE days_until_maintenance < 14 OR next_maintenance < CURRENT_TIMESTAMP
            ORDER BY
                CASE
                    WHEN next_maintenance < CURRENT_TIMESTAMP THEN 1
                    WHEN next_maintenance < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 2
                    ELSE 3
                END,
                total_parcels_handled DESC
        `);

        res.json({
            success: true,
            data: {
                expansionAnalysis: expansionAnalysis.rows,
                slotSizeOptimization: slotSizeOptimization.rows,
                peakHoursAnalysis: peakHoursAnalysis.rows,
                maintenanceOptimization: maintenanceOptimization.rows
            }
        });
    } catch (error) {
        console.error('Error generating logistics optimization:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate logistics optimization data'
        });
    }
});

/**
 * GET /api/admin/expired-parcels - Get parcels needing removal
 */
router.get('/expired-parcels', async (req, res) => {
    try {
        const expiredParcels = await lockerService.getExpiredParcels();

        res.json({
            success: true,
            data: expiredParcels
        });
    } catch (error) {
        console.error('Error fetching expired parcels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch expired parcels'
        });
    }
});

/**
 * POST /api/admin/lockers - Create new locker
 */
router.post('/lockers',
    [
        body('locationId').isUUID(),
        body('lockerNumber').trim().notEmpty(),
        body('slots').isArray().withMessage('Slots must be an array'),
        body('slots.*.slotNumber').trim().notEmpty(),
        body('slots.*.size').isIn(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
        body('slots.*.width_cm').isFloat({ min: 1 }),
        body('slots.*.height_cm').isFloat({ min: 1 }),
        body('slots.*.depth_cm').isFloat({ min: 1 }),
        body('slots.*.max_weight_kg').isFloat({ min: 0.1 })
    ],
    validate,
    async (req, res) => {
        try {
            const { locationId, lockerNumber, slots } = req.body;

            const result = await db.transaction(async (client) => {
                // Create locker
                const lockerResult = await client.query(
                    `INSERT INTO lockers (location_id, locker_number, status)
                     VALUES ($1, $2, 'ACTIVE')
                     RETURNING *`,
                    [locationId, lockerNumber]
                );

                const locker = lockerResult.rows[0];

                // Create slots
                const slotPromises = slots.map(slot =>
                    client.query(
                        `INSERT INTO locker_slots (
                            locker_id, slot_number, size,
                            width_cm, height_cm, depth_cm, max_weight_kg
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING *`,
                        [
                            locker.id,
                            slot.slotNumber,
                            slot.size,
                            slot.width_cm,
                            slot.height_cm,
                            slot.depth_cm,
                            slot.max_weight_kg
                        ]
                    )
                );

                const slotsResults = await Promise.all(slotPromises);

                return {
                    locker,
                    slots: slotsResults.map(r => r.rows[0])
                };
            });

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error creating locker:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create locker'
            });
        }
    }
);

/**
 * PUT /api/admin/lockers/:id/status - Update locker status
 */
router.put('/lockers/:id/status',
    [
        param('id').isUUID(),
        body('status').isIn(['ACTIVE', 'MAINTENANCE', 'OFFLINE'])
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const result = await db.query(
                `UPDATE lockers
                 SET status = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Locker not found'
                });
            }

            // Log the change
            await db.query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['locker', id, 'UPDATE', req.user.id, JSON.stringify({ status })]
            );

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error updating locker status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update locker status'
            });
        }
    }
);

/**
 * POST /api/admin/cleanup-reservations - Manually trigger cleanup
 */
router.post('/cleanup-reservations', async (req, res) => {
    try {
        const count = await lockerService.cleanupExpiredReservations();

        res.json({
            success: true,
            data: {
                cleanedCount: count,
                message: `Cleaned up ${count} expired reservations`
            }
        });
    } catch (error) {
        console.error('Error cleaning up reservations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup reservations'
        });
    }
});

/**
 * GET /api/admin/audit-logs - Get audit logs with filtering
 */
router.get('/audit-logs', async (req, res) => {
    try {
        const { entityType, action, userId, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (entityType) {
            paramCount++;
            query += ` AND entity_type = $${paramCount}`;
            params.push(entityType);
        }

        if (action) {
            paramCount++;
            query += ` AND action = $${paramCount}`;
            params.push(action);
        }

        if (userId) {
            paramCount++;
            query += ` AND performed_by = $${paramCount}`;
            params.push(userId);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});

module.exports = router;
