const db = require('../config/database');
const crypto = require('crypto');

/**
 * Generate a unique pickup code
 * @returns {Promise<string>} 6-character alphanumeric code
 */
const generatePickupCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
    let code;
    let exists = true;

    while (exists) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code already exists
        const result = await db.query(
            'SELECT EXISTS(SELECT 1 FROM parcels WHERE pickup_code = $1)',
            [code]
        );
        exists = result.rows[0].exists;
    }

    return code;
};

/**
 * Find available slots by location and size
 * @param {string} locationId - Locker location UUID
 * @param {string} slotSize - Size: SMALL, MEDIUM, LARGE, XLARGE
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Available slots
 */
const findAvailableSlots = async (locationId, slotSize, limit = 10) => {
    const query = `
        SELECT
            ls.id as slot_id,
            ls.slot_number,
            ls.size,
            ls.width_cm,
            ls.height_cm,
            ls.depth_cm,
            ls.max_weight_kg,
            l.id as locker_id,
            l.locker_number,
            l.occupied_slots,
            l.total_slots,
            ll.name as location_name,
            ll.address
        FROM locker_slots ls
        JOIN lockers l ON ls.locker_id = l.id
        JOIN locker_locations ll ON l.location_id = ll.id
        WHERE ll.id = $1
          AND ls.size = $2
          AND ls.status = 'AVAILABLE'
          AND l.status = 'ACTIVE'
          AND ll.is_active = TRUE
        ORDER BY l.occupied_slots ASC, ls.slot_number ASC
        LIMIT $3
    `;

    const result = await db.query(query, [locationId, slotSize, limit]);
    return result.rows;
};

/**
 * Reserve a slot atomically using database-level locking
 * @param {string} parcelId - Parcel UUID
 * @param {string} locationId - Location UUID
 * @param {string} slotSize - Slot size
 * @param {string} userId - User UUID
 * @param {number} durationMinutes - Reservation duration
 * @returns {Promise<object>} Reservation result
 */
const reserveSlotAtomic = async (parcelId, locationId, slotSize, userId, durationMinutes = 15) => {
    try {
        // Call the PostgreSQL function that handles atomic reservation with row-level locking
        const result = await db.query(
            'SELECT * FROM reserve_slot_atomic($1, $2, $3, $4, $5)',
            [parcelId, locationId, slotSize, userId, durationMinutes]
        );

        const reservation = result.rows[0];

        if (!reservation.success) {
            return {
                success: false,
                error: reservation.error_message
            };
        }

        // Log the reservation
        await db.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                'reservation',
                reservation.reservation_id,
                'RESERVE',
                userId,
                JSON.stringify({ parcel_id: parcelId, slot_id: reservation.slot_id })
            ]
        );

        return {
            success: true,
            slotId: reservation.slot_id,
            reservationId: reservation.reservation_id
        };
    } catch (error) {
        console.error('Error in atomic slot reservation:', error);
        return {
            success: false,
            error: 'Failed to reserve slot: ' + error.message
        };
    }
};

/**
 * Confirm parcel drop-off and generate pickup code
 * @param {string} parcelId - Parcel UUID
 * @param {string} userId - User UUID performing the action
 * @returns {Promise<object>} Confirmation result with pickup code
 */
const confirmDropOff = async (parcelId, userId) => {
    return await db.transaction(async (client) => {
        // Get parcel details
        const parcelResult = await client.query(
            'SELECT * FROM parcels WHERE id = $1',
            [parcelId]
        );

        if (parcelResult.rows.length === 0) {
            throw new Error('Parcel not found');
        }

        const parcel = parcelResult.rows[0];

        if (parcel.status !== 'RESERVED') {
            throw new Error('Parcel must be in RESERVED status');
        }

        // Generate pickup code
        const pickupCode = await generatePickupCode();

        // Calculate expiry (default 3 days from now)
        const expiryDays = parseInt(process.env.PARCEL_EXPIRY_DAYS) || 3;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        const pickupCodeExpiresAt = new Date();
        pickupCodeExpiresAt.setDate(pickupCodeExpiresAt.getDate() + expiryDays + 1); // Code valid for 1 day after parcel expiry

        // Update parcel
        const updateResult = await client.query(
            `UPDATE parcels
             SET status = 'IN_LOCKER',
                 pickup_code = $1,
                 pickup_code_expires_at = $2,
                 dropped_at = CURRENT_TIMESTAMP,
                 expires_at = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [pickupCode, pickupCodeExpiresAt, expiresAt, parcelId]
        );

        // Update slot status
        await client.query(
            `UPDATE locker_slots
             SET status = 'OCCUPIED'
             WHERE id = $1`,
            [parcel.slot_id]
        );

        // Confirm reservation
        await client.query(
            `UPDATE reservations
             SET confirmed_at = CURRENT_TIMESTAMP
             WHERE parcel_id = $1 AND is_active = TRUE`,
            [parcelId]
        );

        // Log the action
        await client.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, new_values)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                'parcel',
                parcelId,
                'DROP_OFF',
                userId,
                JSON.stringify({ pickup_code: pickupCode, expires_at: expiresAt })
            ]
        );

        return {
            success: true,
            pickupCode,
            expiresAt,
            parcel: updateResult.rows[0]
        };
    });
};

/**
 * Verify pickup code and release parcel
 * @param {string} pickupCode - 6-character pickup code
 * @param {string} verificationPhone - Phone number for verification
 * @returns {Promise<object>} Pickup result
 */
const pickupParcel = async (pickupCode, verificationPhone) => {
    return await db.transaction(async (client) => {
        // Find parcel by pickup code
        const parcelResult = await client.query(
            `SELECT p.*, ls.slot_number, l.locker_number, ll.name as location_name
             FROM parcels p
             JOIN locker_slots ls ON p.slot_id = ls.id
             JOIN lockers l ON ls.locker_id = l.id
             JOIN locker_locations ll ON l.location_id = ll.id
             WHERE p.pickup_code = $1 AND p.status = 'IN_LOCKER'
             FOR UPDATE`,
            [pickupCode]
        );

        if (parcelResult.rows.length === 0) {
            return {
                success: false,
                error: 'Invalid pickup code or parcel already picked up'
            };
        }

        const parcel = parcelResult.rows[0];

        // Verify phone number (last 4 digits match)
        const parcelPhone = parcel.recipient_phone.replace(/\D/g, '');
        const inputPhone = verificationPhone.replace(/\D/g, '');

        if (parcelPhone.slice(-4) !== inputPhone.slice(-4)) {
            return {
                success: false,
                error: 'Phone number verification failed'
            };
        }

        // Check if pickup code is expired
        if (new Date() > new Date(parcel.pickup_code_expires_at)) {
            return {
                success: false,
                error: 'Pickup code has expired. Please contact support.'
            };
        }

        // Update parcel status
        await client.query(
            `UPDATE parcels
             SET status = 'PICKED_UP',
                 picked_up_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [parcel.id]
        );

        // Release the slot
        await client.query(
            `UPDATE locker_slots
             SET status = 'AVAILABLE',
                 current_parcel_id = NULL,
                 last_opened = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [parcel.slot_id]
        );

        // Log the pickup
        await client.query(
            `INSERT INTO audit_logs (entity_type, entity_id, action, new_values)
             VALUES ($1, $2, $3, $4)`,
            [
                'parcel',
                parcel.id,
                'PICKUP',
                JSON.stringify({ picked_up_at: new Date() })
            ]
        );

        return {
            success: true,
            message: 'Parcel pickup successful',
            lockerInfo: {
                lockerNumber: parcel.locker_number,
                slotNumber: parcel.slot_number,
                location: parcel.location_name
            },
            parcel: {
                trackingNumber: parcel.tracking_number,
                recipientName: parcel.recipient_name
            }
        };
    });
};

/**
 * Clean up expired reservations
 * @returns {Promise<number>} Number of cleaned up reservations
 */
const cleanupExpiredReservations = async () => {
    const result = await db.query('SELECT cleanup_expired_reservations()');
    return result.rows[0].cleanup_expired_reservations;
};

/**
 * Get locker capacity overview
 * @param {string} locationId - Optional location filter
 * @returns {Promise<Array>} Capacity data
 */
const getLockerCapacity = async (locationId = null) => {
    let query = 'SELECT * FROM v_locker_capacity';
    const params = [];

    if (locationId) {
        query += ' WHERE location_id = $1';
        params.push(locationId);
    }

    query += ' ORDER BY occupancy_percent DESC';

    const result = await db.query(query, params);
    return result.rows;
};

/**
 * Get available slots grouped by location
 * @param {string} city - Optional city filter
 * @param {string} size - Optional size filter
 * @returns {Promise<Array>} Available slots by location
 */
const getAvailableSlotsByLocation = async (city = null, size = null) => {
    let query = `
        SELECT
            location_id,
            location_name,
            city,
            address,
            size,
            COUNT(*) as available_count
        FROM v_available_slots
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (city) {
        paramCount++;
        query += ` AND city = $${paramCount}`;
        params.push(city);
    }

    if (size) {
        paramCount++;
        query += ` AND size = $${paramCount}`;
        params.push(size);
    }

    query += ' GROUP BY location_id, location_name, city, address, size ORDER BY city, location_name, size';

    const result = await db.query(query, params);
    return result.rows;
};

/**
 * Get locker health status
 * @returns {Promise<Array>} Health status data
 */
const getLockerHealthStatus = async () => {
    const result = await db.query('SELECT * FROM v_locker_health_status ORDER BY maintenance_status DESC, location_name');
    return result.rows;
};

/**
 * Get expired parcels
 * @returns {Promise<Array>} Expired parcels needing attention
 */
const getExpiredParcels = async () => {
    const result = await db.query('SELECT * FROM v_expired_parcels');
    return result.rows;
};

module.exports = {
    generatePickupCode,
    findAvailableSlots,
    reserveSlotAtomic,
    confirmDropOff,
    pickupParcel,
    cleanupExpiredReservations,
    getLockerCapacity,
    getAvailableSlotsByLocation,
    getLockerHealthStatus,
    getExpiredParcels
};
