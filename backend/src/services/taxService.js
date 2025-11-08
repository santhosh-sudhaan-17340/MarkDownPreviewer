/**
 * Tax Service
 * Handles tax calculation based on geographic rules
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class TaxService {
    /**
     * Get applicable tax rate for a location
     */
    async getTaxRate(countryCode, stateCode = null) {
        const result = await db.query(
            `SELECT * FROM tax_rules
             WHERE country_code = $1
             AND (state_code = $2 OR state_code IS NULL)
             AND is_active = true
             AND effective_from <= NOW()
             AND (effective_until IS NULL OR effective_until > NOW())
             ORDER BY state_code DESC NULLS LAST, effective_from DESC
             LIMIT 1`,
            [countryCode, stateCode]
        );

        if (result.rows.length === 0) {
            // No tax rule found, return 0
            logger.debug('No tax rule found', { countryCode, stateCode });
            return 0;
        }

        const taxRule = result.rows[0];
        logger.debug('Tax rate retrieved', {
            countryCode,
            stateCode,
            taxRate: taxRule.tax_rate,
            taxName: taxRule.tax_name,
        });

        return taxRule.tax_rate;
    }

    /**
     * Get tax rule details for a location
     */
    async getTaxRule(countryCode, stateCode = null) {
        const result = await db.query(
            `SELECT * FROM tax_rules
             WHERE country_code = $1
             AND (state_code = $2 OR state_code IS NULL)
             AND is_active = true
             AND effective_from <= NOW()
             AND (effective_until IS NULL OR effective_until > NOW())
             ORDER BY state_code DESC NULLS LAST, effective_from DESC
             LIMIT 1`,
            [countryCode, stateCode]
        );

        return result.rows[0] || null;
    }

    /**
     * Calculate tax amount
     */
    async calculateTax(amount, countryCode, stateCode = null, includeShipping = false) {
        const taxRule = await this.getTaxRule(countryCode, stateCode);

        if (!taxRule) {
            return {
                taxAmount: 0,
                taxRate: 0,
                taxName: 'No Tax',
                inclusive: false,
            };
        }

        let taxableAmount = amount;

        // If tax doesn't apply to shipping and shipping is included in amount,
        // you would need to subtract it here (requires additional parameter)

        let taxAmount;

        if (taxRule.inclusive) {
            // Tax is already included in the price
            // Calculate tax from the total: tax = total - (total / (1 + rate/100))
            taxAmount = amount - amount / (1 + taxRule.tax_rate / 100);
        } else {
            // Tax is added to the price
            taxAmount = (taxableAmount * taxRule.tax_rate) / 100;
        }

        // Round to 2 decimal places
        taxAmount = Math.round(taxAmount * 100) / 100;

        return {
            taxAmount,
            taxRate: taxRule.tax_rate,
            taxName: taxRule.tax_name,
            inclusive: taxRule.inclusive,
            taxRule,
        };
    }

    /**
     * Create a new tax rule
     */
    async createTaxRule(taxRuleData) {
        const {
            countryCode,
            stateCode = null,
            taxName,
            taxRate,
            effectiveFrom = new Date(),
            effectiveUntil = null,
            appliesToShipping = false,
            inclusive = false,
            description = '',
        } = taxRuleData;

        // Validate tax rate
        if (taxRate < 0 || taxRate > 100) {
            throw new Error('Tax rate must be between 0 and 100');
        }

        const result = await db.query(
            `INSERT INTO tax_rules
            (country_code, state_code, tax_name, tax_rate, effective_from,
             effective_until, applies_to_shipping, inclusive, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                countryCode,
                stateCode,
                taxName,
                taxRate,
                effectiveFrom,
                effectiveUntil,
                appliesToShipping,
                inclusive,
                description,
            ]
        );

        logger.info('Tax rule created', {
            countryCode,
            stateCode,
            taxName,
            taxRate,
        });

        return result.rows[0];
    }

    /**
     * Update tax rule
     */
    async updateTaxRule(taxRuleId, updates) {
        const allowedFields = [
            'tax_rate',
            'effective_until',
            'is_active',
            'applies_to_shipping',
            'description',
        ];

        const updateFields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(taxRuleId);

        const result = await db.query(
            `UPDATE tax_rules
             SET ${updateFields.join(', ')}, updated_at = NOW()
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new Error('Tax rule not found');
        }

        logger.info('Tax rule updated', { taxRuleId, updates });
        return result.rows[0];
    }

    /**
     * Deactivate tax rule
     */
    async deactivateTaxRule(taxRuleId) {
        const result = await db.query(
            'UPDATE tax_rules SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
            [taxRuleId]
        );

        if (result.rows.length === 0) {
            throw new Error('Tax rule not found');
        }

        logger.info('Tax rule deactivated', { taxRuleId });
        return result.rows[0];
    }

    /**
     * Get all tax rules
     */
    async getAllTaxRules(activeOnly = true) {
        const query = activeOnly
            ? 'SELECT * FROM tax_rules WHERE is_active = true ORDER BY country_code, state_code'
            : 'SELECT * FROM tax_rules ORDER BY country_code, state_code';

        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Get tax rules by country
     */
    async getTaxRulesByCountry(countryCode) {
        const result = await db.query(
            `SELECT * FROM tax_rules
             WHERE country_code = $1
             AND is_active = true
             ORDER BY state_code NULLS LAST, effective_from DESC`,
            [countryCode]
        );

        return result.rows;
    }

    /**
     * Validate VAT number (EU)
     * This is a placeholder - in production, you'd use a service like VIES
     */
    async validateVATNumber(vatNumber, countryCode) {
        // This would typically call an external API like VIES for EU VAT validation
        // For now, just basic format validation
        const vatRegex = /^[A-Z]{2}[0-9A-Z]{2,13}$/;

        if (!vatRegex.test(vatNumber)) {
            return {
                valid: false,
                error: 'Invalid VAT number format',
            };
        }

        // In production, call VIES or similar service here
        logger.info('VAT number validated (placeholder)', { vatNumber, countryCode });

        return {
            valid: true,
            vatNumber,
            countryCode,
            // Additional details from VIES would go here
        };
    }

    /**
     * Determine if transaction is tax-exempt
     * For example, B2B transactions in EU with valid VAT number
     */
    async isTaxExempt(countryCode, stateCode = null, vatNumber = null) {
        // Reverse charge mechanism for EU B2B transactions
        if (vatNumber && this._isEUCountry(countryCode)) {
            const vatValidation = await this.validateVATNumber(vatNumber, countryCode);
            if (vatValidation.valid) {
                logger.info('Transaction tax-exempt (EU B2B reverse charge)', {
                    countryCode,
                    vatNumber,
                });
                return true;
            }
        }

        // Add other tax exemption rules here

        return false;
    }

    /**
     * Check if country is in EU
     */
    _isEUCountry(countryCode) {
        const euCountries = [
            'AT',
            'BE',
            'BG',
            'HR',
            'CY',
            'CZ',
            'DK',
            'EE',
            'FI',
            'FR',
            'DE',
            'GR',
            'HU',
            'IE',
            'IT',
            'LV',
            'LT',
            'LU',
            'MT',
            'NL',
            'PL',
            'PT',
            'RO',
            'SK',
            'SI',
            'ES',
            'SE',
        ];

        return euCountries.includes(countryCode);
    }
}

module.exports = new TaxService();
