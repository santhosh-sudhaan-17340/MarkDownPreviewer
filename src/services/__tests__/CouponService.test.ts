import CouponService from '../CouponService';
import { Coupon, InvalidCouponError } from '../../types';

describe('CouponService', () => {
    describe('calculateDiscount', () => {
        it('should calculate percentage discount correctly', () => {
            const coupon: Coupon = {
                id: '1',
                code: 'SAVE20',
                discount_type: 'percentage',
                discount_value: 20,
                max_redemptions: null,
                current_redemptions: 0,
                valid_from: new Date(),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            const discount = CouponService.calculateDiscount(100, coupon);
            expect(discount).toBe(20);
        });

        it('should calculate fixed discount correctly', () => {
            const coupon: Coupon = {
                id: '2',
                code: 'SAVE10',
                discount_type: 'fixed',
                discount_value: 10,
                max_redemptions: null,
                current_redemptions: 0,
                valid_from: new Date(),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            const discount = CouponService.calculateDiscount(100, coupon);
            expect(discount).toBe(10);
        });

        it('should not exceed subtotal for fixed discount', () => {
            const coupon: Coupon = {
                id: '3',
                code: 'BIG50',
                discount_type: 'fixed',
                discount_value: 150,
                max_redemptions: null,
                current_redemptions: 0,
                valid_from: new Date(),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            const discount = CouponService.calculateDiscount(100, coupon);
            expect(discount).toBe(100); // Should cap at subtotal
        });

        it('should calculate 100% discount for percentage', () => {
            const coupon: Coupon = {
                id: '4',
                code: 'FREE100',
                discount_type: 'percentage',
                discount_value: 100,
                max_redemptions: null,
                current_redemptions: 0,
                valid_from: new Date(),
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            };

            const discount = CouponService.calculateDiscount(50, coupon);
            expect(discount).toBe(50);
        });
    });
});
