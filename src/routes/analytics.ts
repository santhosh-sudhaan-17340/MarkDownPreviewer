import { Router, Request, Response } from 'express';
import AnalyticsService from '../services/AnalyticsService';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

/**
 * GET /api/analytics/revenue
 * Get revenue analytics for a period
 */
router.get('/revenue', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subMonths(new Date(), 1);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const analytics = await AnalyticsService.getRevenueAnalytics(startDate, endDate);

        res.json({ success: true, data: analytics });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/revenue-by-plan
 * Get revenue breakdown by plan
 */
router.get('/revenue-by-plan', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subMonths(new Date(), 1);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const revenueByPlan = await AnalyticsService.getRevenueByPlan(startDate, endDate);

        res.json({ success: true, data: revenueByPlan });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/subscription-growth
 * Get subscription growth metrics
 */
router.get('/subscription-growth', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subDays(new Date(), 30);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const growth = await AnalyticsService.getSubscriptionGrowth(startDate, endDate);

        res.json({ success: true, data: growth });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/churn-rate
 * Get churn rate for a period
 */
router.get('/churn-rate', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : startOfMonth(new Date());

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : endOfMonth(new Date());

        const churnRate = await AnalyticsService.getChurnRate(startDate, endDate);

        res.json({
            success: true,
            data: {
                churn_rate: churnRate,
                period_start: startDate,
                period_end: endDate
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/payment-success-rate
 * Get payment success rate metrics
 */
router.get('/payment-success-rate', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subMonths(new Date(), 1);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const metrics = await AnalyticsService.getPaymentSuccessRate(startDate, endDate);

        res.json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/coupon-usage
 * Get coupon usage statistics
 */
router.get('/coupon-usage', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subMonths(new Date(), 1);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const stats = await AnalyticsService.getCouponUsageStats(startDate, endDate);

        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/tax-collection
 * Get tax collection summary
 */
router.get('/tax-collection', async (req: Request, res: Response) => {
    try {
        const startDate = req.query.start_date
            ? new Date(req.query.start_date as string)
            : subMonths(new Date(), 1);

        const endDate = req.query.end_date
            ? new Date(req.query.end_date as string)
            : new Date();

        const summary = await AnalyticsService.getTaxCollectionSummary(startDate, endDate);

        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/lifetime-value
 * Get estimated customer lifetime value
 */
router.get('/lifetime-value', async (req: Request, res: Response) => {
    try {
        const ltv = await AnalyticsService.getLifetimeValueEstimate();

        res.json({
            success: true,
            data: {
                estimated_lifetime_value: ltv
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
