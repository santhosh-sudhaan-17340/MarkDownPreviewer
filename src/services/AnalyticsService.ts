import Database from '../database/connection';
import { RevenueAnalytics } from '../types';

export class AnalyticsService {
    private db = Database.getInstance();

    /**
     * Get revenue analytics for a specific period
     */
    public async getRevenueAnalytics(
        startDate: Date,
        endDate: Date
    ): Promise<RevenueAnalytics> {
        // Total revenue from paid invoices
        const revenueResult = await this.db.query(
            `SELECT COALESCE(SUM(total), 0) as total_revenue
             FROM invoices
             WHERE status = 'paid'
             AND paid_at BETWEEN $1 AND $2`,
            [startDate, endDate]
        );

        const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

        // Monthly Recurring Revenue (MRR) - normalized to monthly
        const mrrResult = await this.db.query(
            `SELECT
                COALESCE(SUM(
                    CASE
                        WHEN sp.billing_period = 'monthly' THEN sp.price
                        WHEN sp.billing_period = 'yearly' THEN sp.price / 12
                        ELSE 0
                    END
                ), 0) as mrr
             FROM subscriptions s
             JOIN subscription_plans sp ON s.plan_id = sp.id
             WHERE s.status IN ('active', 'trial')
             AND s.created_at <= $1`,
            [endDate]
        );

        const monthlyRecurringRevenue = parseFloat(mrrResult.rows[0].mrr);

        // Annual Recurring Revenue (ARR)
        const annualRecurringRevenue = monthlyRecurringRevenue * 12;

        // Subscription counts
        const subscriptionCountsResult = await this.db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'active') as active_count,
                COUNT(*) FILTER (WHERE status = 'trial') as trial_count,
                COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at BETWEEN $1 AND $2) as churned_count
             FROM subscriptions`,
            [startDate, endDate]
        );

        const activeSubscriptions = parseInt(subscriptionCountsResult.rows[0].active_count);
        const trialSubscriptions = parseInt(subscriptionCountsResult.rows[0].trial_count);
        const churnedSubscriptions = parseInt(subscriptionCountsResult.rows[0].churned_count);

        // Average Revenue Per User (ARPU)
        const totalActiveSubscriptions = activeSubscriptions + trialSubscriptions;
        const averageRevenuePerUser = totalActiveSubscriptions > 0
            ? monthlyRecurringRevenue / totalActiveSubscriptions
            : 0;

        return {
            total_revenue: totalRevenue,
            monthly_recurring_revenue: monthlyRecurringRevenue,
            annual_recurring_revenue: annualRecurringRevenue,
            active_subscriptions: activeSubscriptions,
            trial_subscriptions: trialSubscriptions,
            churned_subscriptions: churnedSubscriptions,
            average_revenue_per_user: averageRevenuePerUser,
            period_start: startDate,
            period_end: endDate
        };
    }

    /**
     * Get revenue by plan
     */
    public async getRevenueByPlan(startDate: Date, endDate: Date) {
        const result = await this.db.query(
            `SELECT
                sp.id,
                sp.name,
                sp.billing_period,
                COUNT(DISTINCT s.id) as subscription_count,
                COALESCE(SUM(i.total), 0) as total_revenue,
                COALESCE(AVG(i.total), 0) as average_invoice_amount
             FROM subscription_plans sp
             LEFT JOIN subscriptions s ON sp.id = s.plan_id
             LEFT JOIN invoices i ON s.id = i.subscription_id
                AND i.status = 'paid'
                AND i.paid_at BETWEEN $1 AND $2
             GROUP BY sp.id, sp.name, sp.billing_period
             ORDER BY total_revenue DESC`,
            [startDate, endDate]
        );

        return result.rows.map(row => ({
            plan_id: row.id,
            plan_name: row.name,
            billing_period: row.billing_period,
            subscription_count: parseInt(row.subscription_count),
            total_revenue: parseFloat(row.total_revenue),
            average_invoice_amount: parseFloat(row.average_invoice_amount)
        }));
    }

    /**
     * Get subscription growth metrics
     */
    public async getSubscriptionGrowth(startDate: Date, endDate: Date) {
        const result = await this.db.query(
            `SELECT
                DATE_TRUNC('day', created_at) as date,
                COUNT(*) FILTER (WHERE status IN ('active', 'trial')) as new_subscriptions,
                COUNT(*) FILTER (WHERE status = 'canceled') as canceled_subscriptions
             FROM subscriptions
             WHERE created_at BETWEEN $1 AND $2
             GROUP BY DATE_TRUNC('day', created_at)
             ORDER BY date ASC`,
            [startDate, endDate]
        );

        return result.rows.map(row => ({
            date: row.date,
            new_subscriptions: parseInt(row.new_subscriptions),
            canceled_subscriptions: parseInt(row.canceled_subscriptions),
            net_growth: parseInt(row.new_subscriptions) - parseInt(row.canceled_subscriptions)
        }));
    }

    /**
     * Get churn rate for a period
     */
    public async getChurnRate(startDate: Date, endDate: Date): Promise<number> {
        const result = await this.db.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'active' AND created_at < $1) as active_at_start,
                COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at BETWEEN $1 AND $2) as churned_in_period
             FROM subscriptions`,
            [startDate, endDate]
        );

        const activeAtStart = parseInt(result.rows[0].active_at_start);
        const churnedInPeriod = parseInt(result.rows[0].churned_in_period);

        if (activeAtStart === 0) {
            return 0;
        }

        return (churnedInPeriod / activeAtStart) * 100;
    }

    /**
     * Get payment success rate
     */
    public async getPaymentSuccessRate(startDate: Date, endDate: Date) {
        const result = await this.db.query(
            `SELECT
                COUNT(*) as total_payments,
                COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
                COALESCE(AVG(retry_count) FILTER (WHERE status = 'failed'), 0) as avg_retry_count
             FROM payments
             WHERE created_at BETWEEN $1 AND $2`,
            [startDate, endDate]
        );

        const totalPayments = parseInt(result.rows[0].total_payments);
        const successfulPayments = parseInt(result.rows[0].successful_payments);
        const failedPayments = parseInt(result.rows[0].failed_payments);
        const avgRetryCount = parseFloat(result.rows[0].avg_retry_count);

        const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

        return {
            total_payments: totalPayments,
            successful_payments: successfulPayments,
            failed_payments: failedPayments,
            success_rate: successRate,
            average_retry_count: avgRetryCount
        };
    }

    /**
     * Get coupon usage statistics
     */
    public async getCouponUsageStats(startDate: Date, endDate: Date) {
        const result = await this.db.query(
            `SELECT
                c.id,
                c.code,
                c.discount_type,
                c.discount_value,
                COUNT(i.id) as usage_count,
                COALESCE(SUM(i.discount_amount), 0) as total_discount_given
             FROM coupons c
             LEFT JOIN invoices i ON c.id = i.coupon_id
                AND i.created_at BETWEEN $1 AND $2
             GROUP BY c.id, c.code, c.discount_type, c.discount_value
             HAVING COUNT(i.id) > 0
             ORDER BY usage_count DESC`,
            [startDate, endDate]
        );

        return result.rows.map(row => ({
            coupon_id: row.id,
            coupon_code: row.code,
            discount_type: row.discount_type,
            discount_value: parseFloat(row.discount_value),
            usage_count: parseInt(row.usage_count),
            total_discount_given: parseFloat(row.total_discount_given)
        }));
    }

    /**
     * Get tax collection summary
     */
    public async getTaxCollectionSummary(startDate: Date, endDate: Date) {
        const result = await this.db.query(
            `SELECT
                tr.country_code,
                tr.state_code,
                tr.tax_name,
                COUNT(i.id) as invoice_count,
                COALESCE(SUM(i.tax_amount), 0) as total_tax_collected
             FROM tax_rules tr
             LEFT JOIN invoices i ON tr.id = i.tax_rule_id
                AND i.status = 'paid'
                AND i.paid_at BETWEEN $1 AND $2
             GROUP BY tr.id, tr.country_code, tr.state_code, tr.tax_name
             HAVING COUNT(i.id) > 0
             ORDER BY total_tax_collected DESC`,
            [startDate, endDate]
        );

        return result.rows.map(row => ({
            country_code: row.country_code,
            state_code: row.state_code,
            tax_name: row.tax_name,
            invoice_count: parseInt(row.invoice_count),
            total_tax_collected: parseFloat(row.total_tax_collected)
        }));
    }

    /**
     * Get lifetime value (LTV) estimate
     */
    public async getLifetimeValueEstimate(): Promise<number> {
        // Simple LTV calculation: Average revenue per user * average customer lifetime
        const result = await this.db.query(
            `SELECT
                COALESCE(AVG(total_revenue), 0) as avg_revenue,
                COALESCE(AVG(lifetime_days), 0) as avg_lifetime_days
             FROM (
                SELECT
                    s.user_id,
                    SUM(i.total) as total_revenue,
                    EXTRACT(DAY FROM (COALESCE(s.canceled_at, CURRENT_TIMESTAMP) - s.created_at)) as lifetime_days
                FROM subscriptions s
                LEFT JOIN invoices i ON s.id = i.subscription_id AND i.status = 'paid'
                WHERE s.status IN ('active', 'canceled')
                GROUP BY s.user_id, s.created_at, s.canceled_at
             ) as user_stats`
        );

        const avgRevenue = parseFloat(result.rows[0].avg_revenue);
        const avgLifetimeDays = parseFloat(result.rows[0].avg_lifetime_days);

        // Normalize to monthly and extrapolate
        const avgLifetimeMonths = avgLifetimeDays / 30;
        const monthlyAvgRevenue = avgLifetimeMonths > 0 ? avgRevenue / avgLifetimeMonths : 0;

        // Assume average customer lifetime of 24 months for LTV calculation
        return monthlyAvgRevenue * 24;
    }
}

export default new AnalyticsService();
