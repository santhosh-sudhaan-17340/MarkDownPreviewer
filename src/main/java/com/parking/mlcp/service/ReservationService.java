package com.parking.mlcp.service;

import com.parking.mlcp.dto.ReservationRequest;
import com.parking.mlcp.dto.ReservationResponse;
import com.parking.mlcp.entity.ParkingSlot;
import com.parking.mlcp.entity.Reservation;
import com.parking.mlcp.exception.ParkingException;
import com.parking.mlcp.exception.ResourceNotFoundException;
import com.parking.mlcp.model.ReservationStatus;
import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.repository.ParkingSlotRepository;
import com.parking.mlcp.repository.ReservationRepository;
import com.parking.mlcp.util.TicketNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing online reservations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final SlotAllocationService slotAllocationService;
    private final ParkingSlotRepository slotRepository;

    /**
     * Create a new reservation
     */
    @Transactional
    public ReservationResponse createReservation(ReservationRequest request) {
        log.info("Creating reservation for vehicle: {}", request.getVehicleNumber());

        // Validate time range
        if (request.getReservedUntil().isBefore(request.getReservedFrom())) {
            throw new ParkingException("End time must be after start time");
        }

        Duration duration = Duration.between(request.getReservedFrom(), request.getReservedUntil());
        if (duration.toHours() > 24) {
            throw new ParkingException("Maximum reservation duration is 24 hours");
        }

        // Allocate slot for reservation
        ParkingSlot slot = slotAllocationService.reserveSlot(
                request.getVehicleType(),
                request.getRequiresEvCharging(),
                request.getIsVip(),
                request.getPreferredFloorId()
        );

        // Check for conflicting reservations
        List<Reservation> conflicts = reservationRepository.findConflictingReservations(
                slot.getSlotId(),
                request.getReservedFrom(),
                request.getReservedUntil()
        );

        if (!conflicts.isEmpty()) {
            // Release the slot and throw exception
            slot.setSlotStatus(SlotStatus.AVAILABLE);
            slotRepository.save(slot);
            throw new ParkingException("Slot has conflicting reservations");
        }

        // Create reservation
        Reservation reservation = Reservation.builder()
                .reservationNumber(TicketNumberGenerator.generateReservationNumber())
                .vehicleNumber(request.getVehicleNumber())
                .vehicleType(request.getVehicleType())
                .slot(slot)
                .userEmail(request.getUserEmail())
                .userPhone(request.getUserPhone())
                .reservedFrom(request.getReservedFrom())
                .reservedUntil(request.getReservedUntil())
                .status(ReservationStatus.CONFIRMED)
                .build();

        reservation = reservationRepository.save(reservation);

        log.info("Reservation created: {} for slot {}", reservation.getReservationNumber(), slot.getSlotNumber());

        return ReservationResponse.builder()
                .reservationNumber(reservation.getReservationNumber())
                .vehicleNumber(reservation.getVehicleNumber())
                .slotNumber(slot.getSlotNumber())
                .floorNumber(slot.getFloor().getFloorNumber())
                .reservedFrom(reservation.getReservedFrom())
                .reservedUntil(reservation.getReservedUntil())
                .status(reservation.getStatus())
                .message("Reservation confirmed. Please arrive between " +
                        reservation.getReservedFrom() + " and " + reservation.getReservedUntil())
                .build();
    }

    /**
     * Cancel a reservation
     */
    @Transactional
    public void cancelReservation(String reservationNumber) {
        Reservation reservation = reservationRepository.findByReservationNumber(reservationNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found"));

        if (reservation.getStatus() == ReservationStatus.COMPLETED ||
                reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new ParkingException("Reservation cannot be cancelled");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // Release the slot
        ParkingSlot slot = reservation.getSlot();
        slot.setSlotStatus(SlotStatus.AVAILABLE);
        slotRepository.save(slot);

        log.info("Reservation cancelled: {}", reservationNumber);
    }

    /**
     * Get reservation details
     */
    @Transactional(readOnly = true)
    public Reservation getReservation(String reservationNumber) {
        return reservationRepository.findByReservationNumber(reservationNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found"));
    }

    /**
     * Get user reservations
     */
    @Transactional(readOnly = true)
    public List<Reservation> getUserReservations(String email) {
        return reservationRepository.findByUserEmailOrderByCreatedAtDesc(email);
    }

    /**
     * Scheduled task to expire old reservations
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void expireOldReservations() {
        List<Reservation> expiredReservations = reservationRepository
                .findExpiredReservations(LocalDateTime.now());

        for (Reservation reservation : expiredReservations) {
            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);

            // Release the slot
            ParkingSlot slot = reservation.getSlot();
            if (slot.getSlotStatus() == SlotStatus.RESERVED) {
                slot.setSlotStatus(SlotStatus.AVAILABLE);
                slotRepository.save(slot);
            }

            log.info("Expired reservation: {}", reservation.getReservationNumber());
        }

        if (!expiredReservations.isEmpty()) {
            log.info("Expired {} reservations", expiredReservations.size());
        }
    }
}
