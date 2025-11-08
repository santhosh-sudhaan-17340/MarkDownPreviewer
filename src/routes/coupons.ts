import { Router, Request, Response } from 'express';
import CouponService from '../services/CouponService';
import { InvalidCouponError } from '../types';

const router = Router();

/**
 * POST /api/coupons
 * Create a new coupon
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            code,
            discount_type,
            discount_value,
            valid_from,
            valid_until,
            max_redemptions,
            applicable_plans
        } = req.body;

        const coupon = await CouponService.createCoupon(
            code,
            discount_type,
            discount_value,
            new Date(valid_from),
            valid_until ? new Date(valid_until) : undefined,
            max_redemptions,
            applicable_plans
        );

        res.status(201).json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/coupons
 * Get all active coupons
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const coupons = await CouponService.getActiveCoupons();
        res.json({ success: true, data: coupons });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/coupons/:id
 * Get coupon by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const coupon = await CouponService.getCouponById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }

        res.json({ success: true, data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/coupons/validate
 * Validate a coupon code
 */
router.post('/validate', async (req: Request, res: Response) => {
    try {
        const { code, plan_id } = req.body;

        const coupon = await CouponService.validateCoupon(code, plan_id);

        res.json({
            success: true,
            data: coupon,
            is_valid: true
        });
    } catch (error) {
        if (error instanceof InvalidCouponError) {
            return res.status(400).json({
                success: false,
                error: error.message,
                is_valid: false
            });
        }
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/coupons/calculate-discount
 * Calculate discount for a given amount
 */
router.post('/calculate-discount', async (req: Request, res: Response) => {
    try {
        const { code, amount, plan_id } = req.body;

        const coupon = await CouponService.validateCoupon(code, plan_id);
        const discountAmount = CouponService.calculateDiscount(amount, coupon);

        res.json({
            success: true,
            data: {
                original_amount: amount,
                discount_amount: discountAmount,
                final_amount: amount - discountAmount,
                coupon: coupon
            }
        });
    } catch (error) {
        if (error instanceof InvalidCouponError) {
            return res.status(400).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * DELETE /api/coupons/:id
 * Deactivate a coupon
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await CouponService.deactivateCoupon(req.params.id);
        res.json({ success: true, message: 'Coupon deactivated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
