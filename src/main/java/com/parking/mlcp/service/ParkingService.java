package com.parking.mlcp.service;

import com.parking.mlcp.dto.*;
import com.parking.mlcp.entity.*;
import com.parking.mlcp.exception.ParkingException;
import com.parking.mlcp.exception.ResourceNotFoundException;
import com.parking.mlcp.model.*;
import com.parking.mlcp.repository.*;
import com.parking.mlcp.util.TicketNumberGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Main service for parking operations: check-in and check-out
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ParkingService {

    private final ParkingTicketRepository ticketRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final SlotAllocationService slotAllocationService;
    private final PricingService pricingService;
    private final EntryGateRepository gateRepository;

    /**
     * Handle vehicle check-in
     * Allocates nearest available slot and generates ticket
     */
    @Transactional
    public CheckInResponse checkIn(CheckInRequest request) {
        log.info("Processing check-in for vehicle: {}", request.getVehicleNumber());

        // Validate entry gate
        EntryGate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new ResourceNotFoundException("Entry gate not found"));

        ParkingSlot slot;

        // Check if user has a reservation
        if (request.getReservationNumber() != null) {
            Reservation reservation = reservationRepository.findByReservationNumber(request.getReservationNumber())
                    .orElseThrow(() -> new ResourceNotFoundException("Reservation not found"));

            if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
                throw new ParkingException("Reservation is not confirmed");
            }

            if (!reservation.isActive()) {
                throw new ParkingException("Reservation is not active or has expired");
            }

            slot = reservation.getSlot();
            slot.setSlotStatus(SlotStatus.OCCUPIED);

            // Update reservation status
            reservation.setStatus(ReservationStatus.COMPLETED);
            reservationRepository.save(reservation);
        } else {
            // Allocate nearest available slot
            slot = slotAllocationService.allocateNearestSlot(
                    request.getVehicleType(),
                    request.getGateId(),
                    request.getRequiresEvCharging(),
                    request.getIsVip()
            );
        }

        // Generate ticket
        ParkingTicket ticket = ParkingTicket.builder()
                .ticketNumber(TicketNumberGenerator.generateTicketNumber())
                .vehicleNumber(request.getVehicleNumber())
                .vehicleType(request.getVehicleType())
                .slot(slot)
                .entryGate(gate)
                .entryTime(LocalDateTime.now())
                .status(TicketStatus.ACTIVE)
                .build();

        ticket = ticketRepository.save(ticket);

        log.info("Check-in successful: Ticket {} assigned to slot {}",
                ticket.getTicketNumber(), slot.getSlotNumber());

        return CheckInResponse.builder()
                .ticketNumber(ticket.getTicketNumber())
                .vehicleNumber(ticket.getVehicleNumber())
                .vehicleType(ticket.getVehicleType())
                .slotNumber(slot.getSlotNumber())
                .floorNumber(slot.getFloor().getFloorNumber())
                .entryTime(ticket.getEntryTime())
                .message("Vehicle parked successfully at " + slot.getSlotNumber())
                .build();
    }

    /**
     * Handle vehicle check-out
     * Calculates fee, processes payment, and releases slot
     */
    @Transactional
    public CheckOutResponse checkOut(CheckOutRequest request) {
        log.info("Processing check-out for ticket: {}", request.getTicketNumber());

        // Find active ticket
        ParkingTicket ticket = ticketRepository.findByTicketNumber(request.getTicketNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        if (ticket.getStatus() != TicketStatus.ACTIVE) {
            throw new ParkingException("Ticket is not active");
        }

        // Set exit time
        ticket.setExitTime(LocalDateTime.now());

        // Calculate parking fee
        BigDecimal fee = pricingService.calculateParkingFee(ticket);
        ticket.setParkingFee(fee);
        ticket.setStatus(TicketStatus.COMPLETED);
        ticket = ticketRepository.save(ticket);

        // Process payment
        PaymentTransaction payment = PaymentTransaction.builder()
                .ticket(ticket)
                .amount(fee)
                .paymentMethod(request.getPaymentMethod() != null ?
                        request.getPaymentMethod() : PaymentMethod.CASH)
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionTime(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        // Release slot
        slotAllocationService.releaseSlot(ticket.getSlot().getSlotId());

        long durationMinutes = ticket.getParkingDurationInMinutes();

        log.info("Check-out successful: Ticket {} - Fee: {} - Duration: {} minutes",
                ticket.getTicketNumber(), fee, durationMinutes);

        return CheckOutResponse.builder()
                .ticketNumber(ticket.getTicketNumber())
                .vehicleNumber(ticket.getVehicleNumber())
                .entryTime(ticket.getEntryTime())
                .exitTime(ticket.getExitTime())
                .durationInMinutes(durationMinutes)
                .parkingFee(fee)
                .paymentStatus("SUCCESS")
                .message("Thank you for parking with us!")
                .build();
    }

    /**
     * Get ticket details
     */
    @Transactional(readOnly = true)
    public ParkingTicket getTicketByNumber(String ticketNumber) {
        return ticketRepository.findByTicketNumber(ticketNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + ticketNumber));
    }

    /**
     * Get active ticket for a vehicle
     */
    @Transactional(readOnly = true)
    public ParkingTicket getActiveTicketForVehicle(String vehicleNumber) {
        return ticketRepository.findByVehicleNumberAndStatusOrderByEntryTimeDesc(
                        vehicleNumber, TicketStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active ticket found for vehicle: " + vehicleNumber));
    }
}
