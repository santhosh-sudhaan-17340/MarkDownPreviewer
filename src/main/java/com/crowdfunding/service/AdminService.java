package com.crowdfunding.service;

import com.crowdfunding.dao.CampaignDAO;
import com.crowdfunding.dao.FraudAlertDAO;
import com.crowdfunding.model.Campaign;
import com.crowdfunding.model.FraudAlert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/**
 * Admin service for fraud detection and campaign management
 */
public class AdminService {
    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    private final CampaignDAO campaignDAO;
    private final FraudAlertDAO fraudAlertDAO;

    public AdminService() {
        this.campaignDAO = new CampaignDAO();
        this.fraudAlertDAO = new FraudAlertDAO();
    }

    /**
     * Suspend a campaign (Admin action)
     */
    public void suspendCampaign(Long campaignId, String reason, Long adminId)
            throws SQLException {

        // Verify campaign exists
        Optional<Campaign> campaignOpt = campaignDAO.findById(campaignId);
        if (!campaignOpt.isPresent()) {
            throw new IllegalArgumentException("Campaign not found");
        }

        Campaign campaign = campaignOpt.get();
        if (campaign.getStatus() == Campaign.CampaignStatus.SUSPENDED) {
            throw new IllegalArgumentException("Campaign is already suspended");
        }

        // Suspend the campaign
        campaignDAO.suspendCampaign(campaignId, reason);

        // Create fraud alert if not already exists
        FraudAlert alert = new FraudAlert();
        alert.setCampaignId(campaignId);
        alert.setAlertType("ADMIN_SUSPENSION");
        alert.setSeverity(FraudAlert.Severity.HIGH);
        alert.setDescription("Campaign suspended by admin: " + reason);
        alert.setStatus(FraudAlert.AlertStatus.RESOLVED);
        alert.setReviewedBy(adminId);

        fraudAlertDAO.createAlert(alert);

        logger.warn("Campaign {} suspended by admin {} - Reason: {}", campaignId, adminId, reason);
    }

    /**
     * Reactivate a suspended campaign (Admin action)
     */
    public void reactivateCampaign(Long campaignId, Long adminId) throws SQLException {
        Optional<Campaign> campaignOpt = campaignDAO.findById(campaignId);
        if (!campaignOpt.isPresent()) {
            throw new IllegalArgumentException("Campaign not found");
        }

        Campaign campaign = campaignOpt.get();
        if (campaign.getStatus() != Campaign.CampaignStatus.SUSPENDED) {
            throw new IllegalArgumentException("Campaign is not suspended");
        }

        campaignDAO.reactivateCampaign(campaignId);
        logger.info("Campaign {} reactivated by admin {}", campaignId, adminId);
    }

    /**
     * Get all pending fraud alerts
     */
    public List<FraudAlert> getPendingFraudAlerts() throws SQLException {
        return fraudAlertDAO.getPendingAlerts();
    }

    /**
     * Get high severity fraud alerts
     */
    public List<FraudAlert> getHighSeverityAlerts() throws SQLException {
        return fraudAlertDAO.getHighSeverityAlerts();
    }

    /**
     * Get fraud alerts for a specific campaign
     */
    public List<FraudAlert> getCampaignFraudAlerts(Long campaignId) throws SQLException {
        return fraudAlertDAO.getAlertsByCampaign(campaignId);
    }

    /**
     * Review and resolve fraud alert
     */
    public void reviewFraudAlert(Long alertId, FraudAlert.AlertStatus newStatus, Long adminId)
            throws SQLException {

        if (newStatus == FraudAlert.AlertStatus.PENDING) {
            throw new IllegalArgumentException("Cannot set status back to PENDING");
        }

        fraudAlertDAO.updateAlertStatus(alertId, newStatus, adminId);
        logger.info("Fraud alert {} reviewed by admin {} - New status: {}", alertId, adminId, newStatus);
    }

    /**
     * Investigate campaign for fraud patterns
     * This could be expanded with more sophisticated fraud detection algorithms
     */
    public FraudAlert.Severity investigateCampaign(Long campaignId) throws SQLException {
        Optional<Campaign> campaignOpt = campaignDAO.findById(campaignId);
        if (!campaignOpt.isPresent()) {
            throw new IllegalArgumentException("Campaign not found");
        }

        Campaign campaign = campaignOpt.get();
        FraudAlert.Severity severity = FraudAlert.Severity.LOW;

        // Check for suspicious patterns
        List<FraudAlert> alerts = fraudAlertDAO.getAlertsByCampaign(campaignId);

        if (alerts.size() > 5) {
            severity = FraudAlert.Severity.HIGH;
        } else if (alerts.size() > 2) {
            severity = FraudAlert.Severity.MEDIUM;
        }

        // Check if campaign has unrealistic goals or suspicious activity
        if (campaign.isSuspicious()) {
            severity = FraudAlert.Severity.HIGH;
        }

        logger.info("Campaign {} investigated - Severity: {}, Alert count: {}",
            campaignId, severity, alerts.size());

        return severity;
    }

    /**
     * Mark campaign as suspicious (triggers manual review)
     */
    public void markCampaignSuspicious(Long campaignId, String reason, Long adminId)
            throws SQLException {

        // Create fraud alert
        FraudAlert alert = new FraudAlert();
        alert.setCampaignId(campaignId);
        alert.setAlertType("MANUAL_REVIEW");
        alert.setSeverity(FraudAlert.Severity.MEDIUM);
        alert.setDescription("Marked for review: " + reason);
        alert.setStatus(FraudAlert.AlertStatus.PENDING);

        fraudAlertDAO.createAlert(alert);

        logger.warn("Campaign {} marked as suspicious by admin {} - Reason: {}",
            campaignId, adminId, reason);
    }

    /**
     * Get fraud detection dashboard data
     */
    public FraudDashboard getFraudDashboard() throws SQLException {
        List<FraudAlert> pendingAlerts = fraudAlertDAO.getPendingAlerts();
        List<FraudAlert> highSeverityAlerts = fraudAlertDAO.getHighSeverityAlerts();

        FraudDashboard dashboard = new FraudDashboard();
        dashboard.setPendingAlerts(pendingAlerts);
        dashboard.setHighSeverityAlerts(highSeverityAlerts);
        dashboard.setPendingCount(pendingAlerts.size());
        dashboard.setHighSeverityCount(highSeverityAlerts.size());

        return dashboard;
    }

    /**
     * Fraud dashboard data class
     */
    public static class FraudDashboard {
        private List<FraudAlert> pendingAlerts;
        private List<FraudAlert> highSeverityAlerts;
        private int pendingCount;
        private int highSeverityCount;

        public List<FraudAlert> getPendingAlerts() {
            return pendingAlerts;
        }

        public void setPendingAlerts(List<FraudAlert> pendingAlerts) {
            this.pendingAlerts = pendingAlerts;
        }

        public List<FraudAlert> getHighSeverityAlerts() {
            return highSeverityAlerts;
        }

        public void setHighSeverityAlerts(List<FraudAlert> highSeverityAlerts) {
            this.highSeverityAlerts = highSeverityAlerts;
        }

        public int getPendingCount() {
            return pendingCount;
        }

        public void setPendingCount(int pendingCount) {
            this.pendingCount = pendingCount;
        }

        public int getHighSeverityCount() {
            return highSeverityCount;
        }

        public void setHighSeverityCount(int highSeverityCount) {
            this.highSeverityCount = highSeverityCount;
        }
    }
}
