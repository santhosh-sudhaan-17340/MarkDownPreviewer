const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const lockerService = require('../services/lockerService');

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
 * GET /api/locations - Get all active locker locations
 */
router.get('/', async (req, res) => {
    try {
        const { city, size } = req.query;

        const locations = await db.query(
            `SELECT
                ll.*,
                COUNT(DISTINCT l.id) as locker_count,
                COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'AVAILABLE') as available_slots,
                COUNT(DISTINCT ls.id) FILTER (WHERE ls.size = $2 AND ls.status = 'AVAILABLE') as available_slots_of_size
            FROM locker_locations ll
            LEFT JOIN lockers l ON ll.id = l.location_id AND l.status = 'ACTIVE'
            LEFT JOIN locker_slots ls ON l.id = ls.locker_id
            WHERE ll.is_active = TRUE
                AND ($1::VARCHAR IS NULL OR ll.city = $1)
            GROUP BY ll.id
            HAVING COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'AVAILABLE') > 0
            ORDER BY ll.city, ll.name`,
            [city || null, size || null]
        );

        res.json({
            success: true,
            data: locations.rows
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch locations'
        });
    }
});

/**
 * GET /api/locations/:id - Get location details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const location = await db.query(
            'SELECT * FROM locker_locations WHERE id = $1',
            [id]
        );

        if (location.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Location not found'
            });
        }

        // Get lockers at this location
        const lockers = await db.query(
            `SELECT
                l.*,
                COUNT(ls.id) as total_slots,
                COUNT(ls.id) FILTER (WHERE ls.status = 'AVAILABLE') as available_slots,
                COUNT(ls.id) FILTER (WHERE ls.size = 'SMALL' AND ls.status = 'AVAILABLE') as small_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'MEDIUM' AND ls.status = 'AVAILABLE') as medium_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'LARGE' AND ls.status = 'AVAILABLE') as large_available,
                COUNT(ls.id) FILTER (WHERE ls.size = 'XLARGE' AND ls.status = 'AVAILABLE') as xlarge_available
            FROM lockers l
            LEFT JOIN locker_slots ls ON l.id = ls.locker_id
            WHERE l.location_id = $1
            GROUP BY l.id
            ORDER BY l.locker_number`,
            [id]
        );

        res.json({
            success: true,
            data: {
                location: location.rows[0],
                lockers: lockers.rows
            }
        });
    } catch (error) {
        console.error('Error fetching location details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch location details'
        });
    }
});

/**
 * GET /api/locations/:id/available-slots - Get available slots at location
 */
router.get('/:id/available-slots',
    [
        query('size').optional().isIn(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'])
    ],
    validate,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { size } = req.query;

            let query = `
                SELECT
                    ls.id,
                    ls.slot_number,
                    ls.size,
                    ls.width_cm,
                    ls.height_cm,
                    ls.depth_cm,
                    ls.max_weight_kg,
                    l.locker_number,
                    l.id as locker_id
                FROM locker_slots ls
                JOIN lockers l ON ls.locker_id = l.id
                WHERE l.location_id = $1
                    AND ls.status = 'AVAILABLE'
                    AND l.status = 'ACTIVE'
            `;

            const params = [id];

            if (size) {
                query += ' AND ls.size = $2';
                params.push(size);
            }

            query += ' ORDER BY l.locker_number, ls.slot_number';

            const result = await db.query(query, params);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error fetching available slots:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch available slots'
            });
        }
    }
);

/**
 * GET /api/locations/nearby - Find nearby locations (requires lat/lng)
 */
router.get('/nearby/search',
    [
        query('lat').isFloat({ min: -90, max: 90 }),
        query('lng').isFloat({ min: -180, max: 180 }),
        query('radius').optional().isInt({ min: 1, max: 100 })
    ],
    validate,
    async (req, res) => {
        try {
            const { lat, lng, radius = 10 } = req.query;

            // Calculate distance using Haversine formula
            const result = await db.query(
                `SELECT
                    ll.*,
                    COUNT(DISTINCT l.id) as locker_count,
                    COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'AVAILABLE') as available_slots,
                    (
                        6371 * acos(
                            cos(radians($1)) *
                            cos(radians(ll.latitude)) *
                            cos(radians(ll.longitude) - radians($2)) +
                            sin(radians($1)) *
                            sin(radians(ll.latitude))
                        )
                    ) AS distance_km
                FROM locker_locations ll
                LEFT JOIN lockers l ON ll.id = l.location_id AND l.status = 'ACTIVE'
                LEFT JOIN locker_slots ls ON l.id = ls.locker_id
                WHERE ll.is_active = TRUE
                    AND ll.latitude IS NOT NULL
                    AND ll.longitude IS NOT NULL
                GROUP BY ll.id
                HAVING (
                    6371 * acos(
                        cos(radians($1)) *
                        cos(radians(ll.latitude)) *
                        cos(radians(ll.longitude) - radians($2)) +
                        sin(radians($1)) *
                        sin(radians(ll.latitude))
                    )
                ) <= $3
                ORDER BY distance_km`,
                [parseFloat(lat), parseFloat(lng), parseInt(radius)]
            );

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error finding nearby locations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to find nearby locations'
            });
        }
    }
);

module.exports = router;
