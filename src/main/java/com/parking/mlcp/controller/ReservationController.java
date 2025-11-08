package com.parking.mlcp.controller;

import com.parking.mlcp.dto.ReservationRequest;
import com.parking.mlcp.dto.ReservationResponse;
import com.parking.mlcp.entity.Reservation;
import com.parking.mlcp.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for reservation management
 */
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    /**
     * Create a new reservation
     */
    @PostMapping
    public ResponseEntity<ReservationResponse> createReservation(
            @Valid @RequestBody ReservationRequest request) {
        log.info("Creating reservation for vehicle: {}", request.getVehicleNumber());
        ReservationResponse response = reservationService.createReservation(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get reservation details
     */
    @GetMapping("/{reservationNumber}")
    public ResponseEntity<Reservation> getReservation(@PathVariable String reservationNumber) {
        Reservation reservation = reservationService.getReservation(reservationNumber);
        return ResponseEntity.ok(reservation);
    }

    /**
     * Cancel a reservation
     */
    @PutMapping("/{reservationNumber}/cancel")
    public ResponseEntity<String> cancelReservation(@PathVariable String reservationNumber) {
        reservationService.cancelReservation(reservationNumber);
        return ResponseEntity.ok("Reservation cancelled successfully");
    }

    /**
     * Get user reservations
     */
    @GetMapping("/user/{email}")
    public ResponseEntity<List<Reservation>> getUserReservations(@PathVariable String email) {
        List<Reservation> reservations = reservationService.getUserReservations(email);
        return ResponseEntity.ok(reservations);
    }
}
