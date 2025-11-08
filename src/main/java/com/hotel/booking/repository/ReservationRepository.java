package com.hotel.booking.repository;

import com.hotel.booking.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

/**
 * Reservation Repository
 * Data access layer for Reservation entity with conflict detection
 */
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByUserId(Long userId);

    List<Reservation> findByStatus(Reservation.ReservationStatus status);

    List<Reservation> findByUserIdAndStatus(Long userId, Reservation.ReservationStatus status);

    /**
     * Check if there are any conflicting reservations for a room in the given date range
     * A conflict exists if there's any CONFIRMED or PENDING reservation that overlaps with the date range
     */
    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.room.id = :roomId " +
           "AND r.status IN ('CONFIRMED', 'PENDING') " +
           "AND r.checkInDate < :checkOutDate " +
           "AND r.checkOutDate > :checkInDate")
    boolean hasConflictingReservation(
        @Param("roomId") Long roomId,
        @Param("checkInDate") LocalDate checkInDate,
        @Param("checkOutDate") LocalDate checkOutDate
    );

    /**
     * Find all conflicting reservations for a room in the given date range
     */
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.room.id = :roomId " +
           "AND r.status IN ('CONFIRMED', 'PENDING') " +
           "AND r.checkInDate < :checkOutDate " +
           "AND r.checkOutDate > :checkInDate")
    List<Reservation> findConflictingReservations(
        @Param("roomId") Long roomId,
        @Param("checkInDate") LocalDate checkInDate,
        @Param("checkOutDate") LocalDate checkOutDate
    );

    /**
     * Find reservations for a specific room
     */
    List<Reservation> findByRoomId(Long roomId);

    /**
     * Find upcoming reservations for a user
     */
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.user.id = :userId " +
           "AND r.checkInDate >= :currentDate " +
           "AND r.status IN ('CONFIRMED', 'PENDING') " +
           "ORDER BY r.checkInDate ASC")
    List<Reservation> findUpcomingReservations(
        @Param("userId") Long userId,
        @Param("currentDate") LocalDate currentDate
    );

    /**
     * Find reservations by date range
     */
    @Query("SELECT r FROM Reservation r " +
           "WHERE r.checkInDate >= :startDate " +
           "AND r.checkOutDate <= :endDate " +
           "ORDER BY r.checkInDate ASC")
    List<Reservation> findByDateRange(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
