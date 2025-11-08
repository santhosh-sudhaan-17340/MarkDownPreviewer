const { db, transaction, logAudit } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique pickup code
 */
function generatePickupCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate a unique PIN code
 */
function generatePinCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Find available slot atomically
 * This ensures no race conditions when multiple users try to reserve simultaneously
 */
const findAndReserveSlot = transaction((locationId, size, parcelId, expiryHours = 72) => {
    // Find an available slot of the required size at the specified location
    const slot = db.prepare(`
        SELECT s.id, s.slot_number, s.locker_id, l.locker_number, loc.name as location_name
        FROM slots s
        JOIN lockers l ON s.locker_id = l.id
        JOIN locations loc ON l.location_id = loc.id
        WHERE l.location_id = ?
          AND s.size = ?
          AND s.status = 'available'
          AND l.status = 'operational'
          AND loc.status = 'active'
        ORDER BY s.id
        LIMIT 1
    `).get(locationId, size);

    if (!slot) {
        throw new Error(`No available ${size} slots at this location`);
    }

    // Generate unique pickup code and PIN
    let pickupCode, pinCode;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        pickupCode = generatePickupCode();
        pinCode = generatePinCode();
        attempts++;

        const existing = db.prepare('SELECT id FROM reservations WHERE pickup_code = ?').get(pickupCode);
        if (!existing) break;

        if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique pickup code');
        }
    } while (true);

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Update slot status to reserved
    db.prepare(`
        UPDATE slots
        SET status = 'reserved', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(slot.id);

    // Create reservation
    const result = db.prepare(`
        INSERT INTO reservations (parcel_id, slot_id, pickup_code, pin_code, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(parcelId, slot.id, pickupCode, pinCode, expiresAt.toISOString());

    // Log the reservation
    logAudit('reservation', result.lastInsertRowid, 'created', 'system', null, null,
        JSON.stringify({ slotId: slot.id, pickupCode, expiresAt }));

    return {
        reservationId: result.lastInsertRowid,
        slotId: slot.id,
        slotNumber: slot.slot_number,
        lockerNumber: slot.locker_number,
        locationName: slot.location_name,
        pickupCode,
        pinCode,
        expiresAt
    };
});

/**
 * Create a new parcel and reserve a slot atomically
 */
function createParcelAndReserve(parcelData, locationId) {
    const createTransaction = transaction(() => {
        // Generate tracking number
        const trackingNumber = `PKG${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Insert parcel
        const parcelResult = db.prepare(`
            INSERT INTO parcels (
                tracking_number, sender_name, sender_email, sender_phone,
                recipient_name, recipient_email, recipient_phone,
                size, weight_kg, description, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(
            trackingNumber,
            parcelData.senderName,
            parcelData.senderEmail,
            parcelData.senderPhone,
            parcelData.recipientName,
            parcelData.recipientEmail,
            parcelData.recipientPhone,
            parcelData.size,
            parcelData.weightKg,
            parcelData.description
        );

        const parcelId = parcelResult.lastInsertRowid;
        logAudit('parcel', parcelId, 'created', 'user', null, null, JSON.stringify(parcelData));

        // Reserve slot
        const reservation = findAndReserveSlot(locationId, parcelData.size, parcelId,
            parseInt(process.env.PICKUP_CODE_EXPIRY_HOURS) || 72);

        // Update parcel status
        db.prepare('UPDATE parcels SET status = ? WHERE id = ?').run('in_transit', parcelId);

        return {
            trackingNumber,
            parcelId,
            ...reservation
        };
    });

    return createTransaction();
}

/**
 * Mark parcel as delivered (arrived at locker)
 */
const markAsDelivered = transaction((reservationId) => {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

    if (!reservation) {
        throw new Error('Reservation not found');
    }

    if (reservation.status !== 'reserved') {
        throw new Error(`Cannot deliver parcel with status: ${reservation.status}`);
    }

    // Update reservation
    db.prepare(`
        UPDATE reservations
        SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(reservationId);

    // Update slot
    db.prepare(`
        UPDATE slots
        SET status = 'occupied', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(reservation.slot_id);

    // Update parcel
    db.prepare(`
        UPDATE parcels
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run('delivered', reservation.parcel_id);

    logAudit('reservation', reservationId, 'delivered', 'system');

    return true;
});

/**
 * Process pickup with code and PIN verification
 */
const processPickup = transaction((pickupCode, pinCode) => {
    const reservation = db.prepare(`
        SELECT r.*, s.slot_number, l.locker_number, loc.name as location_name,
               p.tracking_number, p.recipient_name, p.recipient_email
        FROM reservations r
        JOIN slots s ON r.slot_id = s.id
        JOIN lockers l ON s.locker_id = l.id
        JOIN locations loc ON l.location_id = loc.id
        JOIN parcels p ON r.parcel_id = p.id
        WHERE r.pickup_code = ? AND r.pin_code = ?
    `).get(pickupCode, pinCode);

    if (!reservation) {
        throw new Error('Invalid pickup code or PIN');
    }

    if (reservation.status !== 'delivered') {
        throw new Error(`Cannot pickup parcel with status: ${reservation.status}`);
    }

    // Check if expired
    if (new Date(reservation.expires_at) < new Date()) {
        throw new Error('Pickup code has expired');
    }

    // Mark as picked up
    db.prepare(`
        UPDATE reservations
        SET status = 'picked_up', picked_up_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(reservation.id);

    // Free up the slot
    db.prepare(`
        UPDATE slots
        SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(reservation.slot_id);

    // Update parcel
    db.prepare(`
        UPDATE parcels
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run('picked_up', reservation.parcel_id);

    logAudit('reservation', reservation.id, 'picked_up', 'user', null, null,
        JSON.stringify({ pickupCode }));

    return {
        trackingNumber: reservation.tracking_number,
        slotNumber: reservation.slot_number,
        lockerNumber: reservation.locker_number,
        locationName: reservation.location_name
    };
});

/**
 * Get available capacity by location
 */
function getLocationCapacity(locationId) {
    const capacity = db.prepare(`
        SELECT
            s.size,
            COUNT(*) as total,
            SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
            SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) as reserved,
            SUM(CASE WHEN s.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
        FROM slots s
        JOIN lockers l ON s.locker_id = l.id
        WHERE l.location_id = ? AND l.status = 'operational'
        GROUP BY s.size
    `).all(locationId);

    return capacity;
}

/**
 * Process expired reservations
 */
const processExpiredReservations = transaction(() => {
    const expired = db.prepare(`
        SELECT id, slot_id, parcel_id
        FROM reservations
        WHERE status IN ('reserved', 'delivered')
          AND expires_at < datetime('now')
    `).all();

    let count = 0;

    for (const reservation of expired) {
        // Update reservation
        db.prepare(`
            UPDATE reservations
            SET status = 'expired', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(reservation.id);

        // Free slot
        db.prepare(`
            UPDATE slots
            SET status = 'available', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(reservation.slot_id);

        // Update parcel
        db.prepare(`
            UPDATE parcels
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run('expired', reservation.parcel_id);

        logAudit('reservation', reservation.id, 'expired', 'system');
        count++;
    }

    return count;
});

module.exports = {
    createParcelAndReserve,
    markAsDelivered,
    processPickup,
    getLocationCapacity,
    processExpiredReservations,
    generatePickupCode,
    generatePinCode
};
