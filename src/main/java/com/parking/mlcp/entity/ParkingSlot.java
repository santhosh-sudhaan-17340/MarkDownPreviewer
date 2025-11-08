package com.parking.mlcp.entity;

import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.model.VehicleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity representing a parking slot
 * Uses optimistic locking with @Version for concurrent slot allocation
 */
@Entity
@Table(name = "parking_slot",
       indexes = {
           @Index(name = "idx_floor_type_status", columnList = "floor_id, vehicle_type, slot_status")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "slot_id")
    private Long slotId;

    @Column(name = "slot_number", nullable = false, unique = true, length = 20)
    private String slotNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id", nullable = false)
    private ParkingFloor floor;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_status", length = 20)
    private SlotStatus slotStatus = SlotStatus.AVAILABLE;

    @Column(name = "is_ev_charging")
    private Boolean isEvCharging = false;

    @Column(name = "is_vip")
    private Boolean isVip = false;

    @Column(name = "x_coordinate")
    private Integer xCoordinate;

    @Column(name = "y_coordinate")
    private Integer yCoordinate;

    /**
     * Version field for optimistic locking
     * Prevents race conditions during concurrent slot allocations
     */
    @Version
    @Column(name = "version")
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Calculate distance from a given point (typically an entry gate)
     */
    public double calculateDistance(Integer fromX, Integer fromY) {
        if (xCoordinate == null || yCoordinate == null || fromX == null || fromY == null) {
            return Double.MAX_VALUE;
        }
        return Math.sqrt(Math.pow(xCoordinate - fromX, 2) + Math.pow(yCoordinate - fromY, 2));
    }
}
