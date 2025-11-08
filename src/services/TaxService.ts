import Decimal from 'decimal.js';
import Database from '../database/connection';
import { TaxRule } from '../types';

export class TaxService {
    private db = Database.getInstance();

    /**
     * Get applicable tax rule based on location
     */
    public async getTaxRule(countryCode: string, stateCode?: string): Promise<TaxRule | null> {
        // Try to find exact match first (country + state)
        if (stateCode) {
            const result = await this.db.query(
                `SELECT * FROM tax_rules
                 WHERE country_code = $1 AND state_code = $2 AND is_active = true
                 LIMIT 1`,
                [countryCode, stateCode]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            }
        }

        // Fallback to country-level tax rule
        const result = await this.db.query(
            `SELECT * FROM tax_rules
             WHERE country_code = $1 AND state_code IS NULL AND is_active = true
             LIMIT 1`,
            [countryCode]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Calculate tax amount for a given subtotal
     */
    public calculateTax(subtotal: number, taxRate: number): number {
        const subtotalDecimal = new Decimal(subtotal);
        const taxRateDecimal = new Decimal(taxRate);
        const taxAmount = subtotalDecimal.times(taxRateDecimal);

        return taxAmount.toDecimalPlaces(2).toNumber();
    }

    /**
     * Calculate tax with tax rule lookup
     */
    public async calculateTaxWithRule(
        subtotal: number,
        countryCode: string,
        stateCode?: string
    ): Promise<{ taxAmount: number; taxRule: TaxRule | null }> {
        const taxRule = await this.getTaxRule(countryCode, stateCode);

        if (!taxRule) {
            return { taxAmount: 0, taxRule: null };
        }

        const taxAmount = this.calculateTax(subtotal, taxRule.tax_rate);

        return { taxAmount, taxRule };
    }

    /**
     * Create or update a tax rule
     */
    public async upsertTaxRule(
        countryCode: string,
        taxRate: number,
        taxName: string,
        stateCode?: string
    ): Promise<TaxRule> {
        const result = await this.db.query(
            `INSERT INTO tax_rules (country_code, state_code, tax_rate, tax_name, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (country_code, state_code)
             DO UPDATE SET tax_rate = $3, tax_name = $4, is_active = true, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [countryCode, stateCode || null, taxRate, taxName]
        );

        return result.rows[0];
    }

    /**
     * Get all active tax rules
     */
    public async getAllTaxRules(): Promise<TaxRule[]> {
        const result = await this.db.query(
            `SELECT * FROM tax_rules WHERE is_active = true ORDER BY country_code, state_code`
        );

        return result.rows;
    }

    /**
     * Deactivate a tax rule
     */
    public async deactivateTaxRule(id: string): Promise<void> {
        await this.db.query(
            `UPDATE tax_rules SET is_active = false WHERE id = $1`,
            [id]
        );
    }
}

export default new TaxService();
