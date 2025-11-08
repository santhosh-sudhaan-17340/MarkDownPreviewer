import { Router, Request, Response } from 'express';
import SubscriptionService from '../services/SubscriptionService';
import InvoiceService from '../services/InvoiceService';
import { OptimisticLockError } from '../types';

const router = Router();

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { user_id, plan_id, start_date } = req.body;

        const subscription = await SubscriptionService.createSubscription(
            user_id,
            plan_id,
            start_date ? new Date(start_date) : undefined
        );

        res.status(201).json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/subscriptions/:id
 * Get subscription by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const subscription = await SubscriptionService.getSubscriptionById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/subscriptions/user/:userId
 * Get all subscriptions for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const subscriptions = await SubscriptionService.getUserSubscriptions(req.params.userId);
        res.json({ success: true, data: subscriptions });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/subscriptions/user/:userId/active
 * Get active subscription for a user
 */
router.get('/user/:userId/active', async (req: Request, res: Response) => {
    try {
        const subscription = await SubscriptionService.getActiveSubscription(req.params.userId);
        res.json({ success: true, data: subscription });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/subscriptions/:id/change-plan
 * Upgrade or downgrade subscription plan
 */
router.post('/:id/change-plan', async (req: Request, res: Response) => {
    try {
        const { new_plan_id, immediate } = req.body;

        const result = await SubscriptionService.changePlan(
            req.params.id,
            new_plan_id,
            immediate !== false // Default to immediate
        );

        res.json({
            success: true,
            data: result.subscription,
            proration_amount: result.prorationAmount
        });
    } catch (error) {
        if (error instanceof OptimisticLockError) {
            return res.status(409).json({
                success: false,
                error: error.message,
                retry: true
            });
        }
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel subscription
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
        const { immediate } = req.body;

        const subscription = await SubscriptionService.cancelSubscription(
            req.params.id,
            immediate === true
        );

        res.json({ success: true, data: subscription });
    } catch (error) {
        if (error instanceof OptimisticLockError) {
            return res.status(409).json({
                success: false,
                error: error.message,
                retry: true
            });
        }
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/subscriptions/:id/reactivate
 * Reactivate a canceled subscription
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
    try {
        const subscription = await SubscriptionService.reactivateSubscription(req.params.id);
        res.json({ success: true, data: subscription });
    } catch (error) {
        if (error instanceof OptimisticLockError) {
            return res.status(409).json({
                success: false,
                error: error.message,
                retry: true
            });
        }
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/subscriptions/:id/history
 * Get subscription change history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
    try {
        const history = await SubscriptionService.getSubscriptionHistory(req.params.id);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/subscriptions/:id/invoices
 * Get invoices for a subscription
 */
router.get('/:id/invoices', async (req: Request, res: Response) => {
    try {
        const invoices = await InvoiceService.getSubscriptionInvoices(req.params.id);
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
