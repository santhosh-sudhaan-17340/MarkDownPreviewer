/**
 * Payment Service
 * Handles payment processing, retries, refunds, and payment gateway integration
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const invoiceService = require('./invoiceService');
const { addDays } = require('date-fns');

class PaymentService {
    /**
     * Process payment for an invoice
     */
    async processPayment(userId, invoiceId, paymentMethodDetails, gateway = 'stripe') {
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

            if (invoice.user_id !== userId) {
                throw new Error('Unauthorized');
            }

            if (invoice.status === 'paid') {
                throw new Error('Invoice already paid');
            }

            // Create payment record
            const paymentResult = await client.query(
                `INSERT INTO payments
                (user_id, invoice_id, subscription_id, amount, currency, status,
                 payment_method, payment_method_details, gateway)
                VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
                RETURNING *`,
                [
                    userId,
                    invoiceId,
                    invoice.subscription_id,
                    invoice.amount_due,
                    invoice.currency,
                    paymentMethodDetails.type || 'credit_card',
                    paymentMethodDetails,
                    gateway,
                ]
            );

            const payment = paymentResult.rows[0];

            // Log payment creation
            await this._logPaymentEvent(
                client,
                payment.id,
                'created',
                'Payment initiated',
                { invoice_id: invoiceId, amount: payment.amount }
            );

            // Process payment with gateway
            try {
                await this._logPaymentEvent(client, payment.id, 'processing', 'Payment processing');

                // Simulate payment gateway call
                const gatewayResponse = await this._processWithGateway(
                    gateway,
                    payment,
                    paymentMethodDetails
                );

                if (gatewayResponse.success) {
                    // Payment succeeded
                    await client.query(
                        `UPDATE payments
                         SET status = 'succeeded',
                             gateway_transaction_id = $1,
                             gateway_response = $2,
                             processed_at = NOW(),
                             updated_at = NOW()
                         WHERE id = $3`,
                        [gatewayResponse.transactionId, gatewayResponse, payment.id]
                    );

                    await this._logPaymentEvent(
                        client,
                        payment.id,
                        'succeeded',
                        'Payment successful',
                        gatewayResponse
                    );

                    // Mark invoice as paid
                    await invoiceService.markInvoicePaid(invoiceId, payment.id, payment.amount);

                    // Update subscription status if it was past_due
                    if (invoice.subscription_id) {
                        await client.query(
                            `UPDATE subscriptions
                             SET status = 'active'
                             WHERE id = $1 AND status = 'past_due'`,
                            [invoice.subscription_id]
                        );
                    }

                    logger.info('Payment processed successfully', {
                        paymentId: payment.id,
                        invoiceId,
                        amount: payment.amount,
                    });

                    return { ...payment, status: 'succeeded' };
                } else {
                    // Payment failed
                    throw new Error(gatewayResponse.error || 'Payment failed');
                }
            } catch (error) {
                // Payment failed - schedule retry
                const nextRetryAt = this._calculateNextRetry(0);

                await client.query(
                    `UPDATE payments
                     SET status = 'failed',
                         failure_code = $1,
                         failure_message = $2,
                         failed_at = NOW(),
                         next_retry_at = $3,
                         updated_at = NOW()
                     WHERE id = $4`,
                    [error.code || 'unknown_error', error.message, nextRetryAt, payment.id]
                );

                await this._logPaymentEvent(
                    client,
                    payment.id,
                    'failed',
                    `Payment failed: ${error.message}`,
                    null,
                    error.code,
                    error.message
                );

                await this._logPaymentEvent(
                    client,
                    payment.id,
                    'retry_scheduled',
                    `Retry scheduled for ${nextRetryAt.toISOString()}`
                );

                logger.warn('Payment failed, retry scheduled', {
                    paymentId: payment.id,
                    error: error.message,
                    nextRetryAt,
                });

                throw error;
            }
        });
    }

    /**
     * Retry failed payment
     */
    async retryPayment(paymentId) {
        return db.transaction(async (client) => {
            // Get payment
            const paymentResult = await client.query(
                'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
                [paymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = paymentResult.rows[0];

            if (payment.status !== 'failed') {
                throw new Error('Payment is not in failed status');
            }

            if (payment.retry_count >= payment.max_retries) {
                throw new Error('Maximum retry attempts exceeded');
            }

            // Increment retry count
            const newRetryCount = payment.retry_count + 1;

            await this._logPaymentEvent(
                client,
                payment.id,
                'retry_attempted',
                `Retry attempt ${newRetryCount}`
            );

            try {
                await this._logPaymentEvent(client, payment.id, 'processing', 'Payment processing (retry)');

                // Retry payment with gateway
                const gatewayResponse = await this._processWithGateway(
                    payment.gateway,
                    payment,
                    payment.payment_method_details
                );

                if (gatewayResponse.success) {
                    // Payment succeeded on retry
                    await client.query(
                        `UPDATE payments
                         SET status = 'succeeded',
                             gateway_transaction_id = $1,
                             gateway_response = $2,
                             processed_at = NOW(),
                             retry_count = $3,
                             next_retry_at = NULL,
                             updated_at = NOW()
                         WHERE id = $4`,
                        [gatewayResponse.transactionId, gatewayResponse, newRetryCount, payment.id]
                    );

                    await this._logPaymentEvent(
                        client,
                        payment.id,
                        'succeeded',
                        'Payment successful on retry',
                        gatewayResponse
                    );

                    // Mark invoice as paid
                    await invoiceService.markInvoicePaid(
                        payment.invoice_id,
                        payment.id,
                        payment.amount
                    );

                    // Update subscription status
                    if (payment.subscription_id) {
                        await client.query(
                            `UPDATE subscriptions
                             SET status = 'active'
                             WHERE id = $1`,
                            [payment.subscription_id]
                        );
                    }

                    logger.info('Payment retry successful', {
                        paymentId: payment.id,
                        retryCount: newRetryCount,
                    });

                    return { ...payment, status: 'succeeded' };
                } else {
                    throw new Error(gatewayResponse.error || 'Payment failed');
                }
            } catch (error) {
                // Retry failed
                const nextRetryAt =
                    newRetryCount < payment.max_retries
                        ? this._calculateNextRetry(newRetryCount)
                        : null;

                await client.query(
                    `UPDATE payments
                     SET retry_count = $1,
                         next_retry_at = $2,
                         failure_message = $3,
                         failed_at = NOW(),
                         updated_at = NOW()
                     WHERE id = $4`,
                    [newRetryCount, nextRetryAt, error.message, payment.id]
                );

                await this._logPaymentEvent(
                    client,
                    payment.id,
                    'failed',
                    `Retry ${newRetryCount} failed: ${error.message}`,
                    null,
                    error.code,
                    error.message
                );

                if (nextRetryAt) {
                    await this._logPaymentEvent(
                        client,
                        payment.id,
                        'retry_scheduled',
                        `Retry scheduled for ${nextRetryAt.toISOString()}`
                    );
                } else {
                    // Max retries exceeded - mark subscription as past_due
                    if (payment.subscription_id) {
                        await client.query(
                            `UPDATE subscriptions
                             SET status = 'past_due'
                             WHERE id = $1`,
                            [payment.subscription_id]
                        );
                    }
                }

                logger.warn('Payment retry failed', {
                    paymentId: payment.id,
                    retryCount: newRetryCount,
                    error: error.message,
                    nextRetryAt,
                });

                throw error;
            }
        });
    }

    /**
     * Process refund
     */
    async refundPayment(paymentId, amount = null, reason = '') {
        return db.transaction(async (client) => {
            const paymentResult = await client.query(
                'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
                [paymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error('Payment not found');
            }

            const payment = paymentResult.rows[0];

            if (payment.status !== 'succeeded') {
                throw new Error('Can only refund successful payments');
            }

            const refundAmount = amount || payment.amount;

            if (refundAmount > payment.amount) {
                throw new Error('Refund amount cannot exceed payment amount');
            }

            // Process refund with gateway
            const gatewayResponse = await this._processRefundWithGateway(
                payment.gateway,
                payment.gateway_transaction_id,
                refundAmount
            );

            if (gatewayResponse.success) {
                await client.query(
                    `UPDATE payments
                     SET status = 'refunded',
                         refunded_at = NOW(),
                         metadata = metadata || $1,
                         updated_at = NOW()
                     WHERE id = $2`,
                    [{ refund_amount: refundAmount, refund_reason: reason }, paymentId]
                );

                await this._logPaymentEvent(
                    client,
                    payment.id,
                    'refunded',
                    `Refund of ${refundAmount} processed. Reason: ${reason}`,
                    gatewayResponse
                );

                logger.info('Payment refunded', {
                    paymentId,
                    refundAmount,
                    reason,
                });

                return { success: true, refundAmount };
            } else {
                throw new Error(gatewayResponse.error || 'Refund failed');
            }
        });
    }

    /**
     * Get payments due for retry
     */
    async getPaymentsDueForRetry() {
        const result = await db.query(
            `SELECT * FROM payments
             WHERE status = 'failed'
             AND retry_count < max_retries
             AND next_retry_at <= NOW()
             ORDER BY next_retry_at ASC`
        );

        return result.rows;
    }

    /**
     * Simulate payment gateway processing
     * In production, this would call Stripe, PayPal, etc.
     */
    async _processWithGateway(gateway, payment, paymentMethodDetails) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Simulate 90% success rate for testing
        const success = Math.random() > 0.1;

        if (success) {
            return {
                success: true,
                transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                gateway,
                amount: payment.amount,
                currency: payment.currency,
                timestamp: new Date().toISOString(),
            };
        } else {
            // Simulate different error types
            const errors = [
                { code: 'card_declined', message: 'Your card was declined' },
                { code: 'insufficient_funds', message: 'Insufficient funds' },
                { code: 'expired_card', message: 'Your card has expired' },
                { code: 'processing_error', message: 'An error occurred while processing your payment' },
            ];

            const error = errors[Math.floor(Math.random() * errors.length)];
            throw error;
        }
    }

    /**
     * Simulate refund processing with gateway
     */
    async _processRefundWithGateway(gateway, transactionId, amount) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
            success: true,
            refundId: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transactionId,
            amount,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Calculate next retry time based on retry count
     * Uses exponential backoff: Day 2, Day 4, Day 7
     */
    _calculateNextRetry(retryCount) {
        const delays = [2, 4, 7]; // Days
        const delayDays = delays[retryCount] || 7;
        return addDays(new Date(), delayDays);
    }

    /**
     * Log payment event
     */
    async _logPaymentEvent(client, paymentId, eventType, message, responseData = null, errorCode = null, errorMessage = null) {
        await client.query(
            `INSERT INTO payment_logs
            (payment_id, event_type, message, response_data, error_code, error_message)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [paymentId, eventType, message, responseData, errorCode, errorMessage]
        );
    }

    /**
     * Get payment logs
     */
    async getPaymentLogs(paymentId) {
        const result = await db.query(
            'SELECT * FROM payment_logs WHERE payment_id = $1 ORDER BY created_at ASC',
            [paymentId]
        );

        return result.rows;
    }
}

module.exports = new PaymentService();
