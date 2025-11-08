package com.crowdfunding;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.Campaign;
import com.crowdfunding.model.Contribution;
import com.crowdfunding.service.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Main application demonstrating the Crowdfunding Platform features
 * This serves as both a demo and integration test
 */
public class CrowdfundingApplication {
    private static final Logger logger = LoggerFactory.getLogger(CrowdfundingApplication.class);
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    private final AuthenticationService authService;
    private final CampaignService campaignService;
    private final ContributionService contributionService;
    private final AnalyticsService analyticsService;
    private final AdminService adminService;

    public CrowdfundingApplication() {
        this.authService = new AuthenticationService();
        this.campaignService = new CampaignService();
        this.contributionService = new ContributionService();
        this.analyticsService = new AnalyticsService();
        this.adminService = new AdminService();
    }

    public static void main(String[] args) {
        CrowdfundingApplication app = new CrowdfundingApplication();

        try {
            logger.info("=== Crowdfunding Platform Demo Started ===\n");

            // 1. User Registration and Authentication
            app.demonstrateAuthentication();

            // 2. Campaign Creation
            app.demonstrateCampaignManagement();

            // 3. Contribution Processing with ACID Transactions
            app.demonstrateContributions();

            // 4. Analytics and Reporting
            app.demonstrateAnalytics();

            // 5. Admin Features - Fraud Detection
            app.demonstrateAdminFeatures();

            logger.info("\n=== Demo Completed Successfully ===");

        } catch (Exception e) {
            logger.error("Demo failed", e);
        } finally {
            DatabaseConfig.close();
        }
    }

    /**
     * Demonstrate user registration and authentication with JWT
     */
    private void demonstrateAuthentication() throws SQLException {
        logger.info("\n--- 1. USER AUTHENTICATION ---");

        // Register new user
        Map<String, Object> registerResponse = authService.register(
            "johndoe",
            "john@example.com",
            "securePassword123",
            "John Doe"
        );

        logger.info("User Registered:");
        logger.info(gson.toJson(registerResponse));

        // Login
        Map<String, Object> loginResponse = authService.login(
            "john@example.com",
            "securePassword123"
        );

        logger.info("\nUser Logged In:");
        logger.info("Token: " + loginResponse.get("token"));
        logger.info("Role: " + loginResponse.get("role"));
    }

    /**
     * Demonstrate campaign creation and management with pagination
     */
    private void demonstrateCampaignManagement() throws SQLException {
        logger.info("\n--- 2. CAMPAIGN MANAGEMENT ---");

        // Create campaign
        Campaign campaign = campaignService.createCampaign(
            1L, // creator ID
            "Save the Ocean - Marine Conservation",
            "Help us protect marine life and clean our oceans. " +
            "Funds will be used for beach cleanups, marine research, and conservation efforts.",
            new BigDecimal("50000.00"),
            "Environment",
            LocalDateTime.now().plusDays(30)
        );

        logger.info("Campaign Created:");
        logger.info("ID: {}, Title: {}, Goal: ${}",
            campaign.getCampaignId(), campaign.getTitle(), campaign.getGoalAmount());

        // Create more campaigns for testing
        campaignService.createCampaign(
            1L,
            "Community Library Project",
            "Building a new community library for children",
            new BigDecimal("25000.00"),
            "Education",
            LocalDateTime.now().plusDays(45)
        );

        campaignService.createCampaign(
            1L,
            "Tech for Seniors",
            "Teaching technology skills to senior citizens",
            new BigDecimal("15000.00"),
            "Technology",
            LocalDateTime.now().plusDays(60)
        );

        // Get paginated campaigns
        Map<String, Object> paginatedCampaigns = campaignService.getCampaignsPaginated(
            0, 10, "ACTIVE", null
        );

        logger.info("\nPaginated Campaigns (Page 1):");
        logger.info("Total: {}, Page Size: {}, Total Pages: {}",
            paginatedCampaigns.get("totalCampaigns"),
            paginatedCampaigns.get("pageSize"),
            paginatedCampaigns.get("totalPages")
        );
    }

    /**
     * Demonstrate contribution processing with JDBC transactions and ACID compliance
     */
    private void demonstrateContributions() throws SQLException {
        logger.info("\n--- 3. CONTRIBUTION PROCESSING (ACID Transactions) ---");

        // Make a contribution
        logger.info("Processing contribution with ACID-compliant transaction...");

        try {
            Contribution contribution = contributionService.contribute(
                1L, // campaign ID
                1L, // user ID
                new BigDecimal("500.00"),
                "CREDIT_CARD",
                false, // not anonymous
                "Great cause! Happy to support."
            );

            logger.info("\nContribution Processed:");
            logger.info("Contribution ID: {}", contribution.getContributionId());
            logger.info("Amount: ${}", contribution.getAmount());
            logger.info("Status: {}", contribution.getPaymentStatus());
            logger.info("Transaction ID: {}", contribution.getTransactionId());
            logger.info("\nACID Properties Demonstrated:");
            logger.info("- Atomicity: Payment and campaign update executed as single unit");
            logger.info("- Consistency: Database constraints maintained throughout");
            logger.info("- Isolation: Transaction isolated from concurrent operations");
            logger.info("- Durability: Changes persisted to database");

        } catch (Exception e) {
            logger.error("Contribution failed (transaction rolled back)", e);
        }

        // Make more contributions for analytics
        try {
            contributionService.contribute(1L, 1L, new BigDecimal("250.00"),
                "PAYPAL", false, "");
            contributionService.contribute(1L, 1L, new BigDecimal("1000.00"),
                "BANK_TRANSFER", true, "Anonymous supporter");
            contributionService.contribute(2L, 1L, new BigDecimal("100.00"),
                "CREDIT_CARD", false, "Supporting education!");
        } catch (Exception e) {
            logger.error("Some contributions failed", e);
        }

        // Get campaign contributions
        List<Contribution> contributions = contributionService.getCampaignContributions(1L, 0, 10);
        logger.info("\nTotal contributions for campaign 1: {}", contributions.size());

        // Get contributor count
        int contributorCount = contributionService.getContributorCount(1L);
        logger.info("Unique contributors: {}", contributorCount);
    }

    /**
     * Demonstrate analytics features
     */
    private void demonstrateAnalytics() throws SQLException {
        logger.info("\n--- 4. ANALYTICS & REPORTING ---");

        // Platform statistics
        Map<String, Object> platformStats = analyticsService.getPlatformStats();
        logger.info("\nPlatform Statistics:");
        logger.info(gson.toJson(platformStats));

        // Top campaigns by funds
        List<Map<String, Object>> topByFunds = analyticsService.getTopCampaignsByFunds(5);
        logger.info("\nTop Campaigns by Funds Raised:");
        for (Map<String, Object> campaign : topByFunds) {
            logger.info("- {}: ${} ({}% of goal)",
                campaign.get("title"),
                campaign.get("currentAmount"),
                String.format("%.1f", campaign.get("progressPercentage"))
            );
        }

        // Top campaigns by contributors
        List<Map<String, Object>> topByContributors =
            analyticsService.getTopCampaignsByContributors(5);
        logger.info("\nTop Campaigns by Contributor Count:");
        for (Map<String, Object> campaign : topByContributors) {
            logger.info("- {}: {} contributors",
                campaign.get("title"),
                campaign.get("contributorCount")
            );
        }

        // Campaign-specific analytics
        Map<String, Object> campaignAnalytics = analyticsService.getCampaignAnalytics(1L);
        logger.info("\nCampaign Analytics (ID: 1):");
        logger.info(gson.toJson(campaignAnalytics));

        // Category statistics
        List<Map<String, Object>> categoryStats = analyticsService.getCategoryStats();
        logger.info("\nCategory Statistics:");
        logger.info(gson.toJson(categoryStats));

        // User statistics
        Map<String, Object> userStats = analyticsService.getUserStats(1L);
        logger.info("\nUser Contribution Statistics:");
        logger.info(gson.toJson(userStats));
    }

    /**
     * Demonstrate admin features including fraud detection and campaign suspension
     */
    private void demonstrateAdminFeatures() throws SQLException {
        logger.info("\n--- 5. ADMIN FEATURES (Fraud Detection & Suspension) ---");

        // Get fraud dashboard
        AdminService.FraudDashboard dashboard = adminService.getFraudDashboard();
        logger.info("\nFraud Detection Dashboard:");
        logger.info("Pending Alerts: {}", dashboard.getPendingCount());
        logger.info("High Severity Alerts: {}", dashboard.getHighSeverityCount());

        // Investigate campaign
        logger.info("\nInvestigating campaigns for fraud patterns...");
        AdminService.FraudDashboard.Severity severity = adminService.investigateCampaign(1L);
        logger.info("Campaign 1 investigation result: {}", severity);

        // Mark campaign as suspicious (demo - don't actually suspend)
        logger.info("\nAdmin can mark campaigns as suspicious for review");
        logger.info("Admin can suspend campaigns with reasons");
        logger.info("Admin can review and resolve fraud alerts");

        // Example: Suspend a campaign (commented out to not affect demo)
        /*
        adminService.suspendCampaign(
            1L,
            "Suspicious activity detected - multiple rapid contributions",
            1L // admin user ID
        );
        logger.info("Campaign suspended by admin");
        */

        logger.info("\nFraud Detection Features:");
        logger.info("- Automatic detection of rapid contributions");
        logger.info("- Large contribution amount alerts");
        logger.info("- Admin dashboard for reviewing alerts");
        logger.info("- Campaign suspension and reactivation");
        logger.info("- Audit logging of all admin actions");
    }
}
