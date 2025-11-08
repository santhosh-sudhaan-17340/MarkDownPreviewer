const express = require('express');
const router = express.Router();
const reservationService = require('../services/reservationService');
const { validatePickupCodeFormat } = require('../utils/codeGenerator');
const Joi = require('joi');

/**
 * Validation schemas
 */
const reservationSchema = Joi.object({
  trackingNumber: Joi.string().required().max(50),
  recipientName: Joi.string().required().max(255),
  recipientEmail: Joi.string().email().required(),
  recipientPhone: Joi.string().required().max(20),
  size: Joi.string().valid('small', 'medium', 'large', 'extra_large').required(),
  preferredLocationId: Joi.string().uuid().optional(),
  senderName: Joi.string().max(255).optional(),
  senderEmail: Joi.string().email().optional(),
  senderPhone: Joi.string().max(20).optional(),
  deliveryNotes: Joi.string().max(1000).optional()
});

const pickupSchema = Joi.object({
  pickupCode: Joi.string().required(),
  email: Joi.string().email().optional()
});

/**
 * POST /api/reservations
 * Reserve a locker slot for a parcel
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = reservationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await reservationService.reserveLocker(value, {
      preferredLocationId: value.preferredLocationId
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Reservation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reservations/:id/deliver
 * Mark parcel as delivered to locker
 */
router.post('/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await reservationService.markAsDelivered(id);

    res.json(result);
  } catch (error) {
    console.error('Delivery error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reservations/pickup
 * Process parcel pickup with code validation
 */
router.post('/pickup', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = pickupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { pickupCode, email } = value;

    // Validate code format
    if (!validatePickupCodeFormat(pickupCode)) {
      return res.status(400).json({ error: 'Invalid pickup code format' });
    }

    const result = await reservationService.processPickup(pickupCode, { email });

    res.json(result);
  } catch (error) {
    console.error('Pickup error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/reservations/track/:trackingNumber
 * Track parcel status
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const result = await pool.query(`
      SELECT
        p.tracking_number,
        p.status as parcel_status,
        p.size,
        p.created_at,
        r.pickup_code,
        r.status as reservation_status,
        r.reserved_at,
        r.delivered_at,
        r.picked_up_at,
        r.expires_at,
        ls.slot_number,
        ll.name as locker_name,
        ll.address as locker_address,
        ll.city,
        ll.operating_hours
      FROM parcels p
      LEFT JOIN reservations r ON p.id = r.parcel_id AND r.status != 'cancelled'
      LEFT JOIN locker_slots ls ON r.slot_id = ls.id
      LEFT JOIN locker_locations ll ON ls.locker_location_id = ll.id
      WHERE p.tracking_number = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [trackingNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tracking number not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/reservations/:id
 * Cancel reservation
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await reservationService.cancelReservation(id, reason);

    res.json(result);
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
