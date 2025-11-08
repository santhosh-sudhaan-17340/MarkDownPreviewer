import { Router, Request, Response } from 'express';
import TaxService from '../services/TaxService';

const router = Router();

/**
 * POST /api/tax-rules
 * Create or update a tax rule
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { country_code, state_code, tax_rate, tax_name } = req.body;

        const taxRule = await TaxService.upsertTaxRule(
            country_code,
            tax_rate,
            tax_name,
            state_code
        );

        res.status(201).json({ success: true, data: taxRule });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/tax-rules
 * Get all active tax rules
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const taxRules = await TaxService.getAllTaxRules();
        res.json({ success: true, data: taxRules });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/tax-rules/calculate
 * Calculate tax for a given amount and location
 */
router.post('/calculate', async (req: Request, res: Response) => {
    try {
        const { amount, country_code, state_code } = req.body;

        const { taxAmount, taxRule } = await TaxService.calculateTaxWithRule(
            amount,
            country_code,
            state_code
        );

        res.json({
            success: true,
            data: {
                subtotal: amount,
                tax_amount: taxAmount,
                total: amount + taxAmount,
                tax_rule: taxRule
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * DELETE /api/tax-rules/:id
 * Deactivate a tax rule
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await TaxService.deactivateTaxRule(req.params.id);
        res.json({ success: true, message: 'Tax rule deactivated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
