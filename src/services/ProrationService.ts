import Decimal from 'decimal.js';
import { differenceInDays, differenceInSeconds } from 'date-fns';
import { ProrationCalculation, SubscriptionPlan } from '../types';

export class ProrationService {
    /**
     * Calculate proration when upgrading or downgrading a subscription
     * Uses precise time-based calculation for fair billing
     */
    public calculateProration(
        oldPlan: SubscriptionPlan,
        newPlan: SubscriptionPlan,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        changeDate: Date = new Date()
    ): ProrationCalculation {
        // Calculate total seconds in the billing period
        const totalSeconds = differenceInSeconds(currentPeriodEnd, currentPeriodStart);

        // Calculate remaining seconds from change date to period end
        const remainingSeconds = differenceInSeconds(currentPeriodEnd, changeDate);

        // Calculate days for reporting
        const daysInPeriod = differenceInDays(currentPeriodEnd, currentPeriodStart);
        const daysRemaining = differenceInDays(currentPeriodEnd, changeDate);

        // Use Decimal.js for precise financial calculations
        const oldPlanPrice = new Decimal(oldPlan.price);
        const newPlanPrice = new Decimal(newPlan.price);

        // Calculate unused portion of old plan (credit)
        const unusedRatio = new Decimal(remainingSeconds).dividedBy(totalSeconds);
        const creditAmount = oldPlanPrice.times(unusedRatio);

        // Calculate cost for remaining period on new plan
        const chargeAmount = newPlanPrice.times(unusedRatio);

        // Net amount (positive = customer pays, negative = customer gets credit)
        const netAmount = chargeAmount.minus(creditAmount);

        return {
            credit_amount: creditAmount.toDecimalPlaces(2).toNumber(),
            charge_amount: chargeAmount.toDecimalPlaces(2).toNumber(),
            net_amount: netAmount.toDecimalPlaces(2).toNumber(),
            days_remaining: daysRemaining,
            days_in_period: daysInPeriod
        };
    }

    /**
     * Calculate proration for mid-cycle cancellation
     */
    public calculateCancellationCredit(
        plan: SubscriptionPlan,
        currentPeriodStart: Date,
        currentPeriodEnd: Date,
        cancellationDate: Date = new Date()
    ): number {
        const totalSeconds = differenceInSeconds(currentPeriodEnd, currentPeriodStart);
        const remainingSeconds = differenceInSeconds(currentPeriodEnd, cancellationDate);

        const planPrice = new Decimal(plan.price);
        const unusedRatio = new Decimal(remainingSeconds).dividedBy(totalSeconds);
        const creditAmount = planPrice.times(unusedRatio);

        return creditAmount.toDecimalPlaces(2).toNumber();
    }

    /**
     * Calculate partial period charge for new subscriptions
     * (e.g., starting mid-month)
     */
    public calculatePartialPeriodCharge(
        plan: SubscriptionPlan,
        periodStart: Date,
        periodEnd: Date,
        subscriptionStart: Date = new Date()
    ): number {
        const totalSeconds = differenceInSeconds(periodEnd, periodStart);
        const actualSeconds = differenceInSeconds(periodEnd, subscriptionStart);

        const planPrice = new Decimal(plan.price);
        const usageRatio = new Decimal(actualSeconds).dividedBy(totalSeconds);
        const chargeAmount = planPrice.times(usageRatio);

        return chargeAmount.toDecimalPlaces(2).toNumber();
    }
}

export default new ProrationService();
