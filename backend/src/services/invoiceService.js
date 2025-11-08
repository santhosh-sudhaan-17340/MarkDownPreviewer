/**
 * Invoice Service
 * Handles invoice generation, line items, and invoice management
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { addDays, format } = require('date-fns');
const taxService = require('./taxService');
const couponService = require('./couponService');

class InvoiceService {
    /**
     * Create subscription invoice
     */
    async createSubscriptionInvoice(client, userId, subscriptionId, amount, currency, periodStart, periodEnd) {
        const invoiceNumber = this._generateInvoiceNumber();
        const invoiceDate = new Date();
        const dueDate = addDays(invoiceDate, 7); // 7 days payment terms

        // Get user details for tax calculation
        const userResult = await client.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        const user = userResult.rows[0];

        // Calculate tax (simplified - would need user's location)
        const taxRate = await taxService.getTaxRate('US', 'CA'); // Default to CA
        const taxAmount = (amount * taxRate) / 100;
        const total = amount + taxAmount;

        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices
            (invoice_number, user_id, subscription_id, status, subtotal, tax_amount,
             discount_amount, total, amount_due, amount_paid, currency,
             invoice_date, due_date)
            VALUES ($1, $2, $3, 'open', $4, $5, 0, $6, $6, 0, $7, $8, $9)
            RETURNING *`,
            [invoiceNumber, userId, subscriptionId, amount, taxAmount, total, currency, invoiceDate, dueDate]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice line item
        await client.query(
            `INSERT INTO invoice_items
            (invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount)
            VALUES ($1, $2, 1, $3, $3, $4, $5)`,
            [
                invoice.id,
                `Subscription for period ${format(periodStart, 'MMM dd, yyyy')} - ${format(periodEnd, 'MMM dd, yyyy')}`,
                amount,
                taxRate,
                taxAmount,
            ]
        );

        logger.info('Subscription invoice created', {
            invoiceId: invoice.id,
            invoiceNumber,
            userId,
            amount: total,
        });

        return invoice;
    }

    /**
     * Create proration invoice for upgrades
     */
    async createProrationInvoice(client, userId, subscriptionId, prorationAmount, description, periodStart, periodEnd) {
        const invoiceNumber = this._generateInvoiceNumber();
        const invoiceDate = new Date();
        const dueDate = addDays(invoiceDate, 7);

        // Calculate tax
        const taxRate = await taxService.getTaxRate('US', 'CA');
        const taxAmount = (prorationAmount * taxRate) / 100;
        const total = prorationAmount + taxAmount;

        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices
            (invoice_number, user_id, subscription_id, status, subtotal, tax_amount,
             discount_amount, total, amount_due, amount_paid, currency,
             invoice_date, due_date)
            VALUES ($1, $2, $3, 'open', $4, $5, 0, $6, $6, 0, 'USD', $7, $8)
            RETURNING *`,
            [invoiceNumber, userId, subscriptionId, prorationAmount, taxAmount, total, invoiceDate, dueDate]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice line item with proration flag
        await client.query(
            `INSERT INTO invoice_items
            (invoice_id, description, quantity, unit_price, amount, is_proration,
             proration_period_start, proration_period_end, tax_rate, tax_amount)
            VALUES ($1, $2, 1, $3, $3, true, $4, $5, $6, $7)`,
            [
                invoice.id,
                description,
                prorationAmount,
                periodStart,
                periodEnd,
                taxRate,
                taxAmount,
            ]
        );

        logger.info('Proration invoice created', {
            invoiceId: invoice.id,
            invoiceNumber,
            userId,
            amount: total,
        });

        return invoice;
    }

    /**
     * Apply coupon to invoice
     */
    async applyCoupon(invoiceId, couponCode, userId) {
        return db.transaction(async (client) => {
            // Get invoice
            const invoiceResult = await client.query(
                'SELECT * FROM invoices WHERE id = $1 FOR UPDATE',
                [invoiceId]
            );

            if (invoiceResult.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoiceResult.rows[0];

            if (invoice.status !== 'draft' && invoice.status !== 'open') {
                throw new Error('Cannot apply coupon to paid or void invoice');
            }

            // Validate and apply coupon
            const { discountAmount, coupon } = await couponService.applyCoupon(
                client,
                couponCode,
                userId,
                invoice.subtotal
            );

            // Update invoice
            const newTotal = invoice.subtotal + invoice.tax_amount - discountAmount;
            const newAmountDue = newTotal - invoice.amount_paid;

            await client.query(
                `UPDATE invoices
                 SET discount_amount = $1, total = $2, amount_due = $3, updated_at = NOW()
                 WHERE id = $4`,
                [discountAmount, newTotal, newAmountDue, invoiceId]
            );

            // Record coupon redemption
            await client.query(
                `INSERT INTO coupon_redemptions
                (coupon_id, user_id, invoice_id, subscription_id, discount_amount)
                VALUES ($1, $2, $3, $4, $5)`,
                [coupon.id, userId, invoiceId, invoice.subscription_id, discountAmount]
            );

            logger.info('Coupon applied to invoice', {
                invoiceId,
                couponCode,
                discountAmount,
            });

            return { discountAmount, newTotal };
        });
    }

    /**
     * Mark invoice as paid
     */
    async markInvoicePaid(invoiceId, paymentId, amount) {
        return db.transaction(async (client) => {
            const result = await client.query(
                `UPDATE invoices
                 SET status = 'paid',
                     amount_paid = amount_paid + $1,
                     amount_due = amount_due - $1,
                     paid_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [amount, invoiceId]
            );

            if (result.rows.length === 0) {
                throw new Error('Invoice not found');
            }

            logger.info('Invoice marked as paid', {
                invoiceId,
                paymentId,
                amount,
            });

            return result.rows[0];
        });
    }

    /**
     * Mark invoice as void
     */
    async voidInvoice(invoiceId, reason) {
        const result = await db.query(
            `UPDATE invoices
             SET status = 'void',
                 notes = COALESCE(notes || E'\\n', '') || $1,
                 updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [reason, invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error('Invoice not found');
        }

        logger.info('Invoice voided', { invoiceId, reason });
        return result.rows[0];
    }

    /**
     * Get invoice by ID with line items
     */
    async getInvoice(invoiceId) {
        const invoiceResult = await db.query(
            `SELECT i.*, u.email as user_email, u.full_name
             FROM invoices i
             JOIN users u ON i.user_id = u.id
             WHERE i.id = $1`,
            [invoiceId]
        );

        if (invoiceResult.rows.length === 0) {
            return null;
        }

        const invoice = invoiceResult.rows[0];

        // Get line items
        const itemsResult = await db.query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at',
            [invoiceId]
        );

        invoice.items = itemsResult.rows;

        return invoice;
    }

    /**
     * Get user invoices
     */
    async getUserInvoices(userId, limit = 50, offset = 0) {
        const result = await db.query(
            `SELECT * FROM invoices
             WHERE user_id = $1
             ORDER BY invoice_date DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return result.rows;
    }

    /**
     * Get overdue invoices
     */
    async getOverdueInvoices() {
        const result = await db.query(
            `SELECT i.*, u.email as user_email
             FROM invoices i
             JOIN users u ON i.user_id = u.id
             WHERE i.status = 'open'
             AND i.due_date < NOW()
             ORDER BY i.due_date ASC`
        );

        return result.rows;
    }

    /**
     * Generate unique invoice number
     */
    _generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0');

        return `INV-${year}${month}-${random}`;
    }

    /**
     * Calculate invoice totals (utility function)
     */
    calculateInvoiceTotals(subtotal, taxRate, discountAmount = 0) {
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount - discountAmount;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            discountAmount: Math.round(discountAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
        };
    }
}

module.exports = new InvoiceService();
