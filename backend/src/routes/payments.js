/**
 * Payment API Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const paymentService = require('../services/paymentService');
const db = require('../config/database');

/**
 * POST /api/payments/process
 * Process a payment
 */
router.post(
    '/process',
    authenticate,
    validate(schemas.processPayment),
    asyncHandler(async (req, res) => {
        const { invoiceId, paymentMethod } = req.validatedBody;

        const payment = await paymentService.processPayment(
            req.user.userId,
            invoiceId,
            paymentMethod,
            'stripe'
        );

        res.json({
            message: 'Payment processed successfully',
            payment,
        });
    })
);

/**
 * GET /api/payments
 * Get user's payment history
 */
router.get(
    '/',
    authenticate,
    asyncHandler(async (req, res) => {
        const { limit = 50, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT p.*, i.invoice_number
             FROM payments p
             LEFT JOIN invoices i ON p.invoice_id = i.id
             WHERE p.user_id = $1
             ORDER BY p.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.userId, parseInt(limit), parseInt(offset)]
        );

        res.json({ payments: result.rows });
    })
);

/**
 * GET /api/payments/:id
 * Get payment details
 */
router.get(
    '/:id',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM payments WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({ payment: result.rows[0] });
    })
);

/**
 * GET /api/payments/:id/logs
 * Get payment logs
 */
router.get(
    '/:id/logs',
    authenticate,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Verify payment belongs to user
        const paymentResult = await db.query(
            'SELECT user_id FROM payments WHERE id = $1',
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (paymentResult.rows[0].user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const logs = await paymentService.getPaymentLogs(id);
        res.json({ logs });
    })
);

module.exports = router;
