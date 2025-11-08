require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('./database/db');
const lockerService = require('./services/locker-service');
const adminService = require('./services/admin-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the original markdown previewer on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== PUBLIC API ENDPOINTS =====

/**
 * GET /api/locations
 * Get all active locations with capacity info
 */
app.get('/api/locations', (req, res) => {
    try {
        const locations = db.prepare(`
            SELECT
                loc.*,
                COUNT(DISTINCT l.id) as total_lockers,
                COUNT(DISTINCT s.id) as total_slots,
                SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available_slots
            FROM locations loc
            LEFT JOIN lockers l ON loc.id = l.location_id AND l.status = 'operational'
            LEFT JOIN slots s ON l.id = s.locker_id
            WHERE loc.status = 'active'
            GROUP BY loc.id
            ORDER BY loc.name
        `).all();

        res.json({ success: true, data: locations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/locations/:id/capacity
 * Get detailed capacity info for a location
 */
app.get('/api/locations/:id/capacity', (req, res) => {
    try {
        const capacity = lockerService.getLocationCapacity(req.params.id);
        res.json({ success: true, data: capacity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/parcels
 * Create a new parcel and reserve a slot
 * Body: { senderName, senderEmail, senderPhone, recipientName, recipientEmail, recipientPhone, size, weightKg, description, locationId }
 */
app.post('/api/parcels', (req, res) => {
    try {
        const { locationId, ...parcelData } = req.body;

        // Validation
        if (!parcelData.senderName || !parcelData.senderEmail || !parcelData.recipientName ||
            !parcelData.recipientEmail || !parcelData.recipientPhone || !parcelData.size || !locationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const validSizes = ['small', 'medium', 'large', 'extra_large'];
        if (!validSizes.includes(parcelData.size)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid size. Must be one of: ' + validSizes.join(', ')
            });
        }

        const result = lockerService.createParcelAndReserve(parcelData, locationId);

        res.status(201).json({
            success: true,
            data: result,
            message: 'Parcel created and slot reserved successfully'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/parcels/:trackingNumber
 * Get parcel details by tracking number
 */
app.get('/api/parcels/:trackingNumber', (req, res) => {
    try {
        const parcel = db.prepare(`
            SELECT
                p.*,
                r.pickup_code,
                r.expires_at,
                r.delivered_at,
                r.picked_up_at,
                r.status as reservation_status,
                s.slot_number,
                l.locker_number,
                loc.name as location_name,
                loc.address,
                loc.city,
                loc.state,
                loc.zip_code
            FROM parcels p
            LEFT JOIN reservations r ON p.id = r.parcel_id
            LEFT JOIN slots s ON r.slot_id = s.id
            LEFT JOIN lockers l ON s.locker_id = l.id
            LEFT JOIN locations loc ON l.location_id = loc.id
            WHERE p.tracking_number = ?
        `).get(req.params.trackingNumber);

        if (!parcel) {
            return res.status(404).json({ success: false, error: 'Parcel not found' });
        }

        res.json({ success: true, data: parcel });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/pickup
 * Process parcel pickup with code and PIN
 * Body: { pickupCode, pinCode }
 */
app.post('/api/pickup', (req, res) => {
    try {
        const { pickupCode, pinCode } = req.body;

        if (!pickupCode || !pinCode) {
            return res.status(400).json({
                success: false,
                error: 'Pickup code and PIN are required'
            });
        }

        const result = lockerService.processPickup(pickupCode.toUpperCase(), pinCode);

        res.json({
            success: true,
            data: result,
            message: 'Parcel picked up successfully'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/reservations/:id/deliver
 * Mark a reservation as delivered (for delivery drivers)
 * Body: { driverCode } - optional authentication
 */
app.post('/api/reservations/:id/deliver', (req, res) => {
    try {
        const result = lockerService.markAsDelivered(req.params.id);

        res.json({
            success: true,
            data: result,
            message: 'Parcel marked as delivered'
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ===== ADMIN API ENDPOINTS =====

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
app.get('/api/admin/dashboard', (req, res) => {
    try {
        const stats = {
            locations: db.prepare("SELECT COUNT(*) as count FROM locations WHERE status = 'active'").get(),
            lockers: db.prepare("SELECT COUNT(*) as count FROM lockers WHERE status = 'operational'").get(),
            totalSlots: db.prepare('SELECT COUNT(*) as count FROM slots').get(),
            availableSlots: db.prepare("SELECT COUNT(*) as count FROM slots WHERE status = 'available'").get(),
            occupiedSlots: db.prepare("SELECT COUNT(*) as count FROM slots WHERE status = 'occupied'").get(),
            reservedSlots: db.prepare("SELECT COUNT(*) as count FROM slots WHERE status = 'reserved'").get(),
            activeParcels: db.prepare("SELECT COUNT(*) as count FROM parcels WHERE status IN ('in_transit', 'delivered')").get(),
            totalReservations: db.prepare('SELECT COUNT(*) as count FROM reservations').get(),
            activeReservations: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status IN ('reserved', 'delivered')").get(),
            expiredReservations: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'expired'").get(),
            successfulPickups: db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'picked_up'").get()
        };

        const recentActivity = db.prepare(`
            SELECT
                'parcel' as type,
                p.tracking_number as identifier,
                p.status,
                p.created_at as timestamp
            FROM parcels p
            ORDER BY p.created_at DESC
            LIMIT 10
        `).all();

        res.json({
            success: true,
            data: {
                stats,
                recentActivity
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/locations/performance
 * Get performance metrics for all locations
 */
app.get('/api/admin/locations/performance', (req, res) => {
    try {
        const performance = adminService.getLocationPerformance();
        res.json({ success: true, data: performance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/overfill-report
 * Get overfill report
 * Query params: threshold (default 0.8)
 */
app.get('/api/admin/overfill-report', (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 0.8;
        const report = adminService.getOverfillReport(threshold);
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/lockers/:id/health-check
 * Perform health check on a locker
 */
app.post('/api/admin/lockers/:id/health-check', (req, res) => {
    try {
        const result = adminService.performHealthCheck(req.params.id, req.body.checkType || 'routine');
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/lockers/:id/health-history
 * Get health check history for a locker
 */
app.get('/api/admin/lockers/:id/health-history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = db.prepare(`
            SELECT * FROM health_check_logs
            WHERE locker_id = ?
            ORDER BY checked_at DESC
            LIMIT ?
        `).all(req.params.id, limit);

        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/analytics/utilization
 * Get utilization analytics
 * Query params: days (default 7)
 */
app.get('/api/admin/analytics/utilization', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const analytics = adminService.getUtilizationAnalytics(days);
        res.json({ success: true, data: analytics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/optimization
 * Get optimization suggestions
 */
app.get('/api/admin/optimization', (req, res) => {
    try {
        const suggestions = adminService.getOptimizationSuggestions();
        res.json({ success: true, data: suggestions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/expiring-soon
 * Get reservations expiring soon
 * Query params: hours (default 24)
 */
app.get('/api/admin/expiring-soon', (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const expiring = adminService.getExpiringSoon(hours);
        res.json({ success: true, data: expiring });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 * Query params: entityType, entityId, action, startDate, endDate, limit
 */
app.get('/api/admin/audit-logs', (req, res) => {
    try {
        const logs = adminService.getAuditLogs(req.query);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/process-expired
 * Process all expired reservations
 */
app.post('/api/admin/process-expired', (req, res) => {
    try {
        const count = lockerService.processExpiredReservations();
        res.json({
            success: true,
            data: { processedCount: count },
            message: `Processed ${count} expired reservations`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/lockers
 * Get all lockers with details
 */
app.get('/api/admin/lockers', (req, res) => {
    try {
        const lockers = db.prepare(`
            SELECT
                l.*,
                loc.name as location_name,
                loc.city,
                loc.state,
                COUNT(s.id) as actual_slots,
                SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) as reserved
            FROM lockers l
            JOIN locations loc ON l.location_id = loc.id
            LEFT JOIN slots s ON l.id = s.locker_id
            GROUP BY l.id
            ORDER BY loc.name, l.locker_number
        `).all();

        res.json({ success: true, data: lockers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== BACKGROUND JOBS =====

// Process expired reservations every hour
setInterval(() => {
    try {
        const count = lockerService.processExpiredReservations();
        if (count > 0) {
            console.log(`[CRON] Processed ${count} expired reservations`);
        }
    } catch (error) {
        console.error('[CRON] Error processing expired reservations:', error);
    }
}, 60 * 60 * 1000); // Every hour

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Parcel Locker Management System                        ║
║   Server running on http://localhost:${PORT}                ║
║                                                           ║
║   Endpoints:                                              ║
║   - GET  /                           Markdown Previewer  ║
║   - GET  /locker.html                Locker System UI    ║
║   - GET  /admin.html                 Admin Portal        ║
║   - POST /api/parcels                Create parcel       ║
║   - POST /api/pickup                 Pickup parcel       ║
║   - GET  /api/admin/dashboard        Admin dashboard    ║
║                                                           ║
║   Database: ${process.env.DATABASE_PATH || './database/lockers.db'}           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
});

module.exports = app;
