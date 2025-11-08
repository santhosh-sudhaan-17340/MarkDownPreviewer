const pool = require('../config/database');

/**
 * Locker health monitoring and maintenance service
 */
class HealthService {
  /**
   * Perform health check on a locker slot
   */
  async checkSlotHealth(slotId, healthData = {}, checkedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        temperature = null,
        doorStatus = 'closed',
        sensorStatus = {},
        errorMessage = null
      } = healthData;

      // Determine health status based on checks
      let healthStatus = 'good';

      if (errorMessage || doorStatus === 'jammed') {
        healthStatus = 'critical';
      } else if (temperature && (temperature < 0 || temperature > 50)) {
        healthStatus = 'warning';
      } else if (sensorStatus && Object.values(sensorStatus).includes('error')) {
        healthStatus = 'warning';
      }

      // Update slot health
      await client.query(`
        UPDATE locker_slots
        SET
          health_status = $1,
          temperature = $2,
          last_health_check = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          status = CASE
            WHEN $1 = 'critical' THEN 'maintenance'
            ELSE status
          END
        WHERE id = $3
      `, [healthStatus, temperature, slotId]);

      // Create health log entry
      const logResult = await client.query(`
        INSERT INTO locker_health_logs (
          slot_id, health_status, temperature, door_status,
          sensor_status, error_message, checked_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, checked_at
      `, [
        slotId,
        healthStatus,
        temperature,
        doorStatus,
        JSON.stringify(sensorStatus),
        errorMessage,
        checkedBy
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        healthStatus,
        logId: logResult.rows[0].id,
        checkedAt: logResult.rows[0].checked_at
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform health check on all slots at a location
   */
  async checkLocationHealth(locationId, checkedBy = null) {
    const result = await pool.query(`
      SELECT id FROM locker_slots WHERE locker_location_id = $1
    `, [locationId]);

    const slots = result.rows;
    const results = [];

    for (const slot of slots) {
      try {
        // Simulate sensor readings (in production, this would read from actual sensors)
        const healthData = await this.simulateSensorReadings(slot.id);
        const checkResult = await this.checkSlotHealth(slot.id, healthData, checkedBy);
        results.push({
          slotId: slot.id,
          ...checkResult
        });
      } catch (error) {
        results.push({
          slotId: slot.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Simulate sensor readings (placeholder for actual IoT integration)
   */
  async simulateSensorReadings(slotId) {
    // In production, this would interface with actual IoT sensors
    const temperature = 18 + Math.random() * 10; // 18-28°C
    const doorStatus = Math.random() > 0.95 ? 'jammed' : 'closed';
    const sensorStatus = {
      motion: Math.random() > 0.98 ? 'error' : 'ok',
      light: Math.random() > 0.98 ? 'error' : 'ok',
      lock: Math.random() > 0.99 ? 'error' : 'ok'
    };

    return {
      temperature,
      doorStatus,
      sensorStatus,
      errorMessage: doorStatus === 'jammed' ? 'Door mechanism jammed' : null
    };
  }

  /**
   * Get health status for all lockers
   */
  async getHealthOverview() {
    const result = await pool.query(`
      SELECT
        ll.id as location_id,
        ll.name as location_name,
        ll.city,
        COUNT(ls.id) as total_slots,
        COUNT(ls.id) FILTER (WHERE ls.health_status = 'good') as healthy_slots,
        COUNT(ls.id) FILTER (WHERE ls.health_status = 'warning') as warning_slots,
        COUNT(ls.id) FILTER (WHERE ls.health_status = 'critical') as critical_slots,
        COUNT(ls.id) FILTER (WHERE ls.health_status = 'unknown') as unknown_slots,
        COUNT(ls.id) FILTER (WHERE ls.status = 'broken') as broken_slots,
        COUNT(ls.id) FILTER (WHERE ls.status = 'maintenance') as maintenance_slots,
        MAX(ls.last_health_check) as last_check,
        AVG(ls.temperature) as avg_temperature,
        ROUND(
          (COUNT(ls.id) FILTER (WHERE ls.health_status = 'good'))::NUMERIC /
          NULLIF(COUNT(ls.id), 0) * 100, 2
        ) as health_percentage
      FROM locker_locations ll
      LEFT JOIN locker_slots ls ON ll.id = ls.locker_location_id
      GROUP BY ll.id, ll.name, ll.city
      ORDER BY health_percentage ASC NULLS LAST, critical_slots DESC
    `);

    return result.rows;
  }

  /**
   * Get detailed health logs for a slot
   */
  async getSlotHealthHistory(slotId, limit = 50) {
    const result = await pool.query(`
      SELECT
        lhl.id,
        lhl.health_status,
        lhl.temperature,
        lhl.door_status,
        lhl.sensor_status,
        lhl.error_message,
        lhl.checked_at,
        au.username as checked_by_username
      FROM locker_health_logs lhl
      LEFT JOIN admin_users au ON lhl.checked_by = au.id
      WHERE lhl.slot_id = $1
      ORDER BY lhl.checked_at DESC
      LIMIT $2
    `, [slotId, limit]);

    return result.rows;
  }

  /**
   * Get slots requiring maintenance
   */
  async getMaintenanceQueue() {
    const result = await pool.query(`
      SELECT
        ls.id as slot_id,
        ls.slot_number,
        ls.size,
        ls.status,
        ls.health_status,
        ls.temperature,
        ls.last_health_check,
        ll.id as location_id,
        ll.name as location_name,
        ll.address,
        ll.city,
        -- Get latest error message
        (
          SELECT error_message
          FROM locker_health_logs
          WHERE slot_id = ls.id AND error_message IS NOT NULL
          ORDER BY checked_at DESC
          LIMIT 1
        ) as latest_error,
        -- Get count of recent issues
        (
          SELECT COUNT(*)
          FROM locker_health_logs
          WHERE slot_id = ls.id
            AND health_status IN ('warning', 'critical')
            AND checked_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) as issue_count_7d
      FROM locker_slots ls
      JOIN locker_locations ll ON ls.locker_location_id = ll.id
      WHERE ls.health_status IN ('warning', 'critical')
         OR ls.status IN ('maintenance', 'broken')
      ORDER BY
        CASE ls.health_status
          WHEN 'critical' THEN 1
          WHEN 'warning' THEN 2
          ELSE 3
        END,
        ls.last_health_check ASC NULLS FIRST
    `);

    return result.rows;
  }

  /**
   * Mark slot as fixed/repaired
   */
  async markSlotRepaired(slotId, repairedBy, notes = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update slot status
      await client.query(`
        UPDATE locker_slots
        SET
          status = 'available',
          health_status = 'good',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [slotId]);

      // Create health log entry
      await client.query(`
        INSERT INTO locker_health_logs (
          slot_id, health_status, error_message, checked_by
        )
        VALUES ($1, 'good', $2, $3)
      `, [slotId, notes ? `Repaired: ${notes}` : 'Slot repaired and returned to service', repairedBy]);

      await client.query('COMMIT');

      return { success: true, message: 'Slot marked as repaired' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get health statistics
   */
  async getHealthStatistics(days = 30) {
    const result = await pool.query(`
      SELECT
        DATE(checked_at) as date,
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE health_status = 'good') as good_count,
        COUNT(*) FILTER (WHERE health_status = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE health_status = 'critical') as critical_count,
        AVG(temperature) FILTER (WHERE temperature IS NOT NULL) as avg_temperature,
        COUNT(*) FILTER (WHERE door_status = 'jammed') as jammed_doors
      FROM locker_health_logs
      WHERE checked_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
      GROUP BY DATE(checked_at)
      ORDER BY date DESC
    `, [days]);

    return result.rows;
  }
}

module.exports = new HealthService();
