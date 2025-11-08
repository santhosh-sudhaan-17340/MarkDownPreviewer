import { Router, Request, Response } from 'express';
import PaymentService from '../services/PaymentService';

const router = Router();

/**
 * POST /api/payments
 * Create and process a payment
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { invoice_id, subscription_id, user_id, amount, payment_method, payment_gateway } = req.body;

        const payment = await PaymentService.createPayment(
            invoice_id,
            subscription_id,
            user_id,
            amount,
            payment_method
        );

        // Process the payment
        const processedPayment = await PaymentService.processPayment(payment.id, payment_gateway);

        res.status(201).json({ success: true, data: processedPayment });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentService.getPaymentById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        res.json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/payments/invoice/:invoiceId
 * Get all payments for an invoice
 */
router.get('/invoice/:invoiceId', async (req: Request, res: Response) => {
    try {
        const payments = await PaymentService.getInvoicePayments(req.params.invoiceId);
        res.json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/payments/:id/retry-logs
 * Get retry logs for a payment
 */
router.get('/:id/retry-logs', async (req: Request, res: Response) => {
    try {
        const logs = await PaymentService.getPaymentRetryLogs(req.params.id);
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/payments/:id/retry
 * Manually retry a failed payment
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentService.getPaymentById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        if (payment.status !== 'failed') {
            return res.status(400).json({ success: false, error: 'Can only retry failed payments' });
        }

        const processedPayment = await PaymentService.processPayment(payment.id, payment.payment_gateway || 'stripe');

        res.json({ success: true, data: processedPayment });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/payments/:id/refund
 * Refund a payment
 */
router.post('/:id/refund', async (req: Request, res: Response) => {
    try {
        const payment = await PaymentService.refundPayment(req.params.id);
        res.json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/payments/retry-failed
 * Retry all failed payments that are due for retry
 */
router.post('/retry-failed/batch', async (req: Request, res: Response) => {
    try {
        await PaymentService.retryFailedPayments();
        res.json({ success: true, message: 'Failed payments retry process initiated' });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
