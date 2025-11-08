package com.hotel.booking.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Reservation Entity
 * Represents a room reservation/booking
 */
@Entity
@Table(name = "reservations", indexes = {
    @Index(name = "idx_room_dates", columnList = "room_id, check_in_date, check_out_date"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    @Column(name = "number_of_guests", nullable = false)
    private Integer numberOfGuests;

    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @Column(name = "booking_date")
    private LocalDateTime bookingDate;

    @Column(name = "cancellation_date")
    private LocalDateTime cancellationDate;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "is_refundable")
    private Boolean isRefundable = true;

    @Column(name = "refund_percentage", precision = 5, scale = 2)
    private BigDecimal refundPercentage = BigDecimal.valueOf(100.00);

    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_policy")
    private CancellationPolicy cancellationPolicy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (bookingDate == null) {
            bookingDate = LocalDateTime.now();
        }
        if (cancellationPolicy == null) {
            cancellationPolicy = CancellationPolicy.MODERATE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ReservationStatus {
        PENDING,
        CONFIRMED,
        CANCELLED,
        COMPLETED
    }

    public enum CancellationPolicy {
        FLEXIBLE,   // 1 day notice for full refund
        MODERATE,   // 7 days notice for full refund
        STRICT      // 14 days notice for full refund
    }
}
