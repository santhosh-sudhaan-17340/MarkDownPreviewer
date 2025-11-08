const pool = require('../config/database');
const cron = require('node-cron');
const { createAuditLog } = require('../utils/auditLogger');

class ExpiryService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Start all scheduled jobs
   */
  startScheduledJobs() {
    console.log('Starting scheduled jobs for expiry management...');

    // Run every hour to check for expired reservations
    const expiryCheckJob = cron.schedule('0 * * * *', async () => {
      console.log('Running expiry check...');
      await this.processExpiredReservations();
    });

    // Run every 6 hours to send expiry warnings
    const warningJob = cron.schedule('0 */6 * * *', async () => {
      console.log('Checking for expiring parcels...');
      await this.sendExpiryWarnings();
    });

    // Run daily at 2 AM to clean up old records
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('Running daily cleanup...');
      await this.cleanupOldRecords();
    });

    this.jobs.push(expiryCheckJob, warningJob, cleanupJob);

    console.log('✓ Scheduled jobs started');
    console.log('  - Expiry check: Every hour');
    console.log('  - Warning notifications: Every 6 hours');
    console.log('  - Cleanup: Daily at 2 AM');
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledJobs() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('✓ Scheduled jobs stopped');
  }

  /**
   * Process expired reservations
   */
  async processExpiredReservations() {
    const client = await pool.connect();
    let processedCount = 0;

    try {
      await client.query('BEGIN');

      // Find expired reservations
      const expiredResult = await client.query(`
        SELECT r.id, r.parcel_id, r.slot_id, r.pickup_code, p.tracking_number
        FROM reservations r
        JOIN parcels p ON r.parcel_id = p.id
        WHERE r.status = 'active'
          AND r.expires_at < CURRENT_TIMESTAMP
        FOR UPDATE SKIP LOCKED
      `);

      const expiredReservations = expiredResult.rows;

      if (expiredReservations.length === 0) {
        console.log('No expired reservations found');
        await client.query('COMMIT');
        return { processed: 0 };
      }

      console.log(`Found ${expiredReservations.length} expired reservations`);

      for (const reservation of expiredReservations) {
        // Update reservation status
        await client.query(`
          UPDATE reservations
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [reservation.id]);

        // Release slot back to available
        await client.query(`
          UPDATE locker_slots
          SET status = 'available', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [reservation.slot_id]);

        // Update parcel status
        await client.query(`
          UPDATE parcels
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [reservation.parcel_id]);

        // Create audit log
        await createAuditLog(client, {
          entityType: 'reservation',
          entityId: reservation.id,
          action: 'expire',
          performedBy: null,
          performedByType: 'system',
          changes: {
            tracking_number: reservation.tracking_number,
            pickup_code: reservation.pickup_code
          }
        });

        // Queue notification for expired parcel
        await client.query(`
          INSERT INTO notification_queue (
            recipient_email, notification_type, subject, message, parcel_id, reservation_id
          )
          SELECT
            p.recipient_email,
            'parcel_expired',
            'Parcel Pickup Expired',
            'Your parcel ' || p.tracking_number || ' has expired and will be returned to sender.',
            p.id,
            r.id
          FROM parcels p
          JOIN reservations r ON p.id = r.parcel_id
          WHERE r.id = $1
        `, [reservation.id]);

        processedCount++;
      }

      await client.query('COMMIT');

      console.log(`✓ Processed ${processedCount} expired reservations`);

      return { processed: processedCount };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to process expired reservations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send warnings for soon-to-expire parcels
   */
  async sendExpiryWarnings() {
    const client = await pool.connect();

    try {
      // Find reservations expiring in the next 12 hours that haven't been picked up
      const result = await client.query(`
        SELECT
          r.id as reservation_id,
          r.pickup_code,
          r.expires_at,
          p.id as parcel_id,
          p.tracking_number,
          p.recipient_email,
          p.recipient_phone,
          ls.slot_number,
          ll.name as locker_name,
          ll.address as locker_address,
          EXTRACT(EPOCH FROM (r.expires_at - CURRENT_TIMESTAMP))/3600 as hours_remaining
        FROM reservations r
        JOIN parcels p ON r.parcel_id = p.id
        JOIN locker_slots ls ON r.slot_id = ls.id
        JOIN locker_locations ll ON ls.locker_location_id = ll.id
        WHERE r.status = 'active'
          AND r.delivered_at IS NOT NULL
          AND r.picked_up_at IS NULL
          AND r.expires_at > CURRENT_TIMESTAMP
          AND r.expires_at < CURRENT_TIMESTAMP + INTERVAL '12 hours'
          AND NOT EXISTS (
            SELECT 1 FROM notification_queue nq
            WHERE nq.reservation_id = r.id
              AND nq.notification_type = 'expiry_warning'
              AND nq.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
          )
      `);

      const expiringParcels = result.rows;

      if (expiringParcels.length === 0) {
        console.log('No parcels expiring soon');
        return { sent: 0 };
      }

      console.log(`Sending expiry warnings for ${expiringParcels.length} parcels`);

      for (const parcel of expiringParcels) {
        const hoursRemaining = Math.floor(parcel.hours_remaining);
        const message = `URGENT: Your parcel ${parcel.tracking_number} at ${parcel.locker_name} will expire in ${hoursRemaining} hours. Pickup code: ${parcel.pickup_code}. Location: ${parcel.locker_address}`;

        await client.query(`
          INSERT INTO notification_queue (
            recipient_email, recipient_phone, notification_type,
            subject, message, parcel_id, reservation_id
          )
          VALUES ($1, $2, 'expiry_warning', $3, $4, $5, $6)
        `, [
          parcel.recipient_email,
          parcel.recipient_phone,
          'Urgent: Parcel Expiring Soon',
          message,
          parcel.parcel_id,
          parcel.reservation_id
        ]);
      }

      console.log(`✓ Queued ${expiringParcels.length} expiry warnings`);

      return { sent: expiringParcels.length };

    } catch (error) {
      console.error('Failed to send expiry warnings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up old records (older than 90 days)
   */
  async cleanupOldRecords() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete old audit logs (keep 90 days)
      const auditResult = await client.query(`
        DELETE FROM audit_logs
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      `);

      // Delete old health logs (keep 90 days)
      const healthResult = await client.query(`
        DELETE FROM locker_health_logs
        WHERE checked_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      `);

      // Delete old completed/expired reservations (keep 90 days)
      const reservationResult = await client.query(`
        DELETE FROM reservations
        WHERE status IN ('completed', 'expired', 'cancelled')
          AND updated_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      `);

      // Delete old sent notifications (keep 30 days)
      const notificationResult = await client.query(`
        DELETE FROM notification_queue
        WHERE status = 'sent'
          AND sent_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);

      await client.query('COMMIT');

      console.log('✓ Cleanup completed:');
      console.log(`  - Audit logs: ${auditResult.rowCount} deleted`);
      console.log(`  - Health logs: ${healthResult.rowCount} deleted`);
      console.log(`  - Reservations: ${reservationResult.rowCount} deleted`);
      console.log(`  - Notifications: ${notificationResult.rowCount} deleted`);

      return {
        auditLogs: auditResult.rowCount,
        healthLogs: healthResult.rowCount,
        reservations: reservationResult.rowCount,
        notifications: notificationResult.rowCount
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Cleanup failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get expiring parcels summary
   */
  async getExpiringSummary() {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP + INTERVAL '6 hours') as expiring_6h,
        COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP + INTERVAL '12 hours') as expiring_12h,
        COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP + INTERVAL '24 hours') as expiring_24h,
        COUNT(*) as total_active
      FROM reservations
      WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP
    `);

    return result.rows[0];
  }
}

module.exports = new ExpiryService();
