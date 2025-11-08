package com.crowdfunding.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Campaign entity representing fundraising campaigns
 */
public class Campaign {
    private Long campaignId;
    private Long creatorId;
    private String title;
    private String description;
    private BigDecimal goalAmount;
    private BigDecimal currentAmount;
    private String category;
    private CampaignStatus status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private boolean isSuspicious;
    private String suspensionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum CampaignStatus {
        ACTIVE, COMPLETED, SUSPENDED, CANCELLED
    }

    // Constructors
    public Campaign() {
        this.currentAmount = BigDecimal.ZERO;
        this.status = CampaignStatus.ACTIVE;
        this.isSuspicious = false;
    }

    public Campaign(Long creatorId, String title, String description,
                   BigDecimal goalAmount, String category, LocalDateTime endDate) {
        this();
        this.creatorId = creatorId;
        this.title = title;
        this.description = description;
        this.goalAmount = goalAmount;
        this.category = category;
        this.endDate = endDate;
    }

    // Getters and Setters
    public Long getCampaignId() {
        return campaignId;
    }

    public void setCampaignId(Long campaignId) {
        this.campaignId = campaignId;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getGoalAmount() {
        return goalAmount;
    }

    public void setGoalAmount(BigDecimal goalAmount) {
        this.goalAmount = goalAmount;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public CampaignStatus getStatus() {
        return status;
    }

    public void setStatus(CampaignStatus status) {
        this.status = status;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    public boolean isSuspicious() {
        return isSuspicious;
    }

    public void setSuspicious(boolean suspicious) {
        isSuspicious = suspicious;
    }

    public String getSuspensionReason() {
        return suspensionReason;
    }

    public void setSuspensionReason(String suspensionReason) {
        this.suspensionReason = suspensionReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Calculate progress percentage
     */
    public double getProgressPercentage() {
        if (goalAmount == null || goalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        return currentAmount.divide(goalAmount, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(new BigDecimal("100"))
                .doubleValue();
    }

    /**
     * Check if campaign has reached its goal
     */
    public boolean hasReachedGoal() {
        return currentAmount.compareTo(goalAmount) >= 0;
    }

    /**
     * Check if campaign is still active and within time frame
     */
    public boolean isActiveAndOngoing() {
        return status == CampaignStatus.ACTIVE &&
               LocalDateTime.now().isBefore(endDate);
    }

    @Override
    public String toString() {
        return "Campaign{" +
                "campaignId=" + campaignId +
                ", title='" + title + '\'' +
                ", goalAmount=" + goalAmount +
                ", currentAmount=" + currentAmount +
                ", category='" + category + '\'' +
                ", status=" + status +
                '}';
    }
}
