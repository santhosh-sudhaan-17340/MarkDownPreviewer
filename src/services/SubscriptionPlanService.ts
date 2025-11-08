import Database from '../database/connection';
import { SubscriptionPlan } from '../types';

export class SubscriptionPlanService {
    private db = Database.getInstance();

    /**
     * Get all active subscription plans
     */
    public async getAllPlans(): Promise<SubscriptionPlan[]> {
        const result = await this.db.query(
            `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC`
        );

        return result.rows;
    }

    /**
     * Get plans by billing period
     */
    public async getPlansByPeriod(billingPeriod: 'monthly' | 'yearly'): Promise<SubscriptionPlan[]> {
        const result = await this.db.query(
            `SELECT * FROM subscription_plans WHERE billing_period = $1 AND is_active = true ORDER BY price ASC`,
            [billingPeriod]
        );

        return result.rows;
    }

    /**
     * Get plan by ID
     */
    public async getPlanById(id: string): Promise<SubscriptionPlan | null> {
        const result = await this.db.query(
            `SELECT * FROM subscription_plans WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Create a new subscription plan
     */
    public async createPlan(
        name: string,
        description: string,
        billingPeriod: 'monthly' | 'yearly',
        price: number,
        trialDays: number = 0,
        features?: Record<string, any>
    ): Promise<SubscriptionPlan> {
        const result = await this.db.query(
            `INSERT INTO subscription_plans (name, description, billing_period, price, trial_days, features, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING *`,
            [name, description, billingPeriod, price, trialDays, features ? JSON.stringify(features) : null]
        );

        return result.rows[0];
    }

    /**
     * Update a subscription plan
     */
    public async updatePlan(
        id: string,
        updates: Partial<Pick<SubscriptionPlan, 'name' | 'description' | 'price' | 'trial_days' | 'features' | 'is_active'>>
    ): Promise<SubscriptionPlan> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            setClauses.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        });

        values.push(id);

        const result = await this.db.query(
            `UPDATE subscription_plans SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new Error('Plan not found');
        }

        return result.rows[0];
    }

    /**
     * Deactivate a plan
     */
    public async deactivatePlan(id: string): Promise<void> {
        await this.db.query(
            `UPDATE subscription_plans SET is_active = false WHERE id = $1`,
            [id]
        );
    }

    /**
     * Check if a plan upgrade/downgrade is valid
     */
    public async isValidPlanChange(fromPlanId: string, toPlanId: string): Promise<boolean> {
        const fromPlan = await this.getPlanById(fromPlanId);
        const toPlan = await this.getPlanById(toPlanId);

        if (!fromPlan || !toPlan) {
            return false;
        }

        // Plans must have the same billing period for seamless upgrade/downgrade
        return fromPlan.billing_period === toPlan.billing_period;
    }
}

export default new SubscriptionPlanService();
