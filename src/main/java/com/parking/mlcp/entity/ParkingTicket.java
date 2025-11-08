package com.parking.mlcp.entity;

import com.parking.mlcp.model.TicketStatus;
import com.parking.mlcp.model.VehicleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing a parking ticket
 */
@Entity
@Table(name = "parking_ticket",
       indexes = {
           @Index(name = "idx_vehicle_number", columnList = "vehicle_number"),
           @Index(name = "idx_status", columnList = "status")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ticket_id")
    private Long ticketId;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 50)
    private String ticketNumber;

    @Column(name = "vehicle_number", nullable = false, length = 20)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gate_id", nullable = false)
    private EntryGate entryGate;

    @Column(name = "entry_time", nullable = false)
    private LocalDateTime entryTime;

    @Column(name = "exit_time")
    private LocalDateTime exitTime;

    @Column(name = "parking_fee", precision = 10, scale = 2)
    private BigDecimal parkingFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private TicketStatus status = TicketStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (entryTime == null) {
            entryTime = LocalDateTime.now();
        }
    }

    /**
     * Calculate parking duration in hours
     */
    public long getParkingDurationInHours() {
        LocalDateTime endTime = exitTime != null ? exitTime : LocalDateTime.now();
        return java.time.Duration.between(entryTime, endTime).toHours();
    }

    /**
     * Calculate parking duration in minutes
     */
    public long getParkingDurationInMinutes() {
        LocalDateTime endTime = exitTime != null ? exitTime : LocalDateTime.now();
        return java.time.Duration.between(entryTime, endTime).toMinutes();
    }
}
