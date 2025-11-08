/**
 * Proration Service
 * Calculates prorated amounts for subscription upgrades and downgrades
 */

const { differenceInDays, differenceInSeconds } = require('date-fns');
const logger = require('../utils/logger');

class ProrationService {
    /**
     * Calculate proration for upgrade (immediate charge)
     *
     * Formula:
     * 1. Calculate unused time credit from old plan
     * 2. Calculate cost for remaining time on new plan
     * 3. Proration = New plan cost - Old plan credit
     *
     * @param {number} oldPrice - Current plan price
     * @param {number} newPrice - New plan price
     * @param {Date} periodStart - Current period start date
     * @param {Date} periodEnd - Current period end date
     * @param {Date} upgradeDate - Date of upgrade (usually now)
     * @returns {number} Proration amount to charge
     */
    calculateUpgradeProration(oldPrice, newPrice, periodStart, periodEnd, upgradeDate) {
        // Calculate total period duration
        const totalPeriodDays = differenceInDays(periodEnd, periodStart);

        // Calculate remaining days in period
        const remainingDays = differenceInDays(periodEnd, upgradeDate);

        // Calculate what was already paid and what's unused
        const dailyOldRate = oldPrice / totalPeriodDays;
        const unusedCredit = dailyOldRate * remainingDays;

        // Calculate cost for remaining period at new rate
        const dailyNewRate = newPrice / totalPeriodDays;
        const newPeriodCost = dailyNewRate * remainingDays;

        // Proration is the difference
        const proration = newPeriodCost - unusedCredit;

        // Round to 2 decimal places
        const roundedProration = Math.round(proration * 100) / 100;

        logger.debug('Upgrade proration calculated', {
            oldPrice,
            newPrice,
            totalPeriodDays,
            remainingDays,
            unusedCredit: unusedCredit.toFixed(2),
            newPeriodCost: newPeriodCost.toFixed(2),
            proration: roundedProration,
        });

        // Ensure non-negative (shouldn't happen in upgrade, but safety check)
        return Math.max(0, roundedProration);
    }

    /**
     * Calculate proration for downgrade (credit for future)
     *
     * For downgrades, we typically don't issue immediate refunds.
     * Instead, the downgrade takes effect at the end of the current period.
     * This method calculates what the credit would be if needed.
     *
     * @param {number} oldPrice - Current plan price
     * @param {number} newPrice - New plan price
     * @param {Date} periodStart - Current period start date
     * @param {Date} periodEnd - Current period end date
     * @param {Date} downgradeDate - Date of downgrade
     * @returns {number} Credit amount (negative value)
     */
    calculateDowngradeCredit(oldPrice, newPrice, periodStart, periodEnd, downgradeDate) {
        const totalPeriodDays = differenceInDays(periodEnd, periodStart);
        const remainingDays = differenceInDays(periodEnd, downgradeDate);

        const dailyOldRate = oldPrice / totalPeriodDays;
        const dailyNewRate = newPrice / totalPeriodDays;

        const oldPeriodCost = dailyOldRate * remainingDays;
        const newPeriodCost = dailyNewRate * remainingDays;

        // Credit is negative (old cost - new cost)
        const credit = oldPeriodCost - newPeriodCost;
        const roundedCredit = Math.round(credit * 100) / 100;

        logger.debug('Downgrade credit calculated', {
            oldPrice,
            newPrice,
            totalPeriodDays,
            remainingDays,
            oldPeriodCost: oldPeriodCost.toFixed(2),
            newPeriodCost: newPeriodCost.toFixed(2),
            credit: roundedCredit,
        });

        return roundedCredit;
    }

    /**
     * Calculate proration for plan change with different billing cycles
     *
     * This is more complex as it involves converting between monthly/yearly
     *
     * @param {number} oldPrice - Current plan price
     * @param {string} oldCycle - Current billing cycle (monthly, yearly, quarterly)
     * @param {number} newPrice - New plan price
     * @param {string} newCycle - New billing cycle
     * @param {Date} periodStart - Current period start date
     * @param {Date} periodEnd - Current period end date
     * @param {Date} changeDate - Date of change
     * @returns {number} Proration amount
     */
    calculateCrossCycleProration(oldPrice, oldCycle, newPrice, newCycle, periodStart, periodEnd, changeDate) {
        // Convert prices to daily rates
        const oldDailyRate = this._getDailyRate(oldPrice, oldCycle);
        const newDailyRate = this._getDailyRate(newPrice, newCycle);

        // Calculate remaining days
        const remainingDays = differenceInDays(periodEnd, changeDate);

        // Calculate costs
        const unusedCredit = oldDailyRate * remainingDays;
        const newPeriodCost = newDailyRate * remainingDays;

        const proration = newPeriodCost - unusedCredit;
        const roundedProration = Math.round(proration * 100) / 100;

        logger.debug('Cross-cycle proration calculated', {
            oldPrice,
            oldCycle,
            newPrice,
            newCycle,
            oldDailyRate: oldDailyRate.toFixed(4),
            newDailyRate: newDailyRate.toFixed(4),
            remainingDays,
            proration: roundedProration,
        });

        return roundedProration;
    }

    /**
     * Calculate proration for mid-cycle cancellation with refund
     *
     * @param {number} price - Plan price
     * @param {Date} periodStart - Period start date
     * @param {Date} periodEnd - Period end date
     * @param {Date} cancelDate - Cancellation date
     * @returns {number} Refund amount
     */
    calculateCancellationRefund(price, periodStart, periodEnd, cancelDate) {
        const totalPeriodDays = differenceInDays(periodEnd, periodStart);
        const usedDays = differenceInDays(cancelDate, periodStart);
        const remainingDays = totalPeriodDays - usedDays;

        const dailyRate = price / totalPeriodDays;
        const refund = dailyRate * remainingDays;

        const roundedRefund = Math.round(refund * 100) / 100;

        logger.debug('Cancellation refund calculated', {
            price,
            totalPeriodDays,
            usedDays,
            remainingDays,
            dailyRate: dailyRate.toFixed(4),
            refund: roundedRefund,
        });

        return Math.max(0, roundedRefund);
    }

    /**
     * Calculate proration for trial conversion
     *
     * When a trial ends and converts to paid, calculate the charge
     *
     * @param {number} price - Plan price
     * @param {Date} trialEnd - Trial end date
     * @param {Date} periodEnd - Period end date
     * @returns {number} Prorated amount for remaining period
     */
    calculateTrialConversionProration(price, trialEnd, periodEnd) {
        const totalDays = differenceInDays(periodEnd, trialEnd);

        // If trial conversion happens at the start of a new period, charge full amount
        if (totalDays <= 0) {
            return price;
        }

        // Otherwise, prorate for remaining time
        // Assuming the price is for a monthly period, adjust accordingly
        const dailyRate = price / 30; // Simplified - adjust based on actual billing cycle
        const prorated = dailyRate * totalDays;

        const roundedProration = Math.round(prorated * 100) / 100;

        logger.debug('Trial conversion proration calculated', {
            price,
            totalDays,
            dailyRate: dailyRate.toFixed(4),
            proration: roundedProration,
        });

        return roundedProration;
    }

    /**
     * Get daily rate for a price based on billing cycle
     *
     * @param {number} price - Plan price
     * @param {string} cycle - Billing cycle (monthly, yearly, quarterly)
     * @returns {number} Daily rate
     */
    _getDailyRate(price, cycle) {
        switch (cycle) {
            case 'monthly':
                return price / 30; // Average month
            case 'yearly':
                return price / 365;
            case 'quarterly':
                return price / 90; // 3 months average
            default:
                throw new Error(`Unknown billing cycle: ${cycle}`);
        }
    }

    /**
     * Calculate proration with grace period
     *
     * Some businesses offer a grace period where no proration occurs
     *
     * @param {number} oldPrice - Current plan price
     * @param {number} newPrice - New plan price
     * @param {Date} periodStart - Period start date
     * @param {Date} periodEnd - Period end date
     * @param {Date} changeDate - Date of change
     * @param {number} gracePeriodHours - Grace period in hours
     * @returns {number} Proration amount (may be 0 if within grace period)
     */
    calculateProrationWithGrace(oldPrice, newPrice, periodStart, periodEnd, changeDate, gracePeriodHours = 24) {
        const hoursSincePeriodStart = differenceInSeconds(changeDate, periodStart) / 3600;

        // If within grace period, no proration
        if (hoursSincePeriodStart <= gracePeriodHours) {
            logger.debug('Change within grace period, no proration', {
                hoursSincePeriodStart,
                gracePeriodHours,
            });
            return 0;
        }

        // Otherwise, calculate normal proration
        return this.calculateUpgradeProration(oldPrice, newPrice, periodStart, periodEnd, changeDate);
    }
}

module.exports = new ProrationService();
