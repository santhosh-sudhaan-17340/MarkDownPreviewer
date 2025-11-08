/**
 * Coupon API Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const couponService = require('../services/couponService');

/**
 * POST /api/coupons/validate
 * Validate a coupon code without applying it
 */
router.post(
    '/validate',
    authenticate,
    asyncHandler(async (req, res) => {
        const { couponCode, invoiceSubtotal } = req.body;

        if (!couponCode || invoiceSubtotal === undefined) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'couponCode and invoiceSubtotal are required',
            });
        }

        const result = await couponService.validateCouponCode(
            couponCode,
            req.user.userId,
            invoiceSubtotal
        );

        res.json(result);
    })
);

/**
 * GET /api/coupons/active
 * Get all active coupons (public)
 */
router.get(
    '/active',
    asyncHandler(async (req, res) => {
        const coupons = await couponService.getActiveCoupons();
        res.json({ coupons });
    })
);

module.exports = router;
