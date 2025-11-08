package com.crowdfunding.dao;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.FraudAlert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object for FraudAlert entity
 */
public class FraudAlertDAO {
    private static final Logger logger = LoggerFactory.getLogger(FraudAlertDAO.class);

    /**
     * Create a fraud alert
     */
    public Long createAlert(FraudAlert alert) throws SQLException {
        String sql = "INSERT INTO fraud_alerts (campaign_id, user_id, alert_type, severity, " +
                    "description, metadata, status) VALUES (?, ?, ?, ?::varchar, ?, ?::jsonb, ?::varchar) " +
                    "RETURNING alert_id";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setObject(1, alert.getCampaignId());
            stmt.setObject(2, alert.getUserId());
            stmt.setString(3, alert.getAlertType());
            stmt.setString(4, alert.getSeverity().name());
            stmt.setString(5, alert.getDescription());
            stmt.setString(6, alert.getMetadata());
            stmt.setString(7, alert.getStatus().name());

            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                Long alertId = rs.getLong("alert_id");
                logger.warn("Created fraud alert with ID: {} - Type: {}, Severity: {}",
                    alertId, alert.getAlertType(), alert.getSeverity());
                return alertId;
            }
            throw new SQLException("Failed to create fraud alert");
        }
    }

    /**
     * Get all pending fraud alerts
     */
    public List<FraudAlert> getPendingAlerts() throws SQLException {
        String sql = "SELECT * FROM fraud_alerts WHERE status = 'PENDING' " +
                    "ORDER BY severity DESC, created_at DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement()) {

            ResultSet rs = stmt.executeQuery(sql);
            List<FraudAlert> alerts = new ArrayList<>();

            while (rs.next()) {
                alerts.add(mapResultSetToAlert(rs));
            }
            return alerts;
        }
    }

    /**
     * Get alerts by campaign ID
     */
    public List<FraudAlert> getAlertsByCampaign(Long campaignId) throws SQLException {
        String sql = "SELECT * FROM fraud_alerts WHERE campaign_id = ? " +
                    "ORDER BY created_at DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, campaignId);
            ResultSet rs = stmt.executeQuery();
            List<FraudAlert> alerts = new ArrayList<>();

            while (rs.next()) {
                alerts.add(mapResultSetToAlert(rs));
            }
            return alerts;
        }
    }

    /**
     * Update alert status (Admin action)
     */
    public void updateAlertStatus(Long alertId, FraudAlert.AlertStatus status,
                                  Long reviewedBy) throws SQLException {
        String sql = "UPDATE fraud_alerts SET status = ?::varchar, reviewed_by = ?, " +
                    "reviewed_at = CURRENT_TIMESTAMP WHERE alert_id = ?";

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, status.name());
            stmt.setLong(2, reviewedBy);
            stmt.setLong(3, alertId);

            stmt.executeUpdate();
            logger.info("Updated fraud alert {} to status {} by admin {}", alertId, status, reviewedBy);
        }
    }

    /**
     * Get alerts with high severity
     */
    public List<FraudAlert> getHighSeverityAlerts() throws SQLException {
        String sql = "SELECT * FROM fraud_alerts WHERE severity IN ('HIGH', 'CRITICAL') " +
                    "AND status = 'PENDING' ORDER BY created_at DESC";

        try (Connection conn = DatabaseConfig.getConnection();
             Statement stmt = conn.createStatement()) {

            ResultSet rs = stmt.executeQuery(sql);
            List<FraudAlert> alerts = new ArrayList<>();

            while (rs.next()) {
                alerts.add(mapResultSetToAlert(rs));
            }
            return alerts;
        }
    }

    /**
     * Map ResultSet to FraudAlert object
     */
    private FraudAlert mapResultSetToAlert(ResultSet rs) throws SQLException {
        FraudAlert alert = new FraudAlert();
        alert.setAlertId(rs.getLong("alert_id"));

        Long campaignId = rs.getObject("campaign_id", Long.class);
        alert.setCampaignId(campaignId);

        Long userId = rs.getObject("user_id", Long.class);
        alert.setUserId(userId);

        alert.setAlertType(rs.getString("alert_type"));
        alert.setSeverity(FraudAlert.Severity.valueOf(rs.getString("severity")));
        alert.setDescription(rs.getString("description"));
        alert.setMetadata(rs.getString("metadata"));
        alert.setStatus(FraudAlert.AlertStatus.valueOf(rs.getString("status")));

        Long reviewedBy = rs.getObject("reviewed_by", Long.class);
        alert.setReviewedBy(reviewedBy);

        Timestamp reviewedAt = rs.getTimestamp("reviewed_at");
        if (reviewedAt != null) {
            alert.setReviewedAt(reviewedAt.toLocalDateTime());
        }

        alert.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return alert;
    }
}
