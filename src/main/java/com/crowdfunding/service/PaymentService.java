package com.crowdfunding.service;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.Contribution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Payment simulation service for processing contributions
 */
public class PaymentService {
    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);
    private static final Random random = new Random();

    private final double successRate;
    private final long processingDelay;

    public PaymentService() {
        this.successRate = Double.parseDouble(
            DatabaseConfig.getProperty("payment.simulation.success.rate", "0.95"));
        this.processingDelay = Long.parseLong(
            DatabaseConfig.getProperty("payment.simulation.processing.delay", "2000"));
    }

    /**
     * Simulate payment processing asynchronously
     */
    public CompletableFuture<PaymentResult> processPayment(
            BigDecimal amount, String paymentMethod, String userEmail) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                // Generate transaction ID
                String transactionId = generateTransactionId();

                logger.info("Processing payment - Amount: {}, Method: {}, TxID: {}",
                    amount, paymentMethod, transactionId);

                // Simulate processing delay
                Thread.sleep(processingDelay);

                // Simulate payment success/failure based on configured rate
                boolean success = random.nextDouble() < successRate;

                if (success) {
                    logger.info("Payment succeeded - TxID: {}", transactionId);
                    return new PaymentResult(
                        true,
                        transactionId,
                        Contribution.PaymentStatus.COMPLETED,
                        "Payment processed successfully"
                    );
                } else {
                    logger.warn("Payment failed - TxID: {}", transactionId);
                    return new PaymentResult(
                        false,
                        transactionId,
                        Contribution.PaymentStatus.FAILED,
                        "Payment processing failed. Please try again."
                    );
                }

            } catch (InterruptedException e) {
                logger.error("Payment processing interrupted", e);
                Thread.currentThread().interrupt();
                return new PaymentResult(
                    false,
                    null,
                    Contribution.PaymentStatus.FAILED,
                    "Payment processing was interrupted"
                );
            } catch (Exception e) {
                logger.error("Payment processing error", e);
                return new PaymentResult(
                    false,
                    null,
                    Contribution.PaymentStatus.FAILED,
                    "An error occurred during payment processing"
                );
            }
        });
    }

    /**
     * Validate payment method
     */
    public boolean validatePaymentMethod(String paymentMethod) {
        return paymentMethod != null &&
               (paymentMethod.equalsIgnoreCase("CREDIT_CARD") ||
                paymentMethod.equalsIgnoreCase("DEBIT_CARD") ||
                paymentMethod.equalsIgnoreCase("PAYPAL") ||
                paymentMethod.equalsIgnoreCase("BANK_TRANSFER"));
    }

    /**
     * Generate unique transaction ID
     */
    private String generateTransactionId() {
        return "TXN-" + UUID.randomUUID().toString().toUpperCase();
    }

    /**
     * Simulate refund processing
     */
    public boolean processRefund(String transactionId, BigDecimal amount) {
        try {
            logger.info("Processing refund - TxID: {}, Amount: {}", transactionId, amount);
            Thread.sleep(1000); // Simulate processing
            logger.info("Refund processed successfully - TxID: {}", transactionId);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.error("Refund processing interrupted", e);
            return false;
        }
    }

    /**
     * Payment result class
     */
    public static class PaymentResult {
        private final boolean success;
        private final String transactionId;
        private final Contribution.PaymentStatus status;
        private final String message;

        public PaymentResult(boolean success, String transactionId,
                           Contribution.PaymentStatus status, String message) {
            this.success = success;
            this.transactionId = transactionId;
            this.status = status;
            this.message = message;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getTransactionId() {
            return transactionId;
        }

        public Contribution.PaymentStatus getStatus() {
            return status;
        }

        public String getMessage() {
            return message;
        }
    }
}
