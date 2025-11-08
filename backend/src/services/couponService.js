/**
 * Coupon Service
 * Handles coupon validation, redemption, and discount calculation
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { isAfter, isBefore } = require('date-fns');

class CouponService {
    /**
     * Validate and apply coupon
     */
    async applyCoupon(client, couponCode, userId, invoiceSubtotal) {
        // Get coupon
        const couponResult = await client.query(
            'SELECT * FROM coupons WHERE code = $1 FOR UPDATE',
            [couponCode.toUpperCase()]
        );

        if (couponResult.rows.length === 0) {
            throw new Error('Invalid coupon code');
        }

        const coupon = couponResult.rows[0];

        // Validate coupon
        this._validateCoupon(coupon, userId, invoiceSubtotal);

        // Check user redemption limit
        await this._checkUserRedemptionLimit(client, coupon.id, userId, coupon.max_redemptions_per_user);

        // Calculate discount
        const discountAmount = this._calculateDiscount(coupon, invoiceSubtotal);

        // Increment redemption count
        await client.query(
            'UPDATE coupons SET times_redeemed = times_redeemed + 1 WHERE id = $1',
            [coupon.id]
        );

        logger.info('Coupon validated and applied', {
            couponCode,
            userId,
            discountAmount,
        });

        return { discountAmount, coupon };
    }

    /**
     * Validate coupon rules
     */
    _validateCoupon(coupon, userId, invoiceSubtotal) {
        const now = new Date();

        // Check if active
        if (!coupon.is_active) {
            throw new Error('This coupon is no longer active');
        }

        // Check valid_from
        if (coupon.valid_from && isBefore(now, new Date(coupon.valid_from))) {
            throw new Error('This coupon is not yet valid');
        }

        // Check valid_until
        if (coupon.valid_until && isAfter(now, new Date(coupon.valid_until))) {
            throw new Error('This coupon has expired');
        }

        // Check max redemptions
        if (coupon.max_redemptions !== null && coupon.times_redeemed >= coupon.max_redemptions) {
            throw new Error('This coupon has reached its maximum number of redemptions');
        }

        // Check minimum amount
        if (coupon.minimum_amount && invoiceSubtotal < coupon.minimum_amount) {
            throw new Error(
                `Minimum purchase amount of ${coupon.minimum_amount} ${coupon.currency} required`
            );
        }

        return true;
    }

    /**
     * Check if user has exceeded redemption limit for this coupon
     */
    async _checkUserRedemptionLimit(client, couponId, userId, maxRedemptionsPerUser) {
        const result = await client.query(
            'SELECT COUNT(*) as redemption_count FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
            [couponId, userId]
        );

        const redemptionCount = parseInt(result.rows[0].redemption_count);

        if (redemptionCount >= maxRedemptionsPerUser) {
            throw new Error('You have already used this coupon the maximum number of times');
        }

        return true;
    }

    /**
     * Calculate discount amount
     */
    _calculateDiscount(coupon, invoiceSubtotal) {
        let discount;

        if (coupon.discount_type === 'percentage') {
            discount = (invoiceSubtotal * coupon.discount_value) / 100;
        } else if (coupon.discount_type === 'fixed_amount') {
            discount = coupon.discount_value;
        } else {
            throw new Error('Invalid discount type');
        }

        // Ensure discount doesn't exceed invoice subtotal
        discount = Math.min(discount, invoiceSubtotal);

        // Round to 2 decimal places
        return Math.round(discount * 100) / 100;
    }

    /**
     * Create a new coupon
     */
    async createCoupon(couponData) {
        const {
            code,
            discountType,
            discountValue,
            currency = 'USD',
            validFrom = new Date(),
            validUntil = null,
            maxRedemptions = null,
            maxRedemptionsPerUser = 1,
            minimumAmount = 0,
            firstTimeOnly = false,
            applicablePlanIds = [],
            description = '',
        } = couponData;

        // Validate discount value
        if (discountType === 'percentage' && discountValue > 100) {
            throw new Error('Percentage discount cannot exceed 100%');
        }

        if (discountValue <= 0) {
            throw new Error('Discount value must be greater than 0');
        }

        const result = await db.query(
            `INSERT INTO coupons
            (code, discount_type, discount_value, currency, valid_from, valid_until,
             max_redemptions, max_redemptions_per_user, minimum_amount,
             first_time_transaction_only, applicable_plan_ids, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                code.toUpperCase(),
                discountType,
                discountValue,
                currency,
                validFrom,
                validUntil,
                maxRedemptions,
                maxRedemptionsPerUser,
                minimumAmount,
                firstTimeOnly,
                applicablePlanIds,
                description,
            ]
        );

        logger.info('Coupon created', { code: code.toUpperCase() });
        return result.rows[0];
    }

    /**
     * Deactivate a coupon
     */
    async deactivateCoupon(couponCode) {
        const result = await db.query(
            'UPDATE coupons SET is_active = false, updated_at = NOW() WHERE code = $1 RETURNING *',
            [couponCode.toUpperCase()]
        );

        if (result.rows.length === 0) {
            throw new Error('Coupon not found');
        }

        logger.info('Coupon deactivated', { code: couponCode });
        return result.rows[0];
    }

    /**
     * Get coupon by code
     */
    async getCoupon(couponCode) {
        const result = await db.query('SELECT * FROM coupons WHERE code = $1', [
            couponCode.toUpperCase(),
        ]);

        return result.rows[0];
    }

    /**
     * Get all active coupons
     */
    async getActiveCoupons() {
        const result = await db.query(
            `SELECT * FROM coupons
             WHERE is_active = true
             AND (valid_until IS NULL OR valid_until > NOW())
             ORDER BY created_at DESC`
        );

        return result.rows;
    }

    /**
     * Get coupon redemption history
     */
    async getCouponRedemptions(couponId, limit = 50, offset = 0) {
        const result = await db.query(
            `SELECT cr.*, u.email as user_email, i.invoice_number
             FROM coupon_redemptions cr
             JOIN users u ON cr.user_id = u.id
             LEFT JOIN invoices i ON cr.invoice_id = i.id
             WHERE cr.coupon_id = $1
             ORDER BY cr.redeemed_at DESC
             LIMIT $2 OFFSET $3`,
            [couponId, limit, offset]
        );

        return result.rows;
    }

    /**
     * Get coupon statistics
     */
    async getCouponStats(couponId) {
        const result = await db.query(
            `SELECT
                c.code,
                c.discount_type,
                c.discount_value,
                c.times_redeemed,
                c.max_redemptions,
                COUNT(cr.id) as actual_redemptions,
                SUM(cr.discount_amount) as total_discount_given,
                AVG(cr.discount_amount) as average_discount,
                COUNT(DISTINCT cr.user_id) as unique_users
             FROM coupons c
             LEFT JOIN coupon_redemptions cr ON c.id = cr.coupon_id
             WHERE c.id = $1
             GROUP BY c.id, c.code, c.discount_type, c.discount_value, c.times_redeemed, c.max_redemptions`,
            [couponId]
        );

        return result.rows[0];
    }

    /**
     * Validate coupon code (without applying)
     */
    async validateCouponCode(couponCode, userId, invoiceSubtotal) {
        const coupon = await this.getCoupon(couponCode);

        if (!coupon) {
            return { valid: false, error: 'Invalid coupon code' };
        }

        try {
            await db.transaction(async (client) => {
                this._validateCoupon(coupon, userId, invoiceSubtotal);
                await this._checkUserRedemptionLimit(
                    client,
                    coupon.id,
                    userId,
                    coupon.max_redemptions_per_user
                );
            });

            const discountAmount = this._calculateDiscount(coupon, invoiceSubtotal);

            return {
                valid: true,
                coupon,
                discountAmount,
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
            };
        }
    }
}

module.exports = new CouponService();
