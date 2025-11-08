package com.crowdfunding.service;

import com.crowdfunding.dao.CampaignDAO;
import com.crowdfunding.model.Campaign;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for managing campaigns with pagination and optimization
 */
public class CampaignService {
    private static final Logger logger = LoggerFactory.getLogger(CampaignService.class);
    private final CampaignDAO campaignDAO;

    public CampaignService() {
        this.campaignDAO = new CampaignDAO();
    }

    /**
     * Create a new campaign
     */
    public Campaign createCampaign(Long creatorId, String title, String description,
                                  BigDecimal goalAmount, String category, LocalDateTime endDate)
            throws SQLException {

        // Validate input
        validateCampaignInput(title, description, goalAmount, category, endDate);

        Campaign campaign = new Campaign(creatorId, title, description, goalAmount, category, endDate);
        campaign.setStartDate(LocalDateTime.now());

        Long campaignId = campaignDAO.createCampaign(campaign);
        campaign.setCampaignId(campaignId);

        logger.info("Campaign created - ID: {}, Title: {}, Creator: {}", campaignId, title, creatorId);

        return campaign;
    }

    /**
     * Get campaign by ID
     */
    public Optional<Campaign> getCampaignById(Long campaignId) throws SQLException {
        return campaignDAO.findById(campaignId);
    }

    /**
     * Get paginated list of campaigns with filtering
     * Uses optimized database indexes for performance
     */
    public Map<String, Object> getCampaignsPaginated(int page, int pageSize,
                                                     String status, String category)
            throws SQLException {

        // Validate pagination parameters
        if (page < 0) page = 0;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        // Get campaigns using indexed query
        List<Campaign> campaigns = campaignDAO.findAllPaginated(page, pageSize, status, category);

        // Get total count for pagination
        int totalCount = campaignDAO.getTotalCount(status, category);
        int totalPages = (int) Math.ceil((double) totalCount / pageSize);

        Map<String, Object> response = new HashMap<>();
        response.put("campaigns", campaigns);
        response.put("currentPage", page);
        response.put("pageSize", pageSize);
        response.put("totalCampaigns", totalCount);
        response.put("totalPages", totalPages);
        response.put("hasNext", page < totalPages - 1);
        response.put("hasPrevious", page > 0);

        logger.debug("Retrieved paginated campaigns - Page: {}, Size: {}, Total: {}",
            page, pageSize, totalCount);

        return response;
    }

    /**
     * Get campaigns by creator
     */
    public List<Campaign> getCampaignsByCreator(Long creatorId) throws SQLException {
        return campaignDAO.findByCreatorId(creatorId);
    }

    /**
     * Update campaign
     */
    public Campaign updateCampaign(Long campaignId, String title, String description,
                                  BigDecimal goalAmount, String category, LocalDateTime endDate)
            throws SQLException {

        Optional<Campaign> existingOpt = campaignDAO.findById(campaignId);
        if (!existingOpt.isPresent()) {
            throw new IllegalArgumentException("Campaign not found");
        }

        Campaign campaign = existingOpt.get();

        if (title != null && !title.trim().isEmpty()) {
            campaign.setTitle(title);
        }
        if (description != null && !description.trim().isEmpty()) {
            campaign.setDescription(description);
        }
        if (goalAmount != null && goalAmount.compareTo(BigDecimal.ZERO) > 0) {
            campaign.setGoalAmount(goalAmount);
        }
        if (category != null && !category.trim().isEmpty()) {
            campaign.setCategory(category);
        }
        if (endDate != null && endDate.isAfter(LocalDateTime.now())) {
            campaign.setEndDate(endDate);
        }

        campaignDAO.updateCampaign(campaign);
        logger.info("Campaign updated - ID: {}", campaignId);

        return campaign;
    }

    /**
     * Search campaigns by keyword
     */
    public List<Campaign> searchCampaigns(String keyword, int limit) throws SQLException {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException("Search keyword is required");
        }
        return campaignDAO.searchCampaigns(keyword, limit);
    }

    /**
     * Get top campaigns by amount raised (for analytics)
     */
    public List<Campaign> getTopCampaigns(int limit) throws SQLException {
        if (limit <= 0 || limit > 100) limit = 10;
        return campaignDAO.getTopCampaigns(limit);
    }

    /**
     * Check if user is campaign creator
     */
    public boolean isCreator(Long campaignId, Long userId) throws SQLException {
        Optional<Campaign> campaignOpt = campaignDAO.findById(campaignId);
        return campaignOpt.isPresent() && campaignOpt.get().getCreatorId().equals(userId);
    }

    /**
     * Validate campaign input
     */
    private void validateCampaignInput(String title, String description,
                                      BigDecimal goalAmount, String category,
                                      LocalDateTime endDate) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Campaign title is required");
        }
        if (title.length() > 200) {
            throw new IllegalArgumentException("Title is too long (max 200 characters)");
        }
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Campaign description is required");
        }
        if (goalAmount == null || goalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Goal amount must be greater than zero");
        }
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Category is required");
        }
        if (endDate == null || endDate.isBefore(LocalDateTime.now().plusDays(1))) {
            throw new IllegalArgumentException("End date must be at least 1 day in the future");
        }
    }
}
