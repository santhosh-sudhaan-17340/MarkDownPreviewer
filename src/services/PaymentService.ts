import { PoolClient } from 'pg';
import { addHours } from 'date-fns';
import Database from '../database/connection';
import { Payment, PaymentRetryLog, PaymentStatus } from '../types';
import InvoiceService from './InvoiceService';

export class PaymentService {
    private db = Database.getInstance();
    private maxRetries: number = parseInt(process.env.MAX_PAYMENT_RETRIES || '3');
    private retryDelayHours: number = parseInt(process.env.RETRY_DELAY_HOURS || '24');

    /**
     * Create a payment record
     */
    public async createPayment(
        invoiceId: string,
        subscriptionId: string,
        userId: string,
        amount: number,
        paymentMethod?: string
    ): Promise<Payment> {
        const result = await this.db.query(
            `INSERT INTO payments (
                invoice_id, subscription_id, user_id, amount,
                status, payment_method, retry_count
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [invoiceId, subscriptionId, userId, amount, 'pending', paymentMethod || null, 0]
        );

        return result.rows[0];
    }

    /**
     * Process a payment (simulated - integrate with real payment gateway)
     */
    public async processPayment(
        paymentId: string,
        paymentGateway: string = 'stripe'
    ): Promise<Payment> {
        return await this.db.transaction(async (client: PoolClient) => {
            const paymentResult = await client.query(
                `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
                [paymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment: Payment = paymentResult.rows[0];

            // Update payment status to processing
            await client.query(
                `UPDATE payments SET status = 'processing', payment_gateway = $1 WHERE id = $2`,
                [paymentGateway, paymentId]
            );

            try {
                // Simulate payment processing
                // In production, integrate with Stripe, PayPal, etc.
                const gatewayResponse = await this.simulatePaymentGateway(payment);

                if (gatewayResponse.success) {
                    // Payment succeeded
                    const updatedPayment = await this.markPaymentSucceeded(
                        client,
                        paymentId,
                        gatewayResponse.transactionId
                    );

                    // Mark invoice as paid
                    await InvoiceService.markInvoiceAsPaid(payment.invoice_id);

                    return updatedPayment;
                } else {
                    // Payment failed
                    return await this.markPaymentFailed(
                        client,
                        paymentId,
                        gatewayResponse.failureCode,
                        gatewayResponse.failureMessage
                    );
                }
            } catch (error) {
                // Handle processing error
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return await this.markPaymentFailed(client, paymentId, 'processing_error', errorMessage);
            }
        });
    }

    /**
     * Mark payment as succeeded
     */
    private async markPaymentSucceeded(
        client: PoolClient,
        paymentId: string,
        transactionId: string
    ): Promise<Payment> {
        const result = await client.query(
            `UPDATE payments
             SET status = 'succeeded', gateway_transaction_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [transactionId, paymentId]
        );

        return result.rows[0];
    }

    /**
     * Mark payment as failed and schedule retry if applicable
     */
    private async markPaymentFailed(
        client: PoolClient,
        paymentId: string,
        failureCode: string,
        failureMessage: string
    ): Promise<Payment> {
        const paymentResult = await client.query(
            `SELECT * FROM payments WHERE id = $1`,
            [paymentId]
        );

        const payment: Payment = paymentResult.rows[0];
        const newRetryCount = payment.retry_count + 1;

        // Determine if we should schedule a retry
        const nextRetryAt = newRetryCount < this.maxRetries
            ? addHours(new Date(), this.retryDelayHours)
            : null;

        const result = await client.query(
            `UPDATE payments
             SET status = 'failed',
                 failure_code = $1,
                 failure_message = $2,
                 retry_count = $3,
                 next_retry_at = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [failureCode, failureMessage, newRetryCount, nextRetryAt, paymentId]
        );

        // Log the retry attempt
        await client.query(
            `INSERT INTO payment_retry_logs (payment_id, retry_attempt, status, failure_reason)
             VALUES ($1, $2, $3, $4)`,
            [paymentId, newRetryCount, 'failed', failureMessage]
        );

        return result.rows[0];
    }

    /**
     * Retry failed payments
     */
    public async retryFailedPayments(): Promise<void> {
        // Get payments that need retry
        const result = await this.db.query(
            `SELECT * FROM payments
             WHERE status = 'failed'
             AND next_retry_at IS NOT NULL
             AND next_retry_at <= CURRENT_TIMESTAMP
             AND retry_count < $1`,
            [this.maxRetries]
        );

        const paymentsToRetry: Payment[] = result.rows;

        console.log(`Found ${paymentsToRetry.length} payments to retry`);

        for (const payment of paymentsToRetry) {
            try {
                console.log(`Retrying payment ${payment.id}, attempt ${payment.retry_count + 1}`);
                await this.processPayment(payment.id, payment.payment_gateway || 'stripe');
            } catch (error) {
                console.error(`Failed to retry payment ${payment.id}:`, error);
            }
        }
    }

    /**
     * Get payment by ID
     */
    public async getPaymentById(id: string): Promise<Payment | null> {
        const result = await this.db.query(
            `SELECT * FROM payments WHERE id = $1`,
            [id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get payments for an invoice
     */
    public async getInvoicePayments(invoiceId: string): Promise<Payment[]> {
        const result = await this.db.query(
            `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC`,
            [invoiceId]
        );

        return result.rows;
    }

    /**
     * Get payment retry logs
     */
    public async getPaymentRetryLogs(paymentId: string): Promise<PaymentRetryLog[]> {
        const result = await this.db.query(
            `SELECT * FROM payment_retry_logs WHERE payment_id = $1 ORDER BY attempted_at ASC`,
            [paymentId]
        );

        return result.rows;
    }

    /**
     * Refund a payment
     */
    public async refundPayment(paymentId: string): Promise<Payment> {
        return await this.db.transaction(async (client: PoolClient) => {
            const paymentResult = await client.query(
                `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
                [paymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment: Payment = paymentResult.rows[0];

            if (payment.status !== 'succeeded') {
                throw new Error('Can only refund succeeded payments');
            }

            // Process refund with payment gateway (simulated)
            // In production, call the actual payment gateway API

            const result = await client.query(
                `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
                [paymentId]
            );

            // Update invoice status
            await client.query(
                `UPDATE invoices SET status = 'void', voided_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [payment.invoice_id]
            );

            return result.rows[0];
        });
    }

    /**
     * Simulate payment gateway (for testing purposes)
     * In production, replace with actual payment gateway integration
     */
    private async simulatePaymentGateway(
        payment: Payment
    ): Promise<{ success: boolean; transactionId?: string; failureCode?: string; failureMessage?: string }> {
        // Simulate 90% success rate
        const random = Math.random();

        if (random > 0.1) {
            // Success
            return {
                success: true,
                transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
        } else {
            // Failure
            const failures = [
                { code: 'insufficient_funds', message: 'Insufficient funds in account' },
                { code: 'card_declined', message: 'Card was declined' },
                { code: 'expired_card', message: 'Card has expired' }
            ];

            const failure = failures[Math.floor(Math.random() * failures.length)];

            return {
                success: false,
                failureCode: failure.code,
                failureMessage: failure.message
            };
        }
    }
}

export default new PaymentService();
