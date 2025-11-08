/**
 * Invoice API Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const invoiceService = require('../services/invoiceService');
const { validate, schemas } = require('../middleware/validation');

/**
 * GET /api/invoices
 * Get user's invoices
 */
router.get(
    '/',
    authenticate,
    asyncHandler(async (req, res) => {
        const { limit = 50, offset = 0 } = req.query;

        const invoices = await invoiceService.getUserInvoices(
            req.user.userId,
            parseInt(limit),
            parseInt(offset)
        );

        res.json({ invoices });
    })
);

/**
 * GET /api/invoices/:id
 * Get invoice by ID with line items
 */
router.get(
    '/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const invoice = await invoiceService.getInvoice(id);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        if (invoice.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({ invoice });
    })
);

/**
 * POST /api/invoices/:id/apply-coupon
 * Apply coupon to invoice
 */
router.post(
    '/:id/apply-coupon',
    authenticate,
    validate(schemas.applyCoupon),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { couponCode } = req.validatedBody;

        const result = await invoiceService.applyCoupon(id, couponCode, req.user.userId);

        res.json({
            message: 'Coupon applied successfully',
            discountAmount: result.discountAmount,
            newTotal: result.newTotal,
        });
    })
);

module.exports = router;
