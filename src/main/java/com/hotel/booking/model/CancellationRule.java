package com.hotel.booking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Cancellation Rule Entity
 * Defines cancellation policies and refund percentages based on days before check-in
 */
@Entity
@Table(name = "cancellation_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CancellationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_name", nullable = false)
    private String policyName; // FLEXIBLE, MODERATE, STRICT

    @Column(name = "days_before_checkin", nullable = false)
    private Integer daysBeforeCheckin;

    @Column(name = "refund_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal refundPercentage;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
