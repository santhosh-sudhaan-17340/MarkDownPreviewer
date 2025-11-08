package com.parking.mlcp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity representing maintenance alerts for parking slots
 */
@Entity
@Table(name = "maintenance_alert")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Long alertId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    @Column(name = "alert_type", length = 50)
    private String alertType; // CLEANING, REPAIR, INSPECTION

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "severity", length = 20)
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "status", length = 20)
    private String status = "OPEN"; // OPEN, IN_PROGRESS, RESOLVED

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
