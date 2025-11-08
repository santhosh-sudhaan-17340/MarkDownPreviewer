/**
 * Analytics API Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const analyticsService = require('../services/analyticsService');
const { startOfMonth, endOfMonth, subMonths } = require('date-fns');

// Note: In production, you'd want admin-only authentication for these routes

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics
 */
router.get(
    '/dashboard',
    authenticate,
    asyncHandler(async (req, res) => {
        const metrics = await analyticsService.getDashboardMetrics();
        res.json(metrics);
    })
);

/**
 * GET /api/analytics/revenue
 * Get revenue analytics
 */
router.get(
    '/revenue',
    authenticate,
    asyncHandler(async (req, res) => {
        const { months = 12 } = req.query;
        const data = await analyticsService.getRevenueAnalytics(parseInt(months));
        res.json({ revenue: data });
    })
);

/**
 * GET /api/analytics/mrr
 * Get MRR analytics
 */
router.get(
    '/mrr',
    authenticate,
    asyncHandler(async (req, res) => {
        const { months = 12 } = req.query;
        const data = await analyticsService.getMRRAnalytics(parseInt(months));
        res.json({ mrr: data });
    })
);

/**
 * GET /api/analytics/churn
 * Get churn analytics
 */
router.get(
    '/churn',
    authenticate,
    asyncHandler(async (req, res) => {
        const { months = 12 } = req.query;
        const data = await analyticsService.getChurnAnalytics(parseInt(months));
        res.json({ churn: data });
    })
);

/**
 * GET /api/analytics/ltv
 * Get LTV metrics
 */
router.get(
    '/ltv',
    authenticate,
    asyncHandler(async (req, res) => {
        const data = await analyticsService.getLTVMetrics();
        res.json(data);
    })
);

/**
 * GET /api/analytics/trial-conversion
 * Get trial conversion rate
 */
router.get(
    '/trial-conversion',
    authenticate,
    asyncHandler(async (req, res) => {
        const data = await analyticsService.getTrialConversionRate();
        res.json(data);
    })
);

/**
 * POST /api/analytics/refresh
 * Manually refresh analytics views
 */
router.post(
    '/refresh',
    authenticate,
    asyncHandler(async (req, res) => {
        await analyticsService.refreshAnalytics();
        res.json({ message: 'Analytics views refreshed successfully' });
    })
);

module.exports = router;
