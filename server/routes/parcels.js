const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const lockerService = require('../services/lockerService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

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
 * POST /api/parcels - Create a new parcel shipment
 */
router.post('/',
    optionalAuth,
    [
        body('senderName').trim().notEmpty().withMessage('Sender name is required'),
        body('senderPhone').optional().matches(/^[0-9+\-() ]+$/),
        body('senderEmail').optional().isEmail(),
        body('recipientName').trim().notEmpty().withMessage('Recipient name is required'),
        body('recipientPhone').matches(/^[0-9+\-() ]+$/).withMessage('Valid phone number required'),
        body('recipientEmail').isEmail().withMessage('Valid email required'),
        body('parcelSize').isIn(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']).withMessage('Invalid parcel size'),
        body('weightKg').optional().isFloat({ min: 0.1, max: 100 }),
        body('notes').optional().trim()
    ],
    validate,
    async (req, res) => {
        try {
            const {
                senderName,
                senderPhone,
                senderEmail,
                recipientName,
                recipientPhone,
                recipientEmail,
                parcelSize,
                weightKg,
                notes
            } = req.body;

            // Generate unique tracking number
            const trackingNumber = 'PKG' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

            const result = await db.query(
                `INSERT INTO parcels (
                    tracking_number, sender_id, sender_name, sender_phone, sender_email,
                    recipient_name, recipient_phone, recipient_email,
                    parcel_size, weight_kg, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *`,
                [
                    trackingNumber,
                    req.user?.id || null,
                    senderName,
                    senderPhone,
                    senderEmail,
                    recipientName,
                    recipientPhone,
                    recipientEmail,
                    parcelSize,
                    weightKg,
                    notes,
                    'PENDING'
                ]
            );

            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error creating parcel:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create parcel shipment'
            });
        }
    }
);

/**
 * POST /api/parcels/:id/reserve - Reserve a locker slot for parcel
 */
router.post('/:id/reserve',
    authenticateToken,
    [
        param('id').isUUID().withMessage('Invalid parcel ID'),
        body('locationId').isUUID().withMessage('Invalid location ID'),
        body('reservationMinutes').optional().isInt({ min: 5, max: 120 })
    ],
    validate,
    async (req, res) => {
        try {
            const { id: parcelId } = req.params;
            const { locationId, reservationMinutes = 15 } = req.body;

            // Verify parcel exists and belongs to user or user is admin
            const parcelCheck = await db.query(
                'SELECT * FROM parcels WHERE id = $1',
                [parcelId]
            );

            if (parcelCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Parcel not found'
                });
            }

            const parcel = parcelCheck.rows[0];

            // Check authorization
            if (req.user.role === 'CUSTOMER' && parcel.sender_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to reserve slot for this parcel'
                });
            }

            if (parcel.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Parcel already has a slot reserved or is not in PENDING status'
                });
            }

            // Reserve slot atomically
            const reservation = await lockerService.reserveSlotAtomic(
                parcelId,
                locationId,
                parcel.parcel_size,
                req.user.id,
                reservationMinutes
            );

            if (!reservation.success) {
                return res.status(400).json({
                    success: false,
                    error: reservation.error
                });
            }

            // Get updated parcel info
            const updatedParcel = await db.query(
                `SELECT p.*, ls.slot_number, l.locker_number, ll.name as location_name, ll.address
                 FROM parcels p
                 JOIN locker_slots ls ON p.slot_id = ls.id
                 JOIN lockers l ON ls.locker_id = l.id
                 JOIN locker_locations ll ON l.location_id = ll.id
                 WHERE p.id = $1`,
                [parcelId]
            );

            res.json({
                success: true,
                data: {
                    parcel: updatedParcel.rows[0],
                    reservationId: reservation.reservationId,
                    message: `Slot reserved for ${reservationMinutes} minutes. Please drop off your parcel soon.`
                }
            });
        } catch (error) {
            console.error('Error reserving slot:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reserve locker slot'
            });
        }
    }
);

/**
 * POST /api/parcels/:id/confirm-dropoff - Confirm parcel has been dropped off
 */
router.post('/:id/confirm-dropoff',
    authenticateToken,
    [
        param('id').isUUID()
    ],
    validate,
    async (req, res) => {
        try {
            const { id: parcelId } = req.params;

            const result = await lockerService.confirmDropOff(parcelId, req.user.id);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

            res.json({
                success: true,
                data: {
                    pickupCode: result.pickupCode,
                    expiresAt: result.expiresAt,
                    message: 'Parcel successfully dropped off. Pickup code has been generated.'
                }
            });
        } catch (error) {
            console.error('Error confirming drop-off:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * POST /api/parcels/pickup - Pick up parcel using code
 */
router.post('/pickup',
    [
        body('pickupCode').trim().isLength({ min: 6, max: 6 }).withMessage('Invalid pickup code'),
        body('phone').matches(/^[0-9+\-() ]+$/).withMessage('Valid phone number required')
    ],
    validate,
    async (req, res) => {
        try {
            const { pickupCode, phone } = req.body;

            const result = await lockerService.pickupParcel(
                pickupCode.toUpperCase(),
                phone
            );

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error
                });
            }

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error picking up parcel:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process pickup'
            });
        }
    }
);

/**
 * GET /api/parcels/track/:trackingNumber - Track parcel by tracking number
 */
router.get('/track/:trackingNumber',
    [
        param('trackingNumber').trim().notEmpty()
    ],
    validate,
    async (req, res) => {
        try {
            const { trackingNumber } = req.params;

            const result = await db.query(
                `SELECT
                    p.*,
                    ls.slot_number,
                    l.locker_number,
                    ll.name as location_name,
                    ll.address,
                    ll.city
                FROM parcels p
                LEFT JOIN locker_slots ls ON p.slot_id = ls.id
                LEFT JOIN lockers l ON ls.locker_id = l.id
                LEFT JOIN locker_locations ll ON l.location_id = ll.id
                WHERE p.tracking_number = $1`,
                [trackingNumber]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Tracking number not found'
                });
            }

            // Remove sensitive info if not authenticated
            const parcel = result.rows[0];
            delete parcel.pickup_code;

            res.json({
                success: true,
                data: parcel
            });
        } catch (error) {
            console.error('Error tracking parcel:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to track parcel'
            });
        }
    }
);

/**
 * GET /api/parcels/my-parcels - Get user's parcels
 */
router.get('/my-parcels',
    authenticateToken,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT
                    p.*,
                    ls.slot_number,
                    l.locker_number,
                    ll.name as location_name
                FROM parcels p
                LEFT JOIN locker_slots ls ON p.slot_id = ls.id
                LEFT JOIN lockers l ON ls.locker_id = l.id
                LEFT JOIN locker_locations ll ON l.location_id = ll.id
                WHERE p.sender_id = $1 OR p.recipient_id = $1
                ORDER BY p.created_at DESC`,
                [req.user.id]
            );

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error fetching user parcels:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch parcels'
            });
        }
    }
);

module.exports = router;
