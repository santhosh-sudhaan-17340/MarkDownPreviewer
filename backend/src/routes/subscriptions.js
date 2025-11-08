/**
 * Subscription API Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const subscriptionService = require('../services/subscriptionService');
const db = require('../config/database');

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get(
    '/plans',
    asyncHandler(async (req, res) => {
        const result = await db.query(
            `SELECT * FROM subscription_plans
             WHERE is_active = true
             ORDER BY display_order ASC, price ASC`
        );

        res.json({ plans: result.rows });
    })
);

/**
 * GET /api/subscriptions/my-subscription
 * Get current user's subscription
 */
router.get(
    '/my-subscription',
    authenticate,
    asyncHandler(async (req, res) => {
        const subscription = await subscriptionService.getUserSubscription(req.user.userId);

        if (!subscription) {
            return res.status(404).json({ error: 'No subscription found' });
        }

        res.json({ subscription });
    })
);

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post(
    '/',
    authenticate,
    validate(schemas.createSubscription),
    asyncHandler(async (req, res) => {
        const { planId, metadata } = req.validatedBody;

        const subscription = await subscriptionService.createSubscription(
            req.user.userId,
            planId,
            metadata
        );

        res.status(201).json({
            message: 'Subscription created successfully',
            subscription,
        });
    })
);

/**
 * POST /api/subscriptions/:id/upgrade
 * Upgrade subscription
 */
router.post(
    '/:id/upgrade',
    authenticate,
    validate(schemas.upgradeSubscription),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { newPlanId } = req.validatedBody;

        const result = await subscriptionService.upgradeSubscription(id, newPlanId);

        res.json({
            message: 'Subscription upgraded successfully',
            subscription: result.subscription,
            prorationAmount: result.prorationAmount,
        });
    })
);

/**
 * POST /api/subscriptions/:id/downgrade
 * Downgrade subscription (takes effect at end of period)
 */
router.post(
    '/:id/downgrade',
    authenticate,
    validate(schemas.upgradeSubscription),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { newPlanId } = req.validatedBody;

        const subscription = await subscriptionService.downgradeSubscription(id, newPlanId);

        res.json({
            message: 'Downgrade scheduled for end of billing period',
            subscription,
        });
    })
);

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel subscription
 */
router.post(
    '/:id/cancel',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { immediate } = req.body;

        const subscription = await subscriptionService.cancelSubscription(id, immediate);

        res.json({
            message: immediate
                ? 'Subscription canceled immediately'
                : 'Subscription will be canceled at the end of the billing period',
            subscription,
        });
    })
);

/**
 * GET /api/subscriptions/:id/history
 * Get subscription change history
 */
router.get(
    '/:id/history',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await db.query(
            `SELECT sh.*, sp_from.name as from_plan_name, sp_to.name as to_plan_name
             FROM subscription_history sh
             LEFT JOIN subscription_plans sp_from ON sh.from_plan_id = sp_from.id
             LEFT JOIN subscription_plans sp_to ON sh.to_plan_id = sp_to.id
             WHERE sh.subscription_id = $1
             ORDER BY sh.created_at DESC`,
            [id]
        );

        res.json({ history: result.rows });
    })
);

module.exports = router;
