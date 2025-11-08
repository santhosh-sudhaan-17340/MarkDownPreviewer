package com.crowdfunding.service;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.dao.CampaignDAO;
import com.crowdfunding.dao.ContributionDAO;
import com.crowdfunding.model.Campaign;
import com.crowdfunding.model.Contribution;
import com.crowdfunding.service.PaymentService.PaymentResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Service for managing contributions with ACID-compliant transactions
 * Demonstrates proper transaction management using JDBC
 */
public class ContributionService {
    private static final Logger logger = LoggerFactory.getLogger(ContributionService.class);

    private final ContributionDAO contributionDAO;
    private final CampaignDAO campaignDAO;
    private final PaymentService paymentService;

    public ContributionService() {
        this.contributionDAO = new ContributionDAO();
        this.campaignDAO = new CampaignDAO();
        this.paymentService = new PaymentService();
    }

    /**
     * Process a contribution with ACID-compliant transaction
     * This ensures atomicity, consistency, isolation, and durability
     */
    public CompletableFuture<Contribution> contributeAsync(
            Long campaignId, Long userId, BigDecimal amount,
            String paymentMethod, boolean isAnonymous, String message) {

        return CompletableFuture.supplyAsync(() -> {
            Connection conn = null;
            try {
                // Validate input
                validateContributionInput(campaignId, userId, amount, paymentMethod);

                // Get database connection for transaction
                conn = DatabaseConfig.getConnection();

                // BEGIN TRANSACTION
                // Set auto-commit to false for manual transaction control
                conn.setAutoCommit(false);

                // Set transaction isolation level to SERIALIZABLE for highest consistency
                conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);

                logger.info("Starting contribution transaction - Campaign: {}, User: {}, Amount: {}",
                    campaignId, userId, amount);

                // 1. Verify campaign exists and is active
                Optional<Campaign> campaignOpt = campaignDAO.findById(campaignId);
                if (!campaignOpt.isPresent()) {
                    throw new IllegalArgumentException("Campaign not found");
                }

                Campaign campaign = campaignOpt.get();
                if (!campaign.isActiveAndOngoing()) {
                    throw new IllegalArgumentException(
                        "Campaign is not active or has ended. Status: " + campaign.getStatus());
                }

                if (campaign.isSuspicious()) {
                    throw new IllegalArgumentException("Campaign is suspended");
                }

                // 2. Create contribution record with PENDING status
                Contribution contribution = new Contribution(campaignId, userId, amount, paymentMethod);
                contribution.setAnonymous(isAnonymous);
                contribution.setMessage(message);
                contribution.setPaymentStatus(Contribution.PaymentStatus.PENDING);

                Long contributionId = contributionDAO.createContribution(conn, contribution);
                contribution.setContributionId(contributionId);

                // COMMIT the pending contribution
                conn.commit();
                logger.info("Contribution record created with ID: {}", contributionId);

                // 3. Process payment (simulated - happens outside transaction)
                conn.setAutoCommit(true); // Reset auto-commit
                PaymentResult paymentResult = paymentService
                    .processPayment(amount, paymentMethod, "user@example.com")
                    .get(); // Wait for payment to complete

                // 4. Start new transaction to update contribution status
                conn.setAutoCommit(false);
                conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);

                if (paymentResult.isSuccess()) {
                    // Payment succeeded - update contribution to COMPLETED
                    contribution.setTransactionId(paymentResult.getTransactionId());
                    contribution.setPaymentStatus(Contribution.PaymentStatus.COMPLETED);

                    // Update contribution status
                    contributionDAO.updateContributionStatus(
                        conn, contributionId, Contribution.PaymentStatus.COMPLETED);

                    // The database trigger will automatically update campaign.current_amount
                    // This ensures atomicity - both updates succeed or both fail

                    // COMMIT transaction
                    conn.commit();
                    logger.info("Contribution completed successfully - ID: {}, TxID: {}",
                        contributionId, paymentResult.getTransactionId());

                } else {
                    // Payment failed - update contribution to FAILED
                    contribution.setPaymentStatus(Contribution.PaymentStatus.FAILED);
                    contributionDAO.updateContributionStatus(
                        conn, contributionId, Contribution.PaymentStatus.FAILED);

                    // COMMIT the failed status
                    conn.commit();
                    logger.warn("Contribution payment failed - ID: {}", contributionId);
                }

                return contribution;

            } catch (Exception e) {
                // ROLLBACK transaction on any error
                if (conn != null) {
                    try {
                        conn.rollback();
                        logger.error("Transaction rolled back due to error", e);
                    } catch (SQLException rollbackEx) {
                        logger.error("Error during rollback", rollbackEx);
                    }
                }
                throw new RuntimeException("Failed to process contribution: " + e.getMessage(), e);

            } finally {
                // Reset connection state and return to pool
                if (conn != null) {
                    try {
                        conn.setAutoCommit(true);
                        conn.close();
                    } catch (SQLException e) {
                        logger.error("Error closing connection", e);
                    }
                }
            }
        });
    }

    /**
     * Synchronous version of contribute method
     */
    public Contribution contribute(Long campaignId, Long userId, BigDecimal amount,
                                   String paymentMethod, boolean isAnonymous, String message) {
        try {
            return contributeAsync(campaignId, userId, amount, paymentMethod, isAnonymous, message).get();
        } catch (Exception e) {
            throw new RuntimeException("Failed to process contribution", e);
        }
    }

    /**
     * Get contribution by ID
     */
    public Optional<Contribution> getContributionById(Long contributionId) throws SQLException {
        return contributionDAO.findById(contributionId);
    }

    /**
     * Get contributions for a campaign
     */
    public List<Contribution> getCampaignContributions(Long campaignId, int page, int pageSize)
            throws SQLException {
        int offset = page * pageSize;
        return contributionDAO.findByCampaignId(campaignId, pageSize, offset);
    }

    /**
     * Get user's contribution history
     */
    public List<Contribution> getUserContributions(Long userId) throws SQLException {
        return contributionDAO.findByUserId(userId);
    }

    /**
     * Get contributor count for a campaign
     */
    public int getContributorCount(Long campaignId) throws SQLException {
        return contributionDAO.getContributorCount(campaignId);
    }

    /**
     * Validate contribution input
     */
    private void validateContributionInput(Long campaignId, Long userId,
                                          BigDecimal amount, String paymentMethod) {
        if (campaignId == null || campaignId <= 0) {
            throw new IllegalArgumentException("Invalid campaign ID");
        }
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (amount.compareTo(new BigDecimal("1000000")) > 0) {
            throw new IllegalArgumentException("Amount exceeds maximum limit");
        }
        if (!paymentService.validatePaymentMethod(paymentMethod)) {
            throw new IllegalArgumentException("Invalid payment method");
        }
    }
}
