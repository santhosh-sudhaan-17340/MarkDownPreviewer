import { PoolClient } from 'pg';
import { addDays, addMonths, addYears } from 'date-fns';
import Database from '../database/connection';
import {
    Subscription,
    SubscriptionStatus,
    OptimisticLockError,
    SubscriptionHistory
} from '../types';
import SubscriptionPlanService from './SubscriptionPlanService';
import ProrationService from './ProrationService';

export class SubscriptionService {
    private db = Database.getInstance();

    /**
     * Create a new subscription with optional trial
     */
    public async createSubscription(
        userId: string,
        planId: string,
        startDate: Date = new Date()
    ): Promise<Subscription> {
        const plan = await SubscriptionPlanService.getPlanById(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }

        // Calculate period dates
        const periodStart = startDate;
        const periodEnd = plan.billing_period === 'monthly'
            ? addMonths(periodStart, 1)
            : addYears(periodStart, 1);

        // Calculate trial end if applicable
        const trialEnd = plan.trial_days > 0 ? addDays(startDate, plan.trial_days) : null;
        const status: SubscriptionStatus = trialEnd ? 'trial' : 'active';

        const result = await this.db.query(
            `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, trial_end, version)
             VALUES ($1, $2, $3, $4, $5, $6, 0)
             RETURNING *`,
            [userId, planId, status, periodStart, periodEnd, trialEnd]
        );

        const subscription = result.rows[0];

        // Log subscription creation
        await this.logHistory(subscription.id, 'created', null, planId, null, status);

        return subscription;
    }

    /**
     * Get subscription by ID
     */
    public async getSubscriptionById(id: string): Promise<Subscription | null> {
        const result = await this.db.query(
            `SELECT * FROM subscriptions WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get active subscription for a user
     */
    public async getActiveSubscription(userId: string): Promise<Subscription | null> {
        const result = await this.db.query(
            `SELECT * FROM subscriptions
             WHERE user_id = $1 AND status IN ('trial', 'active', 'past_due')
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get all subscriptions for a user
     */
    public async getUserSubscriptions(userId: string): Promise<Subscription[]> {
        const result = await this.db.query(
            `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Upgrade or downgrade subscription with optimistic locking
     */
    public async changePlan(
        subscriptionId: string,
        newPlanId: string,
        immediate: boolean = true
    ): Promise<{ subscription: Subscription; prorationAmount: number }> {
        return await this.db.transaction(async (client: PoolClient) => {
            // Lock the subscription row with optimistic locking
            const subResult = await client.query(
                `SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const currentSubscription: Subscription = subResult.rows[0];
            const currentVersion = currentSubscription.version;

            // Get current and new plans
            const oldPlan = await SubscriptionPlanService.getPlanById(currentSubscription.plan_id);
            const newPlan = await SubscriptionPlanService.getPlanById(newPlanId);

            if (!oldPlan || !newPlan) {
                throw new Error('Plan not found');
            }

            // Validate plan change (same billing period)
            if (oldPlan.billing_period !== newPlan.billing_period) {
                throw new Error('Cannot change between different billing periods. Please cancel and create a new subscription.');
            }

            let prorationAmount = 0;

            if (immediate) {
                // Calculate proration
                const proration = ProrationService.calculateProration(
                    oldPlan,
                    newPlan,
                    currentSubscription.current_period_start,
                    currentSubscription.current_period_end,
                    new Date()
                );

                prorationAmount = proration.net_amount;

                // Update subscription with optimistic locking check
                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET plan_id = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2 AND version = $3
                     RETURNING *`,
                    [newPlanId, subscriptionId, currentVersion]
                );

                if (updateResult.rows.length === 0) {
                    throw new OptimisticLockError('Subscription was modified by another transaction. Please retry.');
                }

                const updatedSubscription = updateResult.rows[0];

                // Log the change
                await this.logHistoryWithClient(
                    client,
                    subscriptionId,
                    'plan_changed',
                    oldPlan.id,
                    newPlan.id,
                    currentSubscription.status,
                    currentSubscription.status,
                    prorationAmount
                );

                return { subscription: updatedSubscription, prorationAmount };
            } else {
                // Schedule change for next billing cycle
                // For now, we'll store this in metadata
                const metadata = {
                    ...currentSubscription.metadata,
                    scheduled_plan_change: {
                        new_plan_id: newPlanId,
                        scheduled_at: new Date().toISOString()
                    }
                };

                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET metadata = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $2 AND version = $3
                     RETURNING *`,
                    [JSON.stringify(metadata), subscriptionId, currentVersion]
                );

                if (updateResult.rows.length === 0) {
                    throw new OptimisticLockError('Subscription was modified by another transaction. Please retry.');
                }

                return { subscription: updateResult.rows[0], prorationAmount: 0 };
            }
        });
    }

    /**
     * Cancel subscription
     */
    public async cancelSubscription(
        subscriptionId: string,
        immediate: boolean = false
    ): Promise<Subscription> {
        return await this.db.transaction(async (client: PoolClient) => {
            const subResult = await client.query(
                `SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription: Subscription = subResult.rows[0];
            const currentVersion = subscription.version;

            if (immediate) {
                // Cancel immediately
                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, version = version + 1
                     WHERE id = $1 AND version = $2
                     RETURNING *`,
                    [subscriptionId, currentVersion]
                );

                if (updateResult.rows.length === 0) {
                    throw new OptimisticLockError();
                }

                await this.logHistoryWithClient(
                    client,
                    subscriptionId,
                    'canceled_immediate',
                    subscription.plan_id,
                    null,
                    subscription.status,
                    'canceled'
                );

                return updateResult.rows[0];
            } else {
                // Cancel at period end
                const updateResult = await client.query(
                    `UPDATE subscriptions
                     SET cancel_at_period_end = true, canceled_at = CURRENT_TIMESTAMP, version = version + 1
                     WHERE id = $1 AND version = $2
                     RETURNING *`,
                    [subscriptionId, currentVersion]
                );

                if (updateResult.rows.length === 0) {
                    throw new OptimisticLockError();
                }

                await this.logHistoryWithClient(
                    client,
                    subscriptionId,
                    'canceled_at_period_end',
                    subscription.plan_id,
                    null,
                    subscription.status,
                    subscription.status
                );

                return updateResult.rows[0];
            }
        });
    }

    /**
     * Reactivate a canceled subscription
     */
    public async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
        return await this.db.transaction(async (client: PoolClient) => {
            const subResult = await client.query(
                `SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`,
                [subscriptionId]
            );

            if (subResult.rows.length === 0) {
                throw new Error('Subscription not found');
            }

            const subscription: Subscription = subResult.rows[0];

            const updateResult = await client.query(
                `UPDATE subscriptions
                 SET cancel_at_period_end = false, canceled_at = NULL, status = 'active', version = version + 1
                 WHERE id = $1 AND version = $2
                 RETURNING *`,
                [subscriptionId, subscription.version]
            );

            if (updateResult.rows.length === 0) {
                throw new OptimisticLockError();
            }

            await this.logHistoryWithClient(
                client,
                subscriptionId,
                'reactivated',
                subscription.plan_id,
                subscription.plan_id,
                subscription.status,
                'active'
            );

            return updateResult.rows[0];
        });
    }

    /**
     * Renew subscription for next period
     */
    public async renewSubscription(subscriptionId: string): Promise<Subscription> {
        const subscription = await this.getSubscriptionById(subscriptionId);
        if (!subscription) {
            throw new Error('Subscription not found');
        }

        const plan = await SubscriptionPlanService.getPlanById(subscription.plan_id);
        if (!plan) {
            throw new Error('Plan not found');
        }

        const newPeriodStart = subscription.current_period_end;
        const newPeriodEnd = plan.billing_period === 'monthly'
            ? addMonths(newPeriodStart, 1)
            : addYears(newPeriodStart, 1);

        const result = await this.db.query(
            `UPDATE subscriptions
             SET current_period_start = $1, current_period_end = $2, status = 'active', version = version + 1
             WHERE id = $3 AND version = $4
             RETURNING *`,
            [newPeriodStart, newPeriodEnd, subscriptionId, subscription.version]
        );

        if (result.rows.length === 0) {
            throw new OptimisticLockError();
        }

        await this.logHistory(subscriptionId, 'renewed', subscription.plan_id, subscription.plan_id);

        return result.rows[0];
    }

    /**
     * Get subscription history
     */
    public async getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]> {
        const result = await this.db.query(
            `SELECT * FROM subscription_history WHERE subscription_id = $1 ORDER BY created_at DESC`,
            [subscriptionId]
        );

        return result.rows;
    }

    /**
     * Log subscription history
     */
    private async logHistory(
        subscriptionId: string,
        action: string,
        oldPlanId: string | null,
        newPlanId: string | null,
        oldStatus?: string | null,
        newStatus?: string | null,
        prorationAmount?: number
    ): Promise<void> {
        await this.db.query(
            `INSERT INTO subscription_history (subscription_id, action, old_plan_id, new_plan_id, old_status, new_status, proration_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [subscriptionId, action, oldPlanId, newPlanId, oldStatus || null, newStatus || null, prorationAmount || null]
        );
    }

    /**
     * Log subscription history with client (for transactions)
     */
    private async logHistoryWithClient(
        client: PoolClient,
        subscriptionId: string,
        action: string,
        oldPlanId: string | null,
        newPlanId: string | null,
        oldStatus?: string | null,
        newStatus?: string | null,
        prorationAmount?: number
    ): Promise<void> {
        await client.query(
            `INSERT INTO subscription_history (subscription_id, action, old_plan_id, new_plan_id, old_status, new_status, proration_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [subscriptionId, action, oldPlanId, newPlanId, oldStatus || null, newStatus || null, prorationAmount || null]
        );
    }
}

export default new SubscriptionService();
