/**
 * Subscription Service
 * Handles subscription creation, upgrades, downgrades, cancellations
 * with optimistic locking
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { addMonths, addYears, addDays, isAfter, isBefore, differenceInDays } = require('date-fns');
const prorationService = require('./prorationService');
const invoiceService = require('./invoiceService');

class SubscriptionService {
    /**
     * Create a new subscription with trial period
     */
    async createSubscription(userId, planId, metadata = {}) {
        return db.transaction(async (client) => {
            // Get plan details
            const planResult = await client.query(
                'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
                [planId]
            );

            if (planResult.rows.length === 0) {
                throw new Error('Plan not found or inactive');
            }

            const plan = planResult.rows[0];

            // Check if user already has a subscription
            const existingResult = await client.query(
                'SELECT * FROM subscriptions WHERE user_id = $1',
                [userId]
            );

            if (existingResult.rows.length > 0) {
                throw new Error('User already has an active subscription');
            }

            // Calculate subscription dates
            const now = new Date();
            let currentPeriodEnd;
            let trialEnd = null;

            if (plan.trial_days > 0) {
                trialEnd = addDays(now, plan.trial_days);
                currentPeriodEnd = this._calculatePeriodEnd(trialEnd, plan.billing_cycle);
            } else {
                currentPeriodEnd = this._calculatePeriodEnd(now, plan.billing_cycle);
            }

            // Create subscription
            const subscriptionResult = await client.query(
                `INSERT INTO subscriptions
                (user_id, plan_id, status, current_period_start, current_period_end,
                 trial_end, price, currency, version, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9)
                RETURNING *`,
                [
                    userId,
                    planId,
                    plan.trial_days > 0 ? 'trial' : 'active',
                    now,
                    currentPeriodEnd,
                    trialEnd,
                    plan.price,
                    plan.currency,
                    metadata,
                ]
            );

            const subscription = subscriptionResult.rows[0];

            // Record subscription history
            await client.query(
                `INSERT INTO subscription_history
                (subscription_id, user_id, action, to_plan_id, new_price)
                VALUES ($1, $2, 'created', $3, $4)`,
                [subscription.id, userId, planId, plan.price]
            );

            logger.info('Subscription created', {
                subscriptionId: subscription.id,
                userId,
                planId,
            });

            return subscription;
        });
    }

    /**
     * Upgrade subscription with proration
     */
    async upgradeSubscription(subscriptionId, newPlanId) {
        return db.transaction(async (client) => {
            // Lock subscription row with optimistic locking
            const subResult = await client.query(
                `SELECT s.*, sp.name as plan_name, sp.billing_cycle, sp.price as plan_price
                 FROM subscriptions s
                 JOIN subscription_plans sp ON s.plan_id = sp.id
                 WHERE s.id = $1
                 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription = subResult.rows[0];

            // Get new plan details
            const newPlanResult = await client.query(
                'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
                [newPlanId]
            );

            if (newPlanResult.rows.length === 0) {
                throw new Error('New plan not found or inactive');
            }

            const newPlan = newPlanResult.rows[0];

            // Ensure billing cycles match
            if (subscription.billing_cycle !== newPlan.billing_cycle) {
                throw new Error('Cannot change billing cycle during upgrade. Cancel and create new subscription.');
            }

            // Calculate proration
            const prorationAmount = prorationService.calculateUpgradeProration(
                subscription.price,
                newPlan.price,
                new Date(subscription.current_period_start),
                new Date(subscription.current_period_end),
                new Date()
            );

            // Update subscription with version increment (optimistic locking)
            const updateResult = await client.query(
                `UPDATE subscriptions
                 SET plan_id = $1, price = $2, version = version + 1, updated_at = NOW()
                 WHERE id = $3 AND version = $4
                 RETURNING *`,
                [newPlanId, newPlan.price, subscriptionId, subscription.version]
            );

            if (updateResult.rows.length === 0) {
                throw new Error('Subscription was modified by another transaction. Please retry.');
            }

            const updatedSubscription = updateResult.rows[0];

            // Record subscription history
            await client.query(
                `INSERT INTO subscription_history
                (subscription_id, user_id, action, from_plan_id, to_plan_id,
                 old_price, new_price, proration_amount)
                VALUES ($1, $2, 'upgraded', $3, $4, $5, $6, $7)`,
                [
                    subscriptionId,
                    subscription.user_id,
                    subscription.plan_id,
                    newPlanId,
                    subscription.price,
                    newPlan.price,
                    prorationAmount,
                ]
            );

            // Generate proration invoice if amount is positive
            if (prorationAmount > 0) {
                await invoiceService.createProrationInvoice(
                    client,
                    subscription.user_id,
                    subscriptionId,
                    prorationAmount,
                    `Upgrade from ${subscription.plan_name} to ${newPlan.name}`,
                    new Date(subscription.current_period_start),
                    new Date(subscription.current_period_end)
                );
            }

            logger.info('Subscription upgraded', {
                subscriptionId,
                oldPlanId: subscription.plan_id,
                newPlanId,
                prorationAmount,
            });

            return { subscription: updatedSubscription, prorationAmount };
        });
    }

    /**
     * Downgrade subscription (takes effect at end of current period)
     */
    async downgradeSubscription(subscriptionId, newPlanId) {
        return db.transaction(async (client) => {
            // Lock subscription row
            const subResult = await client.query(
                `SELECT s.*, sp.name as plan_name, sp.billing_cycle
                 FROM subscriptions s
                 JOIN subscription_plans sp ON s.plan_id = sp.id
                 WHERE s.id = $1
                 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription = subResult.rows[0];

            // Get new plan details
            const newPlanResult = await client.query(
                'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
                [newPlanId]
            );

            if (newPlanResult.rows.length === 0) {
                throw new Error('New plan not found or inactive');
            }

            const newPlan = newPlanResult.rows[0];

            // Ensure billing cycles match
            if (subscription.billing_cycle !== newPlan.billing_cycle) {
                throw new Error('Cannot change billing cycle during downgrade');
            }

            // For downgrade, we typically apply at end of period (no immediate proration)
            // Store the pending change in metadata
            const metadata = {
                ...subscription.metadata,
                pending_downgrade: {
                    new_plan_id: newPlanId,
                    new_price: newPlan.price,
                    scheduled_for: subscription.current_period_end,
                },
            };

            // Update subscription metadata
            const updateResult = await client.query(
                `UPDATE subscriptions
                 SET metadata = $1, version = version + 1, updated_at = NOW()
                 WHERE id = $2 AND version = $3
                 RETURNING *`,
                [metadata, subscriptionId, subscription.version]
            );

            if (updateResult.rows.length === 0) {
                throw new Error('Subscription was modified by another transaction. Please retry.');
            }

            // Record subscription history
            await client.query(
                `INSERT INTO subscription_history
                (subscription_id, user_id, action, from_plan_id, to_plan_id,
                 old_price, new_price, proration_amount, notes)
                VALUES ($1, $2, 'downgraded', $3, $4, $5, $6, 0, $7)`,
                [
                    subscriptionId,
                    subscription.user_id,
                    subscription.plan_id,
                    newPlanId,
                    subscription.price,
                    newPlan.price,
                    'Downgrade scheduled for end of current period',
                ]
            );

            logger.info('Subscription downgrade scheduled', {
                subscriptionId,
                oldPlanId: subscription.plan_id,
                newPlanId,
                effectiveDate: subscription.current_period_end,
            });

            return updateResult.rows[0];
        });
    }

    /**
     * Cancel subscription (can be immediate or at period end)
     */
    async cancelSubscription(subscriptionId, immediate = false) {
        return db.transaction(async (client) => {
            const subResult = await client.query(
                'SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE',
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription = subResult.rows[0];

            if (immediate) {
                // Cancel immediately
                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET status = 'canceled', canceled_at = NOW(),
                         version = version + 1, updated_at = NOW()
                     WHERE id = $1 AND version = $2
                     RETURNING *`,
                    [subscriptionId, subscription.version]
                );

                if (updateResult.rows.length === 0) {
                    throw new Error('Subscription was modified by another transaction');
                }

                logger.info('Subscription canceled immediately', { subscriptionId });
                return updateResult.rows[0];
            } else {
                // Cancel at period end
                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET cancel_at_period_end = true, canceled_at = NOW(),
                         version = version + 1, updated_at = NOW()
                     WHERE id = $1 AND version = $2
                     RETURNING *`,
                    [subscriptionId, subscription.version]
                );

                if (updateResult.rows.length === 0) {
                    throw new Error('Subscription was modified by another transaction');
                }

                logger.info('Subscription cancellation scheduled', {
                    subscriptionId,
                    effectiveDate: subscription.current_period_end,
                });
                return updateResult.rows[0];
            }
        });
    }

    /**
     * Renew subscription (called by cron job)
     */
    async renewSubscription(subscriptionId) {
        return db.transaction(async (client) => {
            const subResult = await client.query(
                `SELECT s.*, sp.*
                 FROM subscriptions s
                 JOIN subscription_plans sp ON s.plan_id = sp.id
                 WHERE s.id = $1
                 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription = subResult.rows[0];

            // Check for pending downgrade
            if (subscription.metadata?.pending_downgrade) {
                const newPlanId = subscription.metadata.pending_downgrade.new_plan_id;
                const newPrice = subscription.metadata.pending_downgrade.new_price;

                // Apply the downgrade
                await client.query(
                    `UPDATE subscriptions
                     SET plan_id = $1, price = $2, metadata = $3, version = version + 1
                     WHERE id = $4`,
                    [newPlanId, newPrice, {}, subscriptionId]
                );
            }

            // Check if subscription should be canceled
            if (subscription.cancel_at_period_end) {
                await client.query(
                    `UPDATE subscriptions
                     SET status = 'canceled', version = version + 1, updated_at = NOW()
                     WHERE id = $1`,
                    [subscriptionId]
                );

                logger.info('Subscription canceled at period end', { subscriptionId });
                return;
            }

            // Calculate new period
            const newPeriodStart = new Date(subscription.current_period_end);
            const newPeriodEnd = this._calculatePeriodEnd(
                newPeriodStart,
                subscription.billing_cycle
            );

            // Update subscription
            await client.query(
                `UPDATE subscriptions
                 SET current_period_start = $1, current_period_end = $2,
                     status = 'active', trial_end = NULL,
                     version = version + 1, updated_at = NOW()
                 WHERE id = $3`,
                [newPeriodStart, newPeriodEnd, subscriptionId]
            );

            // Generate invoice
            await invoiceService.createSubscriptionInvoice(
                client,
                subscription.user_id,
                subscriptionId,
                subscription.price,
                subscription.currency,
                newPeriodStart,
                newPeriodEnd
            );

            logger.info('Subscription renewed', { subscriptionId });
        });
    }

    /**
     * Calculate period end based on billing cycle
     */
    _calculatePeriodEnd(startDate, billingCycle) {
        switch (billingCycle) {
            case 'monthly':
                return addMonths(startDate, 1);
            case 'yearly':
                return addYears(startDate, 1);
            case 'quarterly':
                return addMonths(startDate, 3);
            default:
                throw new Error('Invalid billing cycle');
        }
    }

    /**
     * Get subscription by ID
     */
    async getSubscription(subscriptionId) {
        const result = await db.query(
            `SELECT s.*, sp.name as plan_name, sp.billing_cycle, sp.features
             FROM subscriptions s
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE s.id = $1`,
            [subscriptionId]
        );

        return result.rows[0];
    }

    /**
     * Get user's subscription
     */
    async getUserSubscription(userId) {
        const result = await db.query(
            `SELECT s.*, sp.name as plan_name, sp.billing_cycle, sp.features
             FROM subscriptions s
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE s.user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }

    /**
     * Get subscriptions expiring soon (for renewal processing)
     */
    async getSubscriptionsForRenewal(daysAhead = 1) {
        const targetDate = addDays(new Date(), daysAhead);
        const result = await db.query(
            `SELECT * FROM subscriptions
             WHERE status IN ('trial', 'active')
             AND current_period_end <= $1
             AND cancel_at_period_end = false`,
            [targetDate]
        );

        return result.rows;
    }
}

module.exports = new SubscriptionService();
