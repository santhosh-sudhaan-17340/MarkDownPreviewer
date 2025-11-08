import ProrationService from '../ProrationService';
import { SubscriptionPlan } from '../../types';

describe('ProrationService', () => {
    const basicMonthlyPlan: SubscriptionPlan = {
        id: '1',
        name: 'Basic Monthly',
        billing_period: 'monthly',
        price: 10.00,
        trial_days: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    };

    const proMonthlyPlan: SubscriptionPlan = {
        id: '2',
        name: 'Pro Monthly',
        billing_period: 'monthly',
        price: 30.00,
        trial_days: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    };

    describe('calculateProration', () => {
        it('should calculate proration for upgrade mid-period', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');
            const changeDate = new Date('2024-01-16'); // Halfway through

            const proration = ProrationService.calculateProration(
                basicMonthlyPlan,
                proMonthlyPlan,
                periodStart,
                periodEnd,
                changeDate
            );

            // Expect to pay for the difference for remaining half
            expect(proration.net_amount).toBeGreaterThan(0);
            expect(proration.charge_amount).toBeGreaterThan(proration.credit_amount);
        });

        it('should calculate proration for downgrade mid-period', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');
            const changeDate = new Date('2024-01-16');

            const proration = ProrationService.calculateProration(
                proMonthlyPlan,
                basicMonthlyPlan,
                periodStart,
                periodEnd,
                changeDate
            );

            // Expect to receive credit for the difference
            expect(proration.net_amount).toBeLessThan(0);
            expect(proration.credit_amount).toBeGreaterThan(proration.charge_amount);
        });

        it('should calculate zero net amount for same price plans', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');
            const changeDate = new Date('2024-01-16');

            const proration = ProrationService.calculateProration(
                basicMonthlyPlan,
                basicMonthlyPlan,
                periodStart,
                periodEnd,
                changeDate
            );

            expect(proration.net_amount).toBe(0);
        });
    });

    describe('calculateCancellationCredit', () => {
        it('should calculate credit for mid-period cancellation', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');
            const cancellationDate = new Date('2024-01-16');

            const credit = ProrationService.calculateCancellationCredit(
                basicMonthlyPlan,
                periodStart,
                periodEnd,
                cancellationDate
            );

            expect(credit).toBeGreaterThan(0);
            expect(credit).toBeLessThan(basicMonthlyPlan.price);
        });

        it('should calculate zero credit for end-of-period cancellation', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');

            const credit = ProrationService.calculateCancellationCredit(
                basicMonthlyPlan,
                periodStart,
                periodEnd,
                periodEnd
            );

            expect(credit).toBe(0);
        });
    });

    describe('calculatePartialPeriodCharge', () => {
        it('should calculate partial charge for mid-period start', () => {
            const periodStart = new Date('2024-01-01');
            const periodEnd = new Date('2024-02-01');
            const subscriptionStart = new Date('2024-01-16');

            const charge = ProrationService.calculatePartialPeriodCharge(
                basicMonthlyPlan,
                periodStart,
                periodEnd,
                subscriptionStart
            );

            expect(charge).toBeGreaterThan(0);
            expect(charge).toBeLessThan(basicMonthlyPlan.price);
        });
    });
});
