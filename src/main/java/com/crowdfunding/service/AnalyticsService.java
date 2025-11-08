package com.crowdfunding.service;

import com.crowdfunding.config.DatabaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for analytics and reporting
 * Provides insights on campaigns, contributions, and platform metrics
 */
public class AnalyticsService {
    private static final Logger logger = LoggerFactory.getLogger(AnalyticsService.class);

    /**
     * Get platform-wide statistics
     */
    public Map<String, Object> getPlatformStats() throws SQLException {
        String sql = "SELECT " +
                    "COUNT(DISTINCT c.campaign_id) as total_campaigns, " +
                    "COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.campaign_id END) as active_campaigns, " +
                    "COUNT(DISTINCT u.user_id) as total_users, " +
                    "COUNT(DISTINCT cont.contribution_id) as total_contributions, " +
                    "COALESCE(SUM(cont.amount), 0) as total_funds_raised, " +
                    "COALESCE(AVG(cont.amount), 0) as avg_contribution " +
                    "FROM campaigns c " +
                    "CROSS JOIN users u " +
                    "LEFT JOIN contributions cont ON cont.payment_status = 'COMPLETED'";

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            Map<String, Object> stats = new HashMap<>();
            if (rs.next()) {
                stats.put("totalCampaigns", rs.getInt("total_campaigns"));
                stats.put("activeCampaigns", rs.getInt("active_campaigns"));
                stats.put("totalUsers", rs.getInt("total_users"));
                stats.put("totalContributions", rs.getInt("total_contributions"));
                stats.put("totalFundsRaised", rs.getBigDecimal("total_funds_raised"));
                stats.put("avgContribution", rs.getBigDecimal("avg_contribution"));
            }

            logger.info("Platform stats retrieved");
            return stats;
        }
    }

    /**
     * Get top campaigns by total funds raised
     * Uses optimized index: idx_campaigns_current_amount
     */
    public List<Map<String, Object>> getTopCampaignsByFunds(int limit) throws SQLException {
        String sql = "SELECT " +
                    "c.campaign_id, c.title, c.category, c.goal_amount, c.current_amount, " +
                    "c.status, u.username as creator_name, " +
                    "(c.current_amount / NULLIF(c.goal_amount, 0) * 100) as progress_percentage " +
                    "FROM campaigns c " +
                    "JOIN users u ON c.creator_id = u.user_id " +
                    "WHERE c.status = 'ACTIVE' " +
                    "ORDER BY c.current_amount DESC " +
                    "LIMIT ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, limit);
            ResultSet rs = stmt.executeQuery();

            List<Map<String, Object>> topCampaigns = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> campaign = new HashMap<>();
                campaign.put("campaignId", rs.getLong("campaign_id"));
                campaign.put("title", rs.getString("title"));
                campaign.put("category", rs.getString("category"));
                campaign.put("goalAmount", rs.getBigDecimal("goal_amount"));
                campaign.put("currentAmount", rs.getBigDecimal("current_amount"));
                campaign.put("status", rs.getString("status"));
                campaign.put("creatorName", rs.getString("creator_name"));
                campaign.put("progressPercentage", rs.getDouble("progress_percentage"));
                topCampaigns.add(campaign);
            }

            logger.info("Retrieved top {} campaigns by funds", limit);
            return topCampaigns;
        }
    }

    /**
     * Get top campaigns by contributor count
     */
    public List<Map<String, Object>> getTopCampaignsByContributors(int limit) throws SQLException {
        String sql = "SELECT " +
                    "c.campaign_id, c.title, c.category, c.current_amount, " +
                    "COUNT(DISTINCT cont.user_id) as contributor_count, " +
                    "COUNT(cont.contribution_id) as total_contributions " +
                    "FROM campaigns c " +
                    "LEFT JOIN contributions cont ON c.campaign_id = cont.campaign_id " +
                    "  AND cont.payment_status = 'COMPLETED' " +
                    "WHERE c.status = 'ACTIVE' " +
                    "GROUP BY c.campaign_id, c.title, c.category, c.current_amount " +
                    "ORDER BY contributor_count DESC " +
                    "LIMIT ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, limit);
            ResultSet rs = stmt.executeQuery();

            List<Map<String, Object>> topCampaigns = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> campaign = new HashMap<>();
                campaign.put("campaignId", rs.getLong("campaign_id"));
                campaign.put("title", rs.getString("title"));
                campaign.put("category", rs.getString("category"));
                campaign.put("currentAmount", rs.getBigDecimal("current_amount"));
                campaign.put("contributorCount", rs.getInt("contributor_count"));
                campaign.put("totalContributions", rs.getInt("total_contributions"));
                topCampaigns.add(campaign);
            }

            logger.info("Retrieved top {} campaigns by contributors", limit);
            return topCampaigns;
        }
    }

    /**
     * Get campaign analytics by ID
     */
    public Map<String, Object> getCampaignAnalytics(Long campaignId) throws SQLException {
        String sql = "SELECT " +
                    "c.campaign_id, c.title, c.goal_amount, c.current_amount, c.status, " +
                    "COUNT(DISTINCT cont.user_id) as contributor_count, " +
                    "COUNT(cont.contribution_id) as total_contributions, " +
                    "COALESCE(AVG(cont.amount), 0) as avg_contribution, " +
                    "COALESCE(MAX(cont.amount), 0) as largest_contribution, " +
                    "COALESCE(MIN(cont.amount), 0) as smallest_contribution, " +
                    "(c.current_amount / NULLIF(c.goal_amount, 0) * 100) as progress_percentage, " +
                    "EXTRACT(EPOCH FROM (c.end_date - CURRENT_TIMESTAMP)) / 86400 as days_remaining " +
                    "FROM campaigns c " +
                    "LEFT JOIN contributions cont ON c.campaign_id = cont.campaign_id " +
                    "  AND cont.payment_status = 'COMPLETED' " +
                    "WHERE c.campaign_id = ? " +
                    "GROUP BY c.campaign_id, c.title, c.goal_amount, c.current_amount, " +
                    "  c.status, c.end_date";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            ResultSet rs = stmt.executeQuery();

            Map<String, Object> analytics = new HashMap<>();
            if (rs.next()) {
                analytics.put("campaignId", rs.getLong("campaign_id"));
                analytics.put("title", rs.getString("title"));
                analytics.put("goalAmount", rs.getBigDecimal("goal_amount"));
                analytics.put("currentAmount", rs.getBigDecimal("current_amount"));
                analytics.put("status", rs.getString("status"));
                analytics.put("contributorCount", rs.getInt("contributor_count"));
                analytics.put("totalContributions", rs.getInt("total_contributions"));
                analytics.put("avgContribution", rs.getBigDecimal("avg_contribution"));
                analytics.put("largestContribution", rs.getBigDecimal("largest_contribution"));
                analytics.put("smallestContribution", rs.getBigDecimal("smallest_contribution"));
                analytics.put("progressPercentage", rs.getDouble("progress_percentage"));
                analytics.put("daysRemaining", rs.getDouble("days_remaining"));
            }

            logger.info("Campaign analytics retrieved for campaign {}", campaignId);
            return analytics;
        }
    }

    /**
     * Get category-wise statistics
     */
    public List<Map<String, Object>> getCategoryStats() throws SQLException {
        String sql = "SELECT " +
                    "category, " +
                    "COUNT(*) as campaign_count, " +
                    "SUM(current_amount) as total_raised, " +
                    "AVG(current_amount) as avg_raised, " +
                    "SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_count " +
                    "FROM campaigns " +
                    "GROUP BY category " +
                    "ORDER BY total_raised DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            List<Map<String, Object>> categoryStats = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> stat = new HashMap<>();
                stat.put("category", rs.getString("category"));
                stat.put("campaignCount", rs.getInt("campaign_count"));
                stat.put("totalRaised", rs.getBigDecimal("total_raised"));
                stat.put("avgRaised", rs.getBigDecimal("avg_raised"));
                stat.put("activeCount", rs.getInt("active_count"));
                categoryStats.add(stat);
            }

            logger.info("Category statistics retrieved");
            return categoryStats;
        }
    }

    /**
     * Get contribution trends over time
     */
    public List<Map<String, Object>> getContributionTrends(int days) throws SQLException {
        String sql = "SELECT " +
                    "DATE(created_at) as contribution_date, " +
                    "COUNT(*) as contribution_count, " +
                    "SUM(amount) as total_amount, " +
                    "AVG(amount) as avg_amount " +
                    "FROM contributions " +
                    "WHERE payment_status = 'COMPLETED' " +
                    "  AND created_at > CURRENT_TIMESTAMP - INTERVAL '" + days + " days' " +
                    "GROUP BY DATE(created_at) " +
                    "ORDER BY contribution_date DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            List<Map<String, Object>> trends = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> trend = new HashMap<>();
                trend.put("date", rs.getDate("contribution_date"));
                trend.put("contributionCount", rs.getInt("contribution_count"));
                trend.put("totalAmount", rs.getBigDecimal("total_amount"));
                trend.put("avgAmount", rs.getBigDecimal("avg_amount"));
                trends.add(trend);
            }

            logger.info("Contribution trends retrieved for last {} days", days);
            return trends;
        }
    }

    /**
     * Get user contribution statistics
     */
    public Map<String, Object> getUserStats(Long userId) throws SQLException {
        String sql = "SELECT " +
                    "COUNT(DISTINCT campaign_id) as campaigns_supported, " +
                    "COUNT(*) as total_contributions, " +
                    "SUM(amount) as total_contributed, " +
                    "AVG(amount) as avg_contribution, " +
                    "MAX(amount) as largest_contribution " +
                    "FROM contributions " +
                    "WHERE user_id = ? AND payment_status = 'COMPLETED'";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, userId);
            ResultSet rs = stmt.executeQuery();

            Map<String, Object> stats = new HashMap<>();
            if (rs.next()) {
                stats.put("campaignsSupported", rs.getInt("campaigns_supported"));
                stats.put("totalContributions", rs.getInt("total_contributions"));
                stats.put("totalContributed", rs.getBigDecimal("total_contributed"));
                stats.put("avgContribution", rs.getBigDecimal("avg_contribution"));
                stats.put("largestContribution", rs.getBigDecimal("largest_contribution"));
            }

            logger.info("User stats retrieved for user {}", userId);
            return stats;
        }
    }
}
