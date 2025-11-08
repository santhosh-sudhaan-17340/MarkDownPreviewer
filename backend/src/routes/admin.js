/**
 * Admin API Routes
 * For managing coupons, tax rules, and running jobs
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const couponService = require('../services/couponService');
const taxService = require('../services/taxService');
const scheduler = require('../jobs/scheduler');

// Note: In production, add admin role check middleware

/**
 * POST /api/admin/coupons
 * Create a new coupon
 */
router.post(
    '/coupons',
    authenticate,
    validate(schemas.createCoupon),
    asyncHandler(async (req, res) => {
        const coupon = await couponService.createCoupon(req.validatedBody);
        res.status(201).json({
            message: 'Coupon created successfully',
            coupon,
        });
    })
);

/**
 * DELETE /api/admin/coupons/:code
 * Deactivate a coupon
 */
router.delete(
    '/coupons/:code',
    authenticate,
    asyncHandler(async (req, res) => {
        const { code } = req.params;
        const coupon = await couponService.deactivateCoupon(code);
        res.json({
            message: 'Coupon deactivated successfully',
            coupon,
        });
    })
);

/**
 * GET /api/admin/coupons/:id/stats
 * Get coupon statistics
 */
router.get(
    '/coupons/:id/stats',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const stats = await couponService.getCouponStats(id);
        res.json({ stats });
    })
);

/**
 * POST /api/admin/tax-rules
 * Create a new tax rule
 */
router.post(
    '/tax-rules',
    authenticate,
    validate(schemas.createTaxRule),
    asyncHandler(async (req, res) => {
        const taxRule = await taxService.createTaxRule(req.validatedBody);
        res.status(201).json({
            message: 'Tax rule created successfully',
            taxRule,
        });
    })
);

/**
 * GET /api/admin/tax-rules
 * Get all tax rules
 */
router.get(
    '/tax-rules',
    authenticate,
    asyncHandler(async (req, res) => {
        const { activeOnly = 'true' } = req.query;
        const taxRules = await taxService.getAllTaxRules(activeOnly === 'true');
        res.json({ taxRules });
    })
);

/**
 * DELETE /api/admin/tax-rules/:id
 * Deactivate a tax rule
 */
router.delete(
    '/tax-rules/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const taxRule = await taxService.deactivateTaxRule(id);
        res.json({
            message: 'Tax rule deactivated successfully',
            taxRule,
        });
    })
);

/**
 * POST /api/admin/jobs/:jobName/run
 * Manually trigger a scheduled job
 */
router.post(
    '/jobs/:jobName/run',
    authenticate,
    asyncHandler(async (req, res) => {
        const { jobName } = req.params;
        const result = await scheduler.runJob(jobName);
        res.json({
            message: `Job ${jobName} completed successfully`,
            result,
        });
    })
);

module.exports = router;
