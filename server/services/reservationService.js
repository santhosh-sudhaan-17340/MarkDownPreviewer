const pool = require('../config/database');
const { generatePickupCode } = require('../utils/codeGenerator');
const { createAuditLog } = require('../utils/auditLogger');

class ReservationService {
  /**
   * Reserve a locker slot for a parcel (ATOMIC OPERATION)
   * Uses database transactions to ensure data consistency
   */
  async reserveLocker(parcelData, preferences = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const {
        trackingNumber,
        recipientName,
        recipientEmail,
        recipientPhone,
        size,
        preferredLocationId,
        senderName,
        senderEmail,
        senderPhone,
        deliveryNotes
      } = parcelData;

      // Step 1: Find available slot (with row-level locking)
      let slotQuery = `
        SELECT ls.id, ls.slot_number, ls.locker_location_id, ll.name as locker_name
        FROM locker_slots ls
        JOIN locker_locations ll ON ls.locker_location_id = ll.id
        WHERE ls.status = 'available'
          AND ls.size = $1
          AND ll.status = 'active'
      `;

      const queryParams = [size];

      if (preferredLocationId) {
        slotQuery += ` AND ll.id = $2`;
        queryParams.push(preferredLocationId);
      }

      // Order by location priority and slot number
      slotQuery += `
        ORDER BY
          CASE WHEN ll.id = $${preferredLocationId ? 2 : 1} THEN 0 ELSE 1 END,
          ls.slot_number
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;

      const slotResult = await client.query(slotQuery, queryParams);

      if (slotResult.rows.length === 0) {
        throw new Error(`No available ${size} slots found` +
          (preferredLocationId ? ' at preferred location' : ''));
      }

      const slot = slotResult.rows[0];

      // Step 2: Create or update parcel record
      const parcelResult = await client.query(`
        INSERT INTO parcels (
          tracking_number, recipient_name, recipient_email, recipient_phone,
          size, sender_name, sender_email, sender_phone, delivery_notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_transit')
        ON CONFLICT (tracking_number)
        DO UPDATE SET
          recipient_name = EXCLUDED.recipient_name,
          recipient_email = EXCLUDED.recipient_email,
          recipient_phone = EXCLUDED.recipient_phone,
          size = EXCLUDED.size,
          status = 'in_transit',
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, tracking_number
      `, [
        trackingNumber, recipientName, recipientEmail, recipientPhone,
        size, senderName, senderEmail, senderPhone, deliveryNotes
      ]);

      const parcel = parcelResult.rows[0];

      // Step 3: Generate unique pickup code
      let pickupCode;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        pickupCode = generatePickupCode();
        const codeCheck = await client.query(
          'SELECT id FROM reservations WHERE pickup_code = $1',
          [pickupCode]
        );
        isUnique = codeCheck.rows.length === 0;
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique pickup code');
      }

      // Step 4: Create reservation with expiry
      const expiryHours = process.env.DEFAULT_PICKUP_EXPIRY_HOURS || 48;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiryHours));

      const reservationResult = await client.query(`
        INSERT INTO reservations (
          parcel_id, slot_id, pickup_code, status, expires_at
        )
        VALUES ($1, $2, $3, 'active', $4)
        RETURNING id, pickup_code, reserved_at, expires_at
      `, [parcel.id, slot.id, pickupCode, expiresAt]);

      const reservation = reservationResult.rows[0];

      // Step 5: Update slot status to reserved
      await client.query(`
        UPDATE locker_slots
        SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [slot.id]);

      // Step 6: Create audit log
      await createAuditLog(client, {
        entityType: 'reservation',
        entityId: reservation.id,
        action: 'create',
        performedBy: null,
        performedByType: 'system',
        changes: {
          tracking_number: trackingNumber,
          slot_number: slot.slot_number,
          locker_location: slot.locker_name
        }
      });

      // Step 7: Queue notification
      await client.query(`
        INSERT INTO notification_queue (
          recipient_email, recipient_phone, notification_type,
          subject, message, parcel_id, reservation_id
        )
        VALUES ($1, $2, 'delivery_confirmation', $3, $4, $5, $6)
      `, [
        recipientEmail,
        recipientPhone,
        'Parcel Ready for Delivery',
        `Your parcel ${trackingNumber} has been reserved for locker delivery. Pickup code: ${pickupCode}`,
        parcel.id,
        reservation.id
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        reservation: {
          id: reservation.id,
          trackingNumber: trackingNumber,
          pickupCode: pickupCode,
          slotNumber: slot.slot_number,
          lockerName: slot.locker_name,
          lockerLocationId: slot.locker_location_id,
          reservedAt: reservation.reserved_at,
          expiresAt: reservation.expires_at,
          expiryHours: expiryHours
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Reservation failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark parcel as delivered to locker (driver/system action)
   */
  async markAsDelivered(reservationId, deliveredBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update reservation status
      const result = await client.query(`
        UPDATE reservations
        SET delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'active'
        RETURNING id, parcel_id, slot_id
      `, [reservationId]);

      if (result.rows.length === 0) {
        throw new Error('Reservation not found or not active');
      }

      const reservation = result.rows[0];

      // Update slot status to occupied
      await client.query(`
        UPDATE locker_slots
        SET status = 'occupied', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.slot_id]);

      // Update parcel status
      await client.query(`
        UPDATE parcels
        SET status = 'delivered_to_locker', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.parcel_id]);

      // Create audit log
      await createAuditLog(client, {
        entityType: 'reservation',
        entityId: reservation.id,
        action: 'deliver',
        performedBy: deliveredBy,
        performedByType: deliveredBy ? 'user' : 'system'
      });

      await client.query('COMMIT');

      return { success: true, message: 'Parcel marked as delivered' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process parcel pickup with code validation (ATOMIC OPERATION)
   */
  async processPickup(pickupCode, additionalVerification = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find reservation with locking
      const reservationResult = await client.query(`
        SELECT
          r.id, r.parcel_id, r.slot_id, r.status, r.expires_at,
          r.pickup_attempts, r.delivered_at,
          p.tracking_number, p.recipient_email, p.recipient_phone,
          ls.slot_number, ls.locker_location_id,
          ll.name as locker_name
        FROM reservations r
        JOIN parcels p ON r.parcel_id = p.id
        JOIN locker_slots ls ON r.slot_id = ls.id
        JOIN locker_locations ll ON ls.locker_location_id = ll.id
        WHERE r.pickup_code = $1
        FOR UPDATE
      `, [pickupCode]);

      if (reservationResult.rows.length === 0) {
        throw new Error('Invalid pickup code');
      }

      const reservation = reservationResult.rows[0];

      // Record pickup attempt
      await client.query(`
        UPDATE reservations
        SET pickup_attempts = pickup_attempts + 1,
            last_pickup_attempt = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.id]);

      // Validate reservation status
      if (reservation.status !== 'active') {
        throw new Error(`Reservation is ${reservation.status}`);
      }

      if (!reservation.delivered_at) {
        throw new Error('Parcel has not been delivered to locker yet');
      }

      // Check expiry
      if (new Date() > new Date(reservation.expires_at)) {
        await client.query(`
          UPDATE reservations SET status = 'expired' WHERE id = $1
        `, [reservation.id]);
        throw new Error('Pickup code has expired');
      }

      // Additional verification (email or phone)
      if (additionalVerification.email) {
        if (reservation.recipient_email.toLowerCase() !== additionalVerification.email.toLowerCase()) {
          throw new Error('Email verification failed');
        }
      }

      // Process successful pickup
      await client.query(`
        UPDATE reservations
        SET status = 'completed',
            picked_up_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.id]);

      // Release slot
      await client.query(`
        UPDATE locker_slots
        SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.slot_id]);

      // Update parcel status
      await client.query(`
        UPDATE parcels
        SET status = 'picked_up', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.parcel_id]);

      // Create audit log
      await createAuditLog(client, {
        entityType: 'reservation',
        entityId: reservation.id,
        action: 'pickup',
        performedBy: null,
        performedByType: 'user',
        changes: {
          pickup_code: pickupCode,
          tracking_number: reservation.tracking_number
        }
      });

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Pickup successful',
        parcel: {
          trackingNumber: reservation.tracking_number,
          slotNumber: reservation.slot_number,
          lockerName: reservation.locker_name
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel reservation and release slot
   */
  async cancelReservation(reservationId, reason = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(`
        UPDATE reservations
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status IN ('active', 'expired')
        RETURNING id, slot_id, parcel_id
      `, [reservationId]);

      if (result.rows.length === 0) {
        throw new Error('Reservation not found or cannot be cancelled');
      }

      const reservation = result.rows[0];

      // Release slot
      await client.query(`
        UPDATE locker_slots
        SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.slot_id]);

      // Update parcel
      await client.query(`
        UPDATE parcels
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [reservation.parcel_id]);

      // Audit log
      await createAuditLog(client, {
        entityType: 'reservation',
        entityId: reservation.id,
        action: 'cancel',
        performedBy: null,
        performedByType: 'system',
        changes: { reason }
      });

      await client.query('COMMIT');

      return { success: true, message: 'Reservation cancelled' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ReservationService();
