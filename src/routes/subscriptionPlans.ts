import { Router, Request, Response } from 'express';
import SubscriptionPlanService from '../services/SubscriptionPlanService';

const router = Router();

/**
 * GET /api/plans
 * Get all active subscription plans
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const billingPeriod = req.query.billing_period as 'monthly' | 'yearly' | undefined;

        const plans = billingPeriod
            ? await SubscriptionPlanService.getPlansByPeriod(billingPeriod)
            : await SubscriptionPlanService.getAllPlans();

        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/plans/:id
 * Get a specific plan by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const plan = await SubscriptionPlanService.getPlanById(req.params.id);

        if (!plan) {
            return res.status(404).json({ success: false, error: 'Plan not found' });
        }

        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/plans
 * Create a new subscription plan
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, billing_period, price, trial_days, features } = req.body;

        const plan = await SubscriptionPlanService.createPlan(
            name,
            description,
            billing_period,
            price,
            trial_days,
            features
        );

        res.status(201).json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * PATCH /api/plans/:id
 * Update a subscription plan
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const plan = await SubscriptionPlanService.updatePlan(req.params.id, req.body);
        res.json({ success: true, data: plan });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * DELETE /api/plans/:id
 * Deactivate a subscription plan
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await SubscriptionPlanService.deactivatePlan(req.params.id);
        res.json({ success: true, message: 'Plan deactivated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
