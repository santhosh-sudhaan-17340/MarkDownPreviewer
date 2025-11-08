import { PoolClient } from 'pg';
import Decimal from 'decimal.js';
import Database from '../database/connection';
import { Invoice, InvoiceLineItem, Subscription } from '../types';
import SubscriptionPlanService from './SubscriptionPlanService';
import TaxService from './TaxService';
import CouponService from './CouponService';

export class InvoiceService {
    private db = Database.getInstance();

    /**
     * Generate a unique invoice number
     */
    private async generateInvoiceNumber(): Promise<string> {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `INV-${timestamp}-${random}`;
    }

    /**
     * Create an invoice for a subscription
     */
    public async createInvoice(
        subscription: Subscription,
        couponCode?: string,
        countryCode?: string,
        stateCode?: string
    ): Promise<Invoice> {
        return await this.db.transaction(async (client: PoolClient) => {
            // Get subscription plan
            const plan = await SubscriptionPlanService.getPlanById(subscription.plan_id);
            if (!plan) {
                throw new Error('Plan not found');
            }

            // Calculate subtotal
            let subtotal = new Decimal(plan.price);

            // Generate invoice number
            const invoiceNumber = await this.generateInvoiceNumber();

            // Handle coupon if provided
            let couponId: string | null = null;
            let discountAmount = new Decimal(0);

            if (couponCode) {
                try {
                    const coupon = await CouponService.validateCoupon(couponCode, plan.id);
                    couponId = coupon.id;
                    discountAmount = new Decimal(CouponService.calculateDiscount(subtotal.toNumber(), coupon));
                } catch (error) {
                    // If coupon is invalid, continue without it
                    console.warn('Invalid coupon:', error);
                }
            }

            // Calculate tax
            let taxAmount = new Decimal(0);
            let taxRuleId: string | null = null;

            if (countryCode) {
                const { taxAmount: calculatedTax, taxRule } = await TaxService.calculateTaxWithRule(
                    subtotal.minus(discountAmount).toNumber(),
                    countryCode,
                    stateCode
                );

                taxAmount = new Decimal(calculatedTax);
                taxRuleId = taxRule?.id || null;
            }

            // Calculate total
            const total = subtotal.minus(discountAmount).plus(taxAmount);

            // Create invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices (
                    invoice_number, subscription_id, user_id, status,
                    subtotal, tax_amount, discount_amount, total,
                    coupon_id, tax_rule_id,
                    billing_period_start, billing_period_end, due_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *`,
                [
                    invoiceNumber,
                    subscription.id,
                    subscription.user_id,
                    'open',
                    subtotal.toDecimalPlaces(2).toNumber(),
                    taxAmount.toDecimalPlaces(2).toNumber(),
                    discountAmount.toDecimalPlaces(2).toNumber(),
                    total.toDecimalPlaces(2).toNumber(),
                    couponId,
                    taxRuleId,
                    subscription.current_period_start,
                    subscription.current_period_end,
                    subscription.current_period_end // Due at end of period
                ]
            );

            const invoice: Invoice = invoiceResult.rows[0];

            // Create line item for the subscription
            await client.query(
                `INSERT INTO invoice_line_items (
                    invoice_id, description, quantity, unit_price, amount,
                    period_start, period_end
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    invoice.id,
                    `${plan.name} - ${plan.billing_period} subscription`,
                    1,
                    plan.price,
                    plan.price,
                    subscription.current_period_start,
                    subscription.current_period_end
                ]
            );

            // Increment coupon redemption if used
            if (couponId) {
                await CouponService.incrementRedemption(couponId);
            }

            return invoice;
        });
    }

    /**
     * Create invoice with proration line items
     */
    public async createInvoiceWithProration(
        subscription: Subscription,
        prorationAmount: number,
        prorationDescription: string,
        couponCode?: string,
        countryCode?: string,
        stateCode?: string
    ): Promise<Invoice> {
        return await this.db.transaction(async (client: PoolClient) => {
            const plan = await SubscriptionPlanService.getPlanById(subscription.plan_id);
            if (!plan) {
                throw new Error('Plan not found');
            }

            const invoiceNumber = await this.generateInvoiceNumber();

            // Calculate subtotal (plan price + proration)
            let subtotal = new Decimal(plan.price).plus(prorationAmount);

            // Handle coupon
            let couponId: string | null = null;
            let discountAmount = new Decimal(0);

            if (couponCode) {
                try {
                    const coupon = await CouponService.validateCoupon(couponCode, plan.id);
                    couponId = coupon.id;
                    discountAmount = new Decimal(CouponService.calculateDiscount(subtotal.toNumber(), coupon));
                } catch (error) {
                    console.warn('Invalid coupon:', error);
                }
            }

            // Calculate tax
            let taxAmount = new Decimal(0);
            let taxRuleId: string | null = null;

            if (countryCode) {
                const { taxAmount: calculatedTax, taxRule } = await TaxService.calculateTaxWithRule(
                    subtotal.minus(discountAmount).toNumber(),
                    countryCode,
                    stateCode
                );

                taxAmount = new Decimal(calculatedTax);
                taxRuleId = taxRule?.id || null;
            }

            const total = subtotal.minus(discountAmount).plus(taxAmount);

            // Create invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices (
                    invoice_number, subscription_id, user_id, status,
                    subtotal, tax_amount, discount_amount, total,
                    coupon_id, tax_rule_id,
                    billing_period_start, billing_period_end, due_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *`,
                [
                    invoiceNumber,
                    subscription.id,
                    subscription.user_id,
                    'open',
                    subtotal.toDecimalPlaces(2).toNumber(),
                    taxAmount.toDecimalPlaces(2).toNumber(),
                    discountAmount.toDecimalPlaces(2).toNumber(),
                    total.toDecimalPlaces(2).toNumber(),
                    couponId,
                    taxRuleId,
                    subscription.current_period_start,
                    subscription.current_period_end,
                    subscription.current_period_end
                ]
            );

            const invoice: Invoice = invoiceResult.rows[0];

            // Create line items
            await client.query(
                `INSERT INTO invoice_line_items (
                    invoice_id, description, quantity, unit_price, amount,
                    period_start, period_end
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    invoice.id,
                    `${plan.name} - ${plan.billing_period} subscription`,
                    1,
                    plan.price,
                    plan.price,
                    subscription.current_period_start,
                    subscription.current_period_end
                ]
            );

            // Add proration line item
            await client.query(
                `INSERT INTO invoice_line_items (
                    invoice_id, description, quantity, unit_price, amount, proration
                )
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    invoice.id,
                    prorationDescription,
                    1,
                    prorationAmount,
                    prorationAmount,
                    true
                ]
            );

            if (couponId) {
                await CouponService.incrementRedemption(couponId);
            }

            return invoice;
        });
    }

    /**
     * Get invoice by ID
     */
    public async getInvoiceById(id: string): Promise<Invoice | null> {
        const result = await this.db.query(
            `SELECT * FROM invoices WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get invoice line items
     */
    public async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
        const result = await this.db.query(
            `SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY created_at`,
            [invoiceId]
        );

        return result.rows;
    }

    /**
     * Get invoices for a user
     */
    public async getUserInvoices(userId: string): Promise<Invoice[]> {
        const result = await this.db.query(
            `SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Get invoices for a subscription
     */
    public async getSubscriptionInvoices(subscriptionId: string): Promise<Invoice[]> {
        const result = await this.db.query(
            `SELECT * FROM invoices WHERE subscription_id = $1 ORDER BY created_at DESC`,
            [subscriptionId]
        );

        return result.rows;
    }

    /**
     * Mark invoice as paid
     */
    public async markInvoiceAsPaid(invoiceId: string): Promise<Invoice> {
        const result = await this.db.query(
            `UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error('Invoice not found');
        }

        return result.rows[0];
    }

    /**
     * Void an invoice
     */
    public async voidInvoice(invoiceId: string): Promise<Invoice> {
        const result = await this.db.query(
            `UPDATE invoices SET status = 'void', voided_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error('Invoice not found');
        }

        return result.rows[0];
    }

    /**
     * Get overdue invoices
     */
    public async getOverdueInvoices(): Promise<Invoice[]> {
        const result = await this.db.query(
            `SELECT * FROM invoices
             WHERE status = 'open' AND due_date < CURRENT_TIMESTAMP
             ORDER BY due_date ASC`
        );

        return result.rows;
    }
}

export default new InvoiceService();
