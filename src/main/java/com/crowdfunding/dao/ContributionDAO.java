package com.crowdfunding.dao;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.Contribution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data Access Object for Contribution entity with transaction support
 */
public class ContributionDAO {
    private static final Logger logger = LoggerFactory.getLogger(ContributionDAO.class);

    /**
     * Create a new contribution (should be called within a transaction)
     */
    public Long createContribution(Connection conn, Contribution contribution) throws SQLException {
        String sql = "INSERT INTO contributions (campaign_id, user_id, amount, payment_status, " +
                    "payment_method, transaction_id, payment_details, is_anonymous, message) " +
                    "VALUES (?, ?, ?, ?::varchar, ?, ?, ?::jsonb, ?, ?) RETURNING contribution_id";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, contribution.getCampaignId());
            stmt.setLong(2, contribution.getUserId());
            stmt.setBigDecimal(3, contribution.getAmount());
            stmt.setString(4, contribution.getPaymentStatus().name());
            stmt.setString(5, contribution.getPaymentMethod());
            stmt.setString(6, contribution.getTransactionId());
            stmt.setString(7, contribution.getPaymentDetails());
            stmt.setBoolean(8, contribution.isAnonymous());
            stmt.setString(9, contribution.getMessage());

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                Long contributionId = rs.getLong("contribution_id");
                logger.info("Created contribution with ID: {}", contributionId);
                return contributionId;
            }
            throw new SQLException("Failed to create contribution, no ID returned");
        }
    }

    /**
     * Update contribution status (for payment processing)
     */
    public void updateContributionStatus(Connection conn, Long contributionId,
                                         Contribution.PaymentStatus status) throws SQLException {
        String sql = "UPDATE contributions SET payment_status = ?::varchar, " +
                    "processed_at = CURRENT_TIMESTAMP WHERE contribution_id = ?";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, status.name());
            stmt.setLong(2, contributionId);

            stmt.executeUpdate();
            logger.info("Updated contribution {} status to {}", contributionId, status);
        }
    }

    /**
     * Find contribution by ID
     */
    public Optional<Contribution> findById(Long contributionId) throws SQLException {
        String sql = "SELECT * FROM contributions WHERE contribution_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, contributionId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return Optional.of(mapResultSetToContribution(rs));
            }
            return Optional.empty();
        }
    }

    /**
     * Get contributions for a campaign
     */
    public List<Contribution> findByCampaignId(Long campaignId, int limit, int offset) throws SQLException {
        String sql = "SELECT * FROM contributions WHERE campaign_id = ? AND payment_status = 'COMPLETED' " +
                    "ORDER BY created_at DESC LIMIT ? OFFSET ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            stmt.setInt(2, limit);
            stmt.setInt(3, offset);

            ResultSet rs = stmt.executeQuery();
            List<Contribution> contributions = new ArrayList<>();

            while (rs.next()) {
                contributions.add(mapResultSetToContribution(rs));
            }
            return contributions;
        }
    }

    /**
     * Get contributions by user
     */
    public List<Contribution> findByUserId(Long userId) throws SQLException {
        String sql = "SELECT * FROM contributions WHERE user_id = ? " +
                    "ORDER BY created_at DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, userId);
            ResultSet rs = stmt.executeQuery();
            List<Contribution> contributions = new ArrayList<>();

            while (rs.next()) {
                contributions.add(mapResultSetToContribution(rs));
            }
            return contributions;
        }
    }

    /**
     * Get contributor count for a campaign
     */
    public int getContributorCount(Long campaignId) throws SQLException {
        String sql = "SELECT COUNT(DISTINCT user_id) FROM contributions " +
                    "WHERE campaign_id = ? AND payment_status = 'COMPLETED'";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return rs.getInt(1);
            }
            return 0;
        }
    }

    /**
     * Get recent contributions by user in the last hour (for fraud detection)
     */
    public int getRecentContributionCount(Long userId, int hours) throws SQLException {
        String sql = "SELECT COUNT(*) FROM contributions WHERE user_id = ? " +
                    "AND created_at > CURRENT_TIMESTAMP - INTERVAL '" + hours + " hours'";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, userId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return rs.getInt(1);
            }
            return 0;
        }
    }

    /**
     * Map ResultSet to Contribution object
     */
    private Contribution mapResultSetToContribution(ResultSet rs) throws SQLException {
        Contribution contribution = new Contribution();
        contribution.setContributionId(rs.getLong("contribution_id"));
        contribution.setCampaignId(rs.getLong("campaign_id"));
        contribution.setUserId(rs.getLong("user_id"));
        contribution.setAmount(rs.getBigDecimal("amount"));
        contribution.setPaymentStatus(Contribution.PaymentStatus.valueOf(rs.getString("payment_status")));
        contribution.setPaymentMethod(rs.getString("payment_method"));
        contribution.setTransactionId(rs.getString("transaction_id"));
        contribution.setPaymentDetails(rs.getString("payment_details"));
        contribution.setAnonymous(rs.getBoolean("is_anonymous"));
        contribution.setMessage(rs.getString("message"));
        contribution.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());

        Timestamp processedAt = rs.getTimestamp("processed_at");
        if (processedAt != null) {
            contribution.setProcessedAt(processedAt.toLocalDateTime());
        }

        return contribution;
    }
}
