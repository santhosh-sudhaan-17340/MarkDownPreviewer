/**
 * Tax API Routes
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const taxService = require('../services/taxService');

/**
 * GET /api/taxes/rate
 * Get tax rate for a location
 */
router.get(
    '/rate',
    asyncHandler(async (req, res) => {
        const { countryCode, stateCode } = req.query;

        if (!countryCode) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'countryCode is required',
            });
        }

        const taxRate = await taxService.getTaxRate(countryCode, stateCode);
        res.json({ taxRate });
    })
);

/**
 * POST /api/taxes/calculate
 * Calculate tax for an amount
 */
router.post(
    '/calculate',
    asyncHandler(async (req, res) => {
        const { amount, countryCode, stateCode } = req.body;

        if (!amount || !countryCode) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'amount and countryCode are required',
            });
        }

        const result = await taxService.calculateTax(amount, countryCode, stateCode);
        res.json(result);
    })
);

module.exports = router;
