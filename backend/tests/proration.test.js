/**
 * Proration Service Tests
 * Demonstrates proration calculation functionality
 */

const prorationService = require('../src/services/prorationService');
const { subDays, addDays } = require('date-fns');

describe('Proration Service', () => {
    describe('calculateUpgradeProration', () => {
        test('should calculate proration for mid-period upgrade', () => {
            const oldPrice = 9.99;
            const newPrice = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01'); // 30 days
            const upgradeDate = new Date('2024-11-16'); // 15 days in

            const proration = prorationService.calculateUpgradeProration(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                upgradeDate
            );

            // Expected calculation:
            // Total period: 30 days
            // Remaining: 15 days
            // Old plan credit: (9.99/30) * 15 = 4.995
            // New plan cost: (29.99/30) * 15 = 14.995
            // Proration: 14.995 - 4.995 = 10.00

            expect(proration).toBe(10.00);
        });

        test('should return 0 for same price plans', () => {
            const price = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const upgradeDate = new Date('2024-11-16');

            const proration = prorationService.calculateUpgradeProration(
                price,
                price,
                periodStart,
                periodEnd,
                upgradeDate
            );

            expect(proration).toBe(0);
        });

        test('should handle upgrade on first day', () => {
            const oldPrice = 9.99;
            const newPrice = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const upgradeDate = new Date('2024-11-01');

            const proration = prorationService.calculateUpgradeProration(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                upgradeDate
            );

            // Full period at new price minus full period at old price
            expect(proration).toBeGreaterThan(0);
            expect(proration).toBeCloseTo(20.00, 0);
        });

        test('should handle upgrade on last day', () => {
            const oldPrice = 9.99;
            const newPrice = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const upgradeDate = subDays(periodEnd, 1);

            const proration = prorationService.calculateUpgradeProration(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                upgradeDate
            );

            // Only 1 day remaining, should be small
            expect(proration).toBeLessThan(1);
            expect(proration).toBeGreaterThan(0);
        });
    });

    describe('calculateDowngradeCredit', () => {
        test('should calculate credit for downgrade', () => {
            const oldPrice = 29.99;
            const newPrice = 9.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const downgradeDate = new Date('2024-11-16');

            const credit = prorationService.calculateDowngradeCredit(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                downgradeDate
            );

            // Should be positive (credit owed to user)
            expect(credit).toBeGreaterThan(0);
            expect(credit).toBeCloseTo(10.00, 0);
        });
    });

    describe('calculateCancellationRefund', () => {
        test('should calculate refund for mid-period cancellation', () => {
            const price = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const cancelDate = new Date('2024-11-16');

            const refund = prorationService.calculateCancellationRefund(
                price,
                periodStart,
                periodEnd,
                cancelDate
            );

            // 15 days used, 15 days remaining
            // Refund should be ~50% of price
            expect(refund).toBeCloseTo(14.995, 1);
        });

        test('should return 0 for cancellation on last day', () => {
            const price = 29.99;
            const periodStart = new Date('2024-11-01');
            const periodEnd = new Date('2024-12-01');
            const cancelDate = periodEnd;

            const refund = prorationService.calculateCancellationRefund(
                price,
                periodStart,
                periodEnd,
                cancelDate
            );

            expect(refund).toBe(0);
        });
    });

    describe('calculateProrationWithGrace', () => {
        test('should return 0 within grace period', () => {
            const oldPrice = 9.99;
            const newPrice = 29.99;
            const periodStart = new Date('2024-11-01T00:00:00Z');
            const periodEnd = new Date('2024-12-01T00:00:00Z');
            const changeDate = new Date('2024-11-01T12:00:00Z'); // 12 hours after start

            const proration = prorationService.calculateProrationWithGrace(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                changeDate,
                24 // 24 hour grace period
            );

            expect(proration).toBe(0);
        });

        test('should calculate proration after grace period', () => {
            const oldPrice = 9.99;
            const newPrice = 29.99;
            const periodStart = new Date('2024-11-01T00:00:00Z');
            const periodEnd = new Date('2024-12-01T00:00:00Z');
            const changeDate = new Date('2024-11-03T00:00:00Z'); // 48 hours after start

            const proration = prorationService.calculateProrationWithGrace(
                oldPrice,
                newPrice,
                periodStart,
                periodEnd,
                changeDate,
                24 // 24 hour grace period
            );

            expect(proration).toBeGreaterThan(0);
        });
    });
});

// Run tests:
// npm test tests/proration.test.js
