const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateAdmin, requireRole, generateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const healthService = require('../services/healthService');
const expiryService = require('../services/expiryService');

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find admin user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role, is_active FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    // Generate token
    const token = generateToken(admin.id, 'admin');

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/admin/dashboard
 * Get dashboard overview
 */
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const [
      lockerStats,
      recentReservations,
      healthOverview,
      expiringSummary
    ] = await Promise.all([
      // Overall locker statistics
      pool.query(`
        SELECT
          COUNT(DISTINCT ll.id) as total_locations,
          COUNT(ls.id) as total_slots,
          COUNT(ls.id) FILTER (WHERE ls.status = 'available') as available_slots,
          COUNT(ls.id) FILTER (WHERE ls.status = 'occupied') as occupied_slots,
          COUNT(ls.id) FILTER (WHERE ls.status = 'reserved') as reserved_slots,
          COUNT(r.id) FILTER (WHERE r.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as reservations_24h,
          COUNT(r.id) FILTER (WHERE r.picked_up_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as pickups_24h,
          COUNT(r.id) FILTER (WHERE r.status = 'expired' AND r.updated_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as expired_24h
        FROM locker_locations ll
        LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
        LEFT JOIN reservations r ON ls.id = r.slot_id
      `),
      // Recent reservations
      pool.query(`
        SELECT
          r.id,
          r.pickup_code,
          r.status,
          r.created_at,
          r.expires_at,
          p.tracking_number,
          p.recipient_name,
          ls.slot_number,
          ll.name as locker_name
        FROM reservations r
        JOIN parcels p ON r.parcel_id = p.id
        JOIN locker_slots ls ON r.slot_id = ls.id
        JOIN locker_locations ll ON ls.locker_location_id = ll.id
        ORDER BY r.created_at DESC
        LIMIT 10
      `),
      // Health overview
      healthService.getHealthOverview(),
      // Expiring summary
      expiryService.getExpiringSummary()
    ]);

    res.json({
      stats: lockerStats.rows[0],
      recentReservations: recentReservations.rows,
      healthOverview: healthOverview,
      expiringSummary: expiringSummary
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/lockers
 * Get all locker locations with stats
 */
router.get('/lockers', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM locker_occupancy_status
      ORDER BY occupancy_percentage DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Lockers error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/lockers/:id/slots
 * Get slots for a specific locker
 */
router.get('/lockers/:id/slots', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        ls.*,
        r.pickup_code,
        r.expires_at,
        p.tracking_number,
        p.recipient_name
      FROM locker_slots ls
      LEFT JOIN reservations r ON ls.id = r.slot_id AND r.status = 'active'
      LEFT JOIN parcels p ON r.parcel_id = p.id
      WHERE ls.locker_location_id = $1
      ORDER BY ls.slot_number
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Slots error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/occupancy
 * Get occupancy report
 */
router.get('/reports/occupancy', authenticateAdmin, async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.query;

    const report = await analyticsService.getOccupancyReport(
      locationId,
      startDate,
      endDate
    );

    res.json(report);
  } catch (error) {
    console.error('Occupancy report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/overfill
 * Get overfill report
 */
router.get('/reports/overfill', authenticateAdmin, async (req, res) => {
  try {
    const { threshold = 80 } = req.query;

    const report = await analyticsService.getOverfillReport(parseInt(threshold));

    res.json(report);
  } catch (error) {
    console.error('Overfill report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/performance
 * Get performance metrics
 */
router.get('/reports/performance', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const report = await analyticsService.getPerformanceMetrics(
      startDate,
      endDate,
      locationId
    );

    res.json(report);
  } catch (error) {
    console.error('Performance report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reports/optimization
 * Get logistics optimization suggestions
 */
router.get('/reports/optimization', authenticateAdmin, async (req, res) => {
  try {
    const { size, latitude, longitude, maxDistance } = req.query;

    if (!size) {
      return res.status(400).json({ error: 'size parameter is required' });
    }

    const report = await analyticsService.findOptimalLocker(
      size,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      maxDistance ? parseInt(maxDistance) : 50
    );

    res.json(report);
  } catch (error) {
    console.error('Optimization report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/health/overview
 * Get health overview
 */
router.get('/health/overview', authenticateAdmin, async (req, res) => {
  try {
    const overview = await healthService.getHealthOverview();
    res.json(overview);
  } catch (error) {
    console.error('Health overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/health/maintenance
 * Get maintenance queue
 */
router.get('/health/maintenance', authenticateAdmin, async (req, res) => {
  try {
    const queue = await healthService.getMaintenanceQueue();
    res.json(queue);
  } catch (error) {
    console.error('Maintenance queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/health/check/:slotId
 * Perform health check on a slot
 */
router.post('/health/check/:slotId', authenticateAdmin, async (req, res) => {
  try {
    const { slotId } = req.params;
    const healthData = req.body;

    const result = await healthService.checkSlotHealth(
      slotId,
      healthData,
      req.admin.id
    );

    res.json(result);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/health/check-location/:locationId
 * Perform health check on all slots at a location
 */
router.post('/health/check-location/:locationId', authenticateAdmin, async (req, res) => {
  try {
    const { locationId } = req.params;

    const results = await healthService.checkLocationHealth(
      locationId,
      req.admin.id
    );

    res.json(results);
  } catch (error) {
    console.error('Location health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/health/repair/:slotId
 * Mark slot as repaired
 */
router.post('/health/repair/:slotId', authenticateAdmin, async (req, res) => {
  try {
    const { slotId } = req.params;
    const { notes } = req.body;

    const result = await healthService.markSlotRepaired(
      slotId,
      req.admin.id,
      notes
    );

    res.json(result);
  } catch (error) {
    console.error('Repair error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/expiring
 * Get expiring parcels
 */
router.get('/expiring', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expiring_parcels');
    res.json(result.rows);
  } catch (error) {
    console.error('Expiring parcels error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/process-expired
 * Manually trigger expired reservations processing
 */
router.post('/process-expired', authenticateAdmin, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const result = await expiryService.processExpiredReservations();
    res.json(result);
  } catch (error) {
    console.error('Process expired error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/reservations
 * Get all reservations with filters
 */
router.get('/reservations', authenticateAdmin, async (req, res) => {
  try {
    const { status, locationId, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        r.*,
        p.tracking_number,
        p.recipient_name,
        p.recipient_email,
        p.size,
        ls.slot_number,
        ll.name as locker_name,
        ll.city
      FROM reservations r
      JOIN parcels p ON r.parcel_id = p.id
      JOIN locker_slots ls ON r.slot_id = ls.id
      JOIN locker_locations ll ON ls.locker_location_id = ll.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (locationId) {
      paramCount++;
      query += ` AND ll.id = $${paramCount}`;
      params.push(locationId);
    }

    if (startDate) {
      paramCount++;
      query += ` AND r.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND r.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY r.created_at DESC`;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Reservations error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
