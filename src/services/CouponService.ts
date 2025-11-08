import Decimal from 'decimal.js';
import Database from '../database/connection';
import { Coupon, InvalidCouponError } from '../types';

export class CouponService {
    private db = Database.getInstance();

    /**
     * Validate and retrieve a coupon by code
     */
    public async validateCoupon(code: string, planId?: string): Promise<Coupon> {
        const result = await this.db.query(
            `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            throw new InvalidCouponError('Coupon not found or inactive');
        }

        const coupon: Coupon = result.rows[0];

        // Check if coupon is valid (date range)
        const now = new Date();
        if (coupon.valid_from > now) {
            throw new InvalidCouponError('Coupon is not yet valid');
        }

        if (coupon.valid_until && coupon.valid_until < now) {
            throw new InvalidCouponError('Coupon has expired');
        }

        // Check redemption limit
        if (coupon.max_redemptions && coupon.current_redemptions >= coupon.max_redemptions) {
            throw new InvalidCouponError('Coupon has reached maximum redemptions');
        }

        // Check if coupon is applicable to the plan
        if (planId && coupon.applicable_plans && coupon.applicable_plans.length > 0) {
            if (!coupon.applicable_plans.includes(planId)) {
                throw new InvalidCouponError('Coupon is not applicable to this plan');
            }
        }

        return coupon;
    }

    /**
     * Calculate discount amount
     */
    public calculateDiscount(subtotal: number, coupon: Coupon): number {
        const subtotalDecimal = new Decimal(subtotal);
        const discountValue = new Decimal(coupon.discount_value);

        let discountAmount: Decimal;

        if (coupon.discount_type === 'percentage') {
            // Percentage discount (discount_value is percentage, e.g., 20 for 20%)
            const discountRate = discountValue.dividedBy(100);
            discountAmount = subtotalDecimal.times(discountRate);
        } else {
            // Fixed amount discount
            discountAmount = discountValue;
        }

        // Discount cannot exceed subtotal
        if (discountAmount.greaterThan(subtotalDecimal)) {
            discountAmount = subtotalDecimal;
        }

        return discountAmount.toDecimalPlaces(2).toNumber();
    }

    /**
     * Increment coupon redemption count
     */
    public async incrementRedemption(couponId: string): Promise<void> {
        await this.db.query(
            `UPDATE coupons SET current_redemptions = current_redemptions + 1 WHERE id = $1`,
            [couponId]
        );
    }

    /**
     * Create a new coupon
     */
    public async createCoupon(
        code: string,
        discountType: 'percentage' | 'fixed',
        discountValue: number,
        validFrom: Date,
        validUntil?: Date,
        maxRedemptions?: number,
        applicablePlans?: string[]
    ): Promise<Coupon> {
        const result = await this.db.query(
            `INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, max_redemptions, applicable_plans, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)
             RETURNING *`,
            [
                code.toUpperCase(),
                discountType,
                discountValue,
                validFrom,
                validUntil || null,
                maxRedemptions || null,
                applicablePlans ? JSON.stringify(applicablePlans) : null
            ]
        );

        return result.rows[0];
    }

    /**
     * Get coupon by ID
     */
    public async getCouponById(id: string): Promise<Coupon | null> {
        const result = await this.db.query(
            `SELECT * FROM coupons WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get all active coupons
     */
    public async getActiveCoupons(): Promise<Coupon[]> {
        const result = await this.db.query(
            `SELECT * FROM coupons WHERE is_active = true ORDER BY created_at DESC`
        );

        return result.rows;
    }

    /**
     * Deactivate a coupon
     */
    public async deactivateCoupon(id: string): Promise<void> {
        await this.db.query(
            `UPDATE coupons SET is_active = false WHERE id = $1`,
            [id]
        );
    }
}

export default new CouponService();
