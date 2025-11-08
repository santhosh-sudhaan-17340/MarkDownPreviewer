package com.parking.mlcp.entity;

import com.parking.mlcp.model.ReservationStatus;
import com.parking.mlcp.model.VehicleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity representing a parking reservation
 */
@Entity
@Table(name = "reservation",
       indexes = {
           @Index(name = "idx_status_time", columnList = "status, reserved_from, reserved_until")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "reservation_number", nullable = false, unique = true, length = 50)
    private String reservationNumber;

    @Column(name = "vehicle_number", nullable = false, length = 20)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id")
    private ParkingSlot slot;

    @Column(name = "user_email", length = 100)
    private String userEmail;

    @Column(name = "user_phone", length = 20)
    private String userPhone;

    @Column(name = "reserved_from", nullable = false)
    private LocalDateTime reservedFrom;

    @Column(name = "reserved_until", nullable = false)
    private LocalDateTime reservedUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Check if reservation has expired
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(reservedUntil) &&
               status == ReservationStatus.CONFIRMED;
    }

    /**
     * Check if reservation is currently active
     */
    public boolean isActive() {
        LocalDateTime now = LocalDateTime.now();
        return status == ReservationStatus.CONFIRMED &&
               now.isAfter(reservedFrom) &&
               now.isBefore(reservedUntil);
    }
}
