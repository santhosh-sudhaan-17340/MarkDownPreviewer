package com.crowdfunding.dao;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.Campaign;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data Access Object for Campaign entity with optimized queries using indexes
 */
public class CampaignDAO {
    private static final Logger logger = LoggerFactory.getLogger(CampaignDAO.class);

    /**
     * Create a new campaign
     */
    public Long createCampaign(Campaign campaign) throws SQLException {
        String sql = "INSERT INTO campaigns (creator_id, title, description, goal_amount, " +
                    "category, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?::varchar) " +
                    "RETURNING campaign_id";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaign.getCreatorId());
            stmt.setString(2, campaign.getTitle());
            stmt.setString(3, campaign.getDescription());
            stmt.setBigDecimal(4, campaign.getGoalAmount());
            stmt.setString(5, campaign.getCategory());
            stmt.setTimestamp(6, Timestamp.valueOf(campaign.getEndDate()));
            stmt.setString(7, campaign.getStatus().name());

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                Long campaignId = rs.getLong("campaign_id");
                logger.info("Created campaign with ID: {}", campaignId);
                return campaignId;
            }
            throw new SQLException("Failed to create campaign, no ID returned");
        }
    }

    /**
     * Find campaign by ID
     */
    public Optional<Campaign> findById(Long campaignId) throws SQLException {
        String sql = "SELECT * FROM campaigns WHERE campaign_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                return Optional.of(mapResultSetToCampaign(rs));
            }
            return Optional.empty();
        }
    }

    /**
     * Get paginated campaigns with filtering (uses index idx_campaigns_status_created)
     */
    public List<Campaign> findAllPaginated(int page, int pageSize, String status, String category) throws SQLException {
        StringBuilder sql = new StringBuilder(
            "SELECT * FROM campaigns WHERE 1=1"
        );

        if (status != null && !status.isEmpty()) {
            sql.append(" AND status = ?::varchar");
        }
        if (category != null && !category.isEmpty()) {
            sql.append(" AND category = ?");
        }

        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            int paramIndex = 1;

            if (status != null && !status.isEmpty()) {
                stmt.setString(paramIndex++, status);
            }
            if (category != null && !category.isEmpty()) {
                stmt.setString(paramIndex++, category);
            }

            stmt.setInt(paramIndex++, pageSize);
            stmt.setInt(paramIndex, page * pageSize);

            ResultSet rs = stmt.executeQuery();
            List<Campaign> campaigns = new ArrayList<>();

            while (rs.next()) {
                campaigns.add(mapResultSetToCampaign(rs));
            }

            logger.debug("Retrieved {} campaigns for page {}", campaigns.size(), page);
            return campaigns;
        }
    }

    /**
     * Get campaigns by creator ID
     */
    public List<Campaign> findByCreatorId(Long creatorId) throws SQLException {
        String sql = "SELECT * FROM campaigns WHERE creator_id = ? ORDER BY created_at DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, creatorId);
            ResultSet rs = stmt.executeQuery();
            List<Campaign> campaigns = new ArrayList<>();

            while (rs.next()) {
                campaigns.add(mapResultSetToCampaign(rs));
            }
            return campaigns;
        }
    }

    /**
     * Update campaign
     */
    public void updateCampaign(Campaign campaign) throws SQLException {
        String sql = "UPDATE campaigns SET title = ?, description = ?, goal_amount = ?, " +
                    "category = ?, status = ?::varchar, end_date = ?, updated_at = CURRENT_TIMESTAMP " +
                    "WHERE campaign_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, campaign.getTitle());
            stmt.setString(2, campaign.getDescription());
            stmt.setBigDecimal(3, campaign.getGoalAmount());
            stmt.setString(4, campaign.getCategory());
            stmt.setString(5, campaign.getStatus().name());
            stmt.setTimestamp(6, Timestamp.valueOf(campaign.getEndDate()));
            stmt.setLong(7, campaign.getCampaignId());

            stmt.executeUpdate();
            logger.info("Updated campaign ID: {}", campaign.getCampaignId());
        }
    }

    /**
     * Suspend campaign (Admin action)
     */
    public void suspendCampaign(Long campaignId, String reason) throws SQLException {
        String sql = "UPDATE campaigns SET status = 'SUSPENDED', is_suspicious = true, " +
                    "suspension_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, reason);
            stmt.setLong(2, campaignId);

            int affected = stmt.executeUpdate();
            if (affected > 0) {
                logger.warn("Suspended campaign ID: {} for reason: {}", campaignId, reason);
            }
        }
    }

    /**
     * Reactivate suspended campaign (Admin action)
     */
    public void reactivateCampaign(Long campaignId) throws SQLException {
        String sql = "UPDATE campaigns SET status = 'ACTIVE', is_suspicious = false, " +
                    "suspension_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            stmt.executeUpdate();
            logger.info("Reactivated campaign ID: {}", campaignId);
        }
    }

    /**
     * Get top campaigns by amount raised (uses index idx_campaigns_current_amount)
     */
    public List<Campaign> getTopCampaigns(int limit) throws SQLException {
        String sql = "SELECT * FROM campaigns WHERE status = 'ACTIVE' " +
                    "ORDER BY current_amount DESC LIMIT ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, limit);
            ResultSet rs = stmt.executeQuery();
            List<Campaign> campaigns = new ArrayList<>();

            while (rs.next()) {
                campaigns.add(mapResultSetToCampaign(rs));
            }
            return campaigns;
        }
    }

    /**
     * Search campaigns by title or description
     */
    public List<Campaign> searchCampaigns(String searchTerm, int limit) throws SQLException {
        String sql = "SELECT * FROM campaigns WHERE status = 'ACTIVE' AND " +
                    "(title ILIKE ? OR description ILIKE ?) " +
                    "ORDER BY created_at DESC LIMIT ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            String pattern = "%" + searchTerm + "%";
            stmt.setString(1, pattern);
            stmt.setString(2, pattern);
            stmt.setInt(3, limit);

            ResultSet rs = stmt.executeQuery();
            List<Campaign> campaigns = new ArrayList<>();

            while (rs.next()) {
                campaigns.add(mapResultSetToCampaign(rs));
            }
            return campaigns;
        }
    }

    /**
     * Get total campaign count
     */
    public int getTotalCount(String status, String category) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM campaigns WHERE 1=1");

        if (status != null && !status.isEmpty()) {
            sql.append(" AND status = ?::varchar");
        }
        if (category != null && !category.isEmpty()) {
            sql.append(" AND category = ?");
        }

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            int paramIndex = 1;
            if (status != null && !status.isEmpty()) {
                stmt.setString(paramIndex++, status);
            }
            if (category != null && !category.isEmpty()) {
                stmt.setString(paramIndex, category);
            }

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
            return 0;
        }
    }

    /**
     * Map ResultSet to Campaign object
     */
    private Campaign mapResultSetToCampaign(ResultSet rs) throws SQLException {
        Campaign campaign = new Campaign();
        campaign.setCampaignId(rs.getLong("campaign_id"));
        campaign.setCreatorId(rs.getLong("creator_id"));
        campaign.setTitle(rs.getString("title"));
        campaign.setDescription(rs.getString("description"));
        campaign.setGoalAmount(rs.getBigDecimal("goal_amount"));
        campaign.setCurrentAmount(rs.getBigDecimal("current_amount"));
        campaign.setCategory(rs.getString("category"));
        campaign.setStatus(Campaign.CampaignStatus.valueOf(rs.getString("status")));
        campaign.setStartDate(rs.getTimestamp("start_date").toLocalDateTime());
        campaign.setEndDate(rs.getTimestamp("end_date").toLocalDateTime());
        campaign.setSuspicious(rs.getBoolean("is_suspicious"));
        campaign.setSuspensionReason(rs.getString("suspension_reason"));
        campaign.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        campaign.setUpdatedAt(rs.getTimestamp("updated_at").toLocalDateTime());
        return campaign;
    }
}
