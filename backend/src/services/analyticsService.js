/**
 * Analytics Service
 * Handles revenue analytics with efficient SQL aggregation queries
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { format, subMonths, startOfMonth, endOfMonth } = require('date-fns');

class AnalyticsService {
    /**
     * Refresh all materialized views
     */
    async refreshAnalytics() {
        try {
            await db.query('SELECT refresh_analytics_views()');
            logger.info('Analytics views refreshed successfully');
            return { success: true };
        } catch (error) {
            logger.error('Failed to refresh analytics views:', error);
            throw error;
        }
    }

    /**
     * Get revenue analytics for specified months
     */
    async getRevenueAnalytics(monthsBack = 12) {
        const result = await db.query(
            `SELECT * FROM revenue_analytics
             ORDER BY month DESC
             LIMIT $1`,
            [monthsBack]
        );

        return result.rows;
    }

    /**
     * Get MRR (Monthly Recurring Revenue) analytics
     */
    async getMRRAnalytics(monthsBack = 12) {
        const result = await db.query(
            `SELECT * FROM mrr_analytics
             ORDER BY month DESC
             LIMIT $1`,
            [monthsBack]
        );

        return result.rows;
    }

    /**
     * Get churn analytics
     */
    async getChurnAnalytics(monthsBack = 12) {
        const result = await db.query(
            `SELECT * FROM churn_analytics
             ORDER BY month DESC
             LIMIT $1`,
            [monthsBack]
        );

        return result.rows;
    }

    /**
     * Get real-time revenue metrics (not from materialized views)
     */
    async getRealTimeMetrics() {
        const result = await db.query(`
            SELECT
                COUNT(DISTINCT s.user_id) as active_subscribers,
                SUM(CASE
                    WHEN sp.billing_cycle = 'monthly' THEN s.price
                    WHEN sp.billing_cycle = 'yearly' THEN s.price / 12
                    WHEN sp.billing_cycle = 'quarterly' THEN s.price / 3
                END) as current_mrr,
                COUNT(CASE WHEN s.status = 'trial' THEN 1 END) as trial_users,
                COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_users,
                COUNT(CASE WHEN s.status = 'past_due' THEN 1 END) as past_due_users,
                COUNT(CASE WHEN s.cancel_at_period_end = true THEN 1 END) as canceling_users
            FROM subscriptions s
            JOIN subscription_plans sp ON s.plan_id = sp.id
            WHERE s.status IN ('trial', 'active', 'past_due')
        `);

        return result.rows[0];
    }

    /**
     * Get revenue by plan
     */
    async getRevenueByPlan(startDate, endDate) {
        const result = await db.query(
            `SELECT
                sp.name as plan_name,
                sp.billing_cycle,
                COUNT(DISTINCT s.id) as subscription_count,
                SUM(p.amount) as total_revenue,
                AVG(p.amount) as average_transaction
             FROM payments p
             JOIN subscriptions s ON p.subscription_id = s.id
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE p.status = 'succeeded'
             AND p.created_at BETWEEN $1 AND $2
             GROUP BY sp.id, sp.name, sp.billing_cycle
             ORDER BY total_revenue DESC`,
            [startDate, endDate]
        );

        return result.rows;
    }

    /**
     * Get payment success rate
     */
    async getPaymentSuccessRate(startDate, endDate) {
        const result = await db.query(
            `SELECT
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                ROUND(
                    (COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::DECIMAL / COUNT(*)) * 100,
                    2
                ) as success_rate
             FROM payments
             WHERE created_at BETWEEN $1 AND $2`,
            [startDate, endDate]
        );

        return result.rows[0];
    }

    /**
     * Get failed payment reasons breakdown
     */
    async getFailedPaymentReasons(startDate, endDate) {
        const result = await db.query(
            `SELECT
                failure_code,
                COUNT(*) as count,
                ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER ()) * 100, 2) as percentage
             FROM payments
             WHERE status = 'failed'
             AND created_at BETWEEN $1 AND $2
             AND failure_code IS NOT NULL
             GROUP BY failure_code
             ORDER BY count DESC`,
            [startDate, endDate]
        );

        return result.rows;
    }

    /**
     * Get coupon usage statistics
     */
    async getCouponUsageStats(startDate, endDate) {
        const result = await db.query(
            `SELECT
                c.code,
                c.discount_type,
                c.discount_value,
                COUNT(cr.id) as redemptions,
                SUM(cr.discount_amount) as total_discount_given,
                COUNT(DISTINCT cr.user_id) as unique_users
             FROM coupons c
             LEFT JOIN coupon_redemptions cr ON c.id = cr.coupon_id
                AND cr.redeemed_at BETWEEN $1 AND $2
             WHERE c.is_active = true
             GROUP BY c.id, c.code, c.discount_type, c.discount_value
             HAVING COUNT(cr.id) > 0
             ORDER BY total_discount_given DESC`,
            [startDate, endDate]
        );

        return result.rows;
    }

    /**
     * Get subscription lifecycle metrics
     */
    async getSubscriptionLifecycleMetrics() {
        const result = await db.query(`
            SELECT
                AVG(EXTRACT(EPOCH FROM (canceled_at - created_at)) / 86400) as avg_lifetime_days,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (canceled_at - created_at)) / 86400) as median_lifetime_days,
                MIN(EXTRACT(EPOCH FROM (canceled_at - created_at)) / 86400) as min_lifetime_days,
                MAX(EXTRACT(EPOCH FROM (canceled_at - created_at)) / 86400) as max_lifetime_days
            FROM subscriptions
            WHERE canceled_at IS NOT NULL
        `);

        return result.rows[0];
    }

    /**
     * Get LTV (Lifetime Value) metrics
     */
    async getLTVMetrics() {
        const result = await db.query(`
            SELECT
                AVG(total_revenue) as average_ltv,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue) as median_ltv,
                MAX(total_revenue) as max_ltv
            FROM (
                SELECT
                    p.user_id,
                    SUM(p.amount) as total_revenue
                FROM payments p
                WHERE p.status = 'succeeded'
                GROUP BY p.user_id
            ) user_revenues
        `);

        return result.rows[0];
    }

    /**
     * Get cohort analysis
     */
    async getCohortAnalysis(monthsBack = 6) {
        const result = await db.query(
            `WITH cohorts AS (
                SELECT
                    user_id,
                    DATE_TRUNC('month', created_at) as cohort_month
                FROM subscriptions
            ),
            cohort_sizes AS (
                SELECT
                    cohort_month,
                    COUNT(DISTINCT user_id) as cohort_size
                FROM cohorts
                GROUP BY cohort_month
            )
            SELECT
                cs.cohort_month,
                cs.cohort_size,
                COUNT(CASE WHEN s.status IN ('active', 'trial') THEN 1 END) as still_active,
                ROUND(
                    (COUNT(CASE WHEN s.status IN ('active', 'trial') THEN 1 END)::DECIMAL / cs.cohort_size) * 100,
                    2
                ) as retention_rate
            FROM cohort_sizes cs
            JOIN cohorts c ON cs.cohort_month = c.cohort_month
            JOIN subscriptions s ON c.user_id = s.user_id
            WHERE cs.cohort_month >= DATE_TRUNC('month', NOW() - INTERVAL '${monthsBack} months')
            GROUP BY cs.cohort_month, cs.cohort_size
            ORDER BY cs.cohort_month DESC`
        );

        return result.rows;
    }

    /**
     * Get plan upgrade/downgrade flow
     */
    async getPlanChangeFlow(startDate, endDate) {
        const result = await db.query(
            `SELECT
                sh.action,
                sp_from.name as from_plan,
                sp_to.name as to_plan,
                COUNT(*) as count,
                AVG(sh.proration_amount) as avg_proration
             FROM subscription_history sh
             LEFT JOIN subscription_plans sp_from ON sh.from_plan_id = sp_from.id
             LEFT JOIN subscription_plans sp_to ON sh.to_plan_id = sp_to.id
             WHERE sh.action IN ('upgraded', 'downgraded')
             AND sh.created_at BETWEEN $1 AND $2
             GROUP BY sh.action, sp_from.name, sp_to.name
             ORDER BY count DESC`,
            [startDate, endDate]
        );

        return result.rows;
    }

    /**
     * Get comprehensive dashboard metrics
     */
    async getDashboardMetrics() {
        const currentMonth = format(new Date(), 'yyyy-MM-01');
        const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM-01');

        const [
            realTimeMetrics,
            currentMonthRevenue,
            lastMonthRevenue,
            paymentStats,
            ltvMetrics,
        ] = await Promise.all([
            this.getRealTimeMetrics(),
            this._getMonthRevenue(currentMonth),
            this._getMonthRevenue(lastMonth),
            this.getPaymentSuccessRate(
                startOfMonth(new Date()),
                endOfMonth(new Date())
            ),
            this.getLTVMetrics(),
        ]);

        return {
            subscribers: realTimeMetrics,
            revenue: {
                current_month: currentMonthRevenue,
                last_month: lastMonthRevenue,
                growth_rate: this._calculateGrowthRate(
                    currentMonthRevenue.total,
                    lastMonthRevenue.total
                ),
            },
            payments: paymentStats,
            ltv: ltvMetrics,
        };
    }

    /**
     * Get revenue for a specific month
     */
    async _getMonthRevenue(monthStart) {
        const result = await db.query(
            `SELECT
                COUNT(*) as transaction_count,
                SUM(amount) as total,
                AVG(amount) as average
             FROM payments
             WHERE status = 'succeeded'
             AND DATE_TRUNC('month', created_at) = $1`,
            [monthStart]
        );

        return result.rows[0];
    }

    /**
     * Calculate growth rate percentage
     */
    _calculateGrowthRate(current, previous) {
        if (!previous || previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    }

    /**
     * Get trial conversion rate
     */
    async getTrialConversionRate() {
        const result = await db.query(`
            SELECT
                COUNT(CASE WHEN trial_end IS NOT NULL THEN 1 END) as total_trials,
                COUNT(CASE WHEN trial_end IS NOT NULL AND status = 'active' THEN 1 END) as converted,
                ROUND(
                    (COUNT(CASE WHEN trial_end IS NOT NULL AND status = 'active' THEN 1 END)::DECIMAL /
                     NULLIF(COUNT(CASE WHEN trial_end IS NOT NULL THEN 1 END), 0)) * 100,
                    2
                ) as conversion_rate
            FROM subscriptions
            WHERE trial_end < NOW()
        `);

        return result.rows[0];
    }
}

module.exports = new AnalyticsService();
