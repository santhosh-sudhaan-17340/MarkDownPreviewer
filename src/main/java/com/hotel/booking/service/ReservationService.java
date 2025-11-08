package com.hotel.booking.service;

import com.hotel.booking.exception.ReservationConflictException;
import com.hotel.booking.exception.ResourceNotFoundException;
import com.hotel.booking.model.Reservation;
import com.hotel.booking.model.Room;
import com.hotel.booking.model.User;
import com.hotel.booking.model.AuditLog;
import com.hotel.booking.repository.ReservationRepository;
import com.hotel.booking.repository.RoomRepository;
import com.hotel.booking.repository.UserRepository;
import com.hotel.booking.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Reservation Service
 * Handles reservation business logic including conflict detection
 */
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Create a new reservation with conflict detection
     */
    @Transactional
    public Reservation createReservation(Long roomId, Long userId, LocalDate checkInDate,
                                        LocalDate checkOutDate, Integer numberOfGuests,
                                        Reservation.CancellationPolicy cancellationPolicy) {
        // Validate inputs
        if (checkInDate.isAfter(checkOutDate) || checkInDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Invalid check-in or check-out dates");
        }

        // Check if room exists
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        // Check if user exists
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Validate number of guests
        if (numberOfGuests > room.getMaxOccupancy()) {
            throw new IllegalArgumentException("Number of guests exceeds room capacity");
        }

        // Check for conflicts - CRITICAL: This prevents double booking
        if (reservationRepository.hasConflictingReservation(roomId, checkInDate, checkOutDate)) {
            List<Reservation> conflicts = reservationRepository.findConflictingReservations(
                roomId, checkInDate, checkOutDate);
            throw new ReservationConflictException(
                "Room is already reserved for the selected dates. Found " +
                conflicts.size() + " conflicting reservation(s)");
        }

        // Calculate total price
        long nights = ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        BigDecimal totalPrice = room.getCurrentPrice().multiply(BigDecimal.valueOf(nights));

        // Create reservation
        Reservation reservation = new Reservation();
        reservation.setRoom(room);
        reservation.setUser(user);
        reservation.setCheckInDate(checkInDate);
        reservation.setCheckOutDate(checkOutDate);
        reservation.setNumberOfGuests(numberOfGuests);
        reservation.setTotalPrice(totalPrice);
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        reservation.setCancellationPolicy(cancellationPolicy != null ?
            cancellationPolicy : Reservation.CancellationPolicy.MODERATE);

        Reservation savedReservation = reservationRepository.save(reservation);

        // Create audit log
        createAuditLog("RESERVATION", savedReservation.getId(), "CREATE",
            "Reservation created for room " + roomId + " from " + checkInDate + " to " + checkOutDate,
            "SYSTEM");

        return savedReservation;
    }

    /**
     * Confirm a pending reservation
     */
    @Transactional
    public Reservation confirmReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + reservationId));

        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            throw new IllegalStateException("Only pending reservations can be confirmed");
        }

        // Double-check for conflicts before confirming
        if (reservationRepository.hasConflictingReservation(
                reservation.getRoom().getId(),
                reservation.getCheckInDate(),
                reservation.getCheckOutDate())) {
            throw new ReservationConflictException("Cannot confirm: conflicting reservation exists");
        }

        reservation.setStatus(Reservation.ReservationStatus.CONFIRMED);
        Reservation savedReservation = reservationRepository.save(reservation);

        createAuditLog("RESERVATION", reservationId, "UPDATE",
            "Reservation confirmed", "SYSTEM");

        return savedReservation;
    }

    /**
     * Get all reservations for a user
     */
    public List<Reservation> getUserReservations(Long userId) {
        return reservationRepository.findByUserId(userId);
    }

    /**
     * Get upcoming reservations for a user
     */
    public List<Reservation> getUpcomingReservations(Long userId) {
        return reservationRepository.findUpcomingReservations(userId, LocalDate.now());
    }

    /**
     * Get reservation by id
     */
    public Reservation getReservationById(Long id) {
        return reservationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Reservation not found with id: " + id));
    }

    /**
     * Get all reservations for a room
     */
    public List<Reservation> getRoomReservations(Long roomId) {
        return reservationRepository.findByRoomId(roomId);
    }

    /**
     * Check if a room is available for a date range
     */
    public boolean isRoomAvailable(Long roomId, LocalDate checkInDate, LocalDate checkOutDate) {
        return !reservationRepository.hasConflictingReservation(roomId, checkInDate, checkOutDate);
    }

    /**
     * Find conflicting reservations
     */
    public List<Reservation> findConflicts(Long roomId, LocalDate checkInDate, LocalDate checkOutDate) {
        return reservationRepository.findConflictingReservations(roomId, checkInDate, checkOutDate);
    }

    /**
     * Create audit log entry
     */
    private void createAuditLog(String entityType, Long entityId, String action,
                               String details, String performedBy) {
        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setPerformedBy(performedBy);
        auditLogRepository.save(auditLog);
    }
}
