import { Router, Request, Response } from 'express';
import InvoiceService from '../services/InvoiceService';
import SubscriptionService from '../services/SubscriptionService';

const router = Router();

/**
 * POST /api/invoices
 * Create an invoice for a subscription
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { subscription_id, coupon_code, country_code, state_code } = req.body;

        const subscription = await SubscriptionService.getSubscriptionById(subscription_id);
        if (!subscription) {
            return res.status(404).json({ success: false, error: 'Subscription not found' });
        }

        const invoice = await InvoiceService.createInvoice(
            subscription,
            coupon_code,
            country_code,
            state_code
        );

        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/invoices/:id
 * Get invoice by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const invoice = await InvoiceService.getInvoiceById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/invoices/:id/line-items
 * Get invoice line items
 */
router.get('/:id/line-items', async (req: Request, res: Response) => {
    try {
        const lineItems = await InvoiceService.getInvoiceLineItems(req.params.id);
        res.json({ success: true, data: lineItems });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/invoices/user/:userId
 * Get all invoices for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const invoices = await InvoiceService.getUserInvoices(req.params.userId);
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/invoices/:id/pay
 * Mark invoice as paid
 */
router.post('/:id/pay', async (req: Request, res: Response) => {
    try {
        const invoice = await InvoiceService.markInvoiceAsPaid(req.params.id);
        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/invoices/:id/void
 * Void an invoice
 */
router.post('/:id/void', async (req: Request, res: Response) => {
    try {
        const invoice = await InvoiceService.voidInvoice(req.params.id);
        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/invoices/overdue
 * Get all overdue invoices
 */
router.get('/status/overdue', async (req: Request, res: Response) => {
    try {
        const invoices = await InvoiceService.getOverdueInvoices();
        res.json({ success: true, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
