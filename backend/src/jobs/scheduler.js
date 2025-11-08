/**
 * Cron Job Scheduler
 * Handles recurring tasks like subscription renewals and payment retries
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const subscriptionService = require('../services/subscriptionService');
const paymentService = require('../services/paymentService');
const analyticsService = require('../services/analyticsService');

class Scheduler {
    constructor() {
        this.jobs = [];
    }

    /**
     * Initialize all scheduled jobs
     */
    init() {
        logger.info('Initializing scheduled jobs...');

        // Check for subscription renewals every hour
        this.jobs.push(
            cron.schedule('0 * * * *', async () => {
                logger.info('Running subscription renewal check...');
                await this.processSubscriptionRenewals();
            })
        );

        // Retry failed payments every 6 hours
        this.jobs.push(
            cron.schedule('0 */6 * * *', async () => {
                logger.info('Running payment retry job...');
                await this.retryFailedPayments();
            })
        );

        // Refresh analytics materialized views daily at 2 AM
        this.jobs.push(
            cron.schedule('0 2 * * *', async () => {
                logger.info('Refreshing analytics views...');
                await analyticsService.refreshAnalytics();
            })
        );

        // Clean up old logs weekly (Sunday at 3 AM)
        this.jobs.push(
            cron.schedule('0 3 * * 0', async () => {
                logger.info('Running cleanup job...');
                await this.cleanupOldData();
            })
        );

        logger.info(`${this.jobs.length} scheduled jobs initialized`);
    }

    /**
     * Process subscription renewals
     */
    async processSubscriptionRenewals() {
        try {
            // Get subscriptions expiring in the next day
            const subscriptions = await subscriptionService.getSubscriptionsForRenewal(1);

            logger.info(`Found ${subscriptions.length} subscriptions for renewal`);

            let successCount = 0;
            let failureCount = 0;

            for (const subscription of subscriptions) {
                try {
                    await subscriptionService.renewSubscription(subscription.id);
                    successCount++;
                    logger.info('Subscription renewed', {
                        subscriptionId: subscription.id,
                        userId: subscription.user_id,
                    });
                } catch (error) {
                    failureCount++;
                    logger.error('Failed to renew subscription', {
                        subscriptionId: subscription.id,
                        error: error.message,
                    });
                }
            }

            logger.info('Subscription renewal job completed', {
                total: subscriptions.length,
                success: successCount,
                failed: failureCount,
            });

            return { total: subscriptions.length, success: successCount, failed: failureCount };
        } catch (error) {
            logger.error('Subscription renewal job failed', error);
            throw error;
        }
    }

    /**
     * Retry failed payments
     */
    async retryFailedPayments() {
        try {
            const payments = await paymentService.getPaymentsDueForRetry();

            logger.info(`Found ${payments.length} payments to retry`);

            let successCount = 0;
            let failureCount = 0;

            for (const payment of payments) {
                try {
                    await paymentService.retryPayment(payment.id);
                    successCount++;
                    logger.info('Payment retry successful', {
                        paymentId: payment.id,
                        userId: payment.user_id,
                    });
                } catch (error) {
                    failureCount++;
                    logger.error('Payment retry failed', {
                        paymentId: payment.id,
                        error: error.message,
                    });
                }

                // Add delay between retries to avoid overwhelming the payment gateway
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            logger.info('Payment retry job completed', {
                total: payments.length,
                success: successCount,
                failed: failureCount,
            });

            return { total: payments.length, success: successCount, failed: failureCount };
        } catch (error) {
            logger.error('Payment retry job failed', error);
            throw error;
        }
    }

    /**
     * Clean up old data
     */
    async cleanupOldData() {
        try {
            const db = require('../config/database');

            // Delete payment logs older than 1 year
            const logsResult = await db.query(
                `DELETE FROM payment_logs
                 WHERE created_at < NOW() - INTERVAL '1 year'`
            );

            logger.info(`Deleted ${logsResult.rowCount} old payment logs`);

            // Archive old invoices (mark as void if unpaid for > 180 days)
            const invoicesResult = await db.query(
                `UPDATE invoices
                 SET status = 'uncollectible'
                 WHERE status = 'open'
                 AND due_date < NOW() - INTERVAL '180 days'`
            );

            logger.info(`Marked ${invoicesResult.rowCount} invoices as uncollectible`);

            return {
                logsDeleted: logsResult.rowCount,
                invoicesUpdated: invoicesResult.rowCount,
            };
        } catch (error) {
            logger.error('Cleanup job failed', error);
            throw error;
        }
    }

    /**
     * Stop all scheduled jobs
     */
    stopAll() {
        this.jobs.forEach((job) => job.stop());
        logger.info('All scheduled jobs stopped');
    }

    /**
     * Manually trigger a specific job
     */
    async runJob(jobName) {
        switch (jobName) {
            case 'renewals':
                return await this.processSubscriptionRenewals();
            case 'retries':
                return await this.retryFailedPayments();
            case 'analytics':
                return await analyticsService.refreshAnalytics();
            case 'cleanup':
                return await this.cleanupOldData();
            default:
                throw new Error(`Unknown job: ${jobName}`);
        }
    }
}

module.exports = new Scheduler();
