package com.parking.mlcp.repository;

import com.parking.mlcp.entity.Reservation;
import com.parking.mlcp.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByReservationNumber(String reservationNumber);

    List<Reservation> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    List<Reservation> findByStatus(ReservationStatus status);

    /**
     * Find expired reservations that need to be updated
     */
    @Query("SELECT r FROM Reservation r WHERE r.status = 'CONFIRMED' " +
           "AND r.reservedUntil < :currentTime")
    List<Reservation> findExpiredReservations(@Param("currentTime") LocalDateTime currentTime);

    /**
     * Find conflicting reservations for a slot in a time range
     */
    @Query("SELECT r FROM Reservation r WHERE r.slot.slotId = :slotId " +
           "AND r.status IN ('PENDING', 'CONFIRMED') " +
           "AND ((r.reservedFrom BETWEEN :from AND :until) " +
           "OR (r.reservedUntil BETWEEN :from AND :until) " +
           "OR (:from BETWEEN r.reservedFrom AND r.reservedUntil))")
    List<Reservation> findConflictingReservations(
        @Param("slotId") Long slotId,
        @Param("from") LocalDateTime from,
        @Param("until") LocalDateTime until
    );

    /**
     * Find active reservations (currently in reserved time window)
     */
    @Query("SELECT r FROM Reservation r WHERE r.status = 'CONFIRMED' " +
           "AND :currentTime BETWEEN r.reservedFrom AND r.reservedUntil")
    List<Reservation> findActiveReservations(@Param("currentTime") LocalDateTime currentTime);
}
