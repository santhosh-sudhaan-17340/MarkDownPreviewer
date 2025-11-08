package com.hotel.booking.controller;

import com.hotel.booking.model.Reservation;
import com.hotel.booking.service.CancellationService;
import com.hotel.booking.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Reservation Controller
 * REST API endpoints for reservation management
 */
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
    private final CancellationService cancellationService;

    @PostMapping
    public ResponseEntity<Reservation> createReservation(@RequestBody ReservationRequest request) {
        Reservation reservation = reservationService.createReservation(
            request.roomId,
            request.userId,
            request.checkInDate,
            request.checkOutDate,
            request.numberOfGuests,
            request.cancellationPolicy
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(reservation);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reservation> getReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Reservation>> getUserReservations(@PathVariable Long userId) {
        return ResponseEntity.ok(reservationService.getUserReservations(userId));
    }

    @GetMapping("/user/{userId}/upcoming")
    public ResponseEntity<List<Reservation>> getUpcomingReservations(@PathVariable Long userId) {
        return ResponseEntity.ok(reservationService.getUpcomingReservations(userId));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<Reservation> confirmReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.confirmReservation(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CancellationService.CancellationResult> cancelReservation(
            @PathVariable Long id,
            @RequestBody(required = false) CancellationRequest request) {
        String reason = request != null ? request.reason : "Customer requested cancellation";
        CancellationService.CancellationResult result = cancellationService.cancelReservation(id, reason);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/cancel-preview")
    public ResponseEntity<CancellationService.CancellationPreview> previewCancellation(@PathVariable Long id) {
        return ResponseEntity.ok(cancellationService.previewCancellation(id));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<Reservation>> getRoomReservations(@PathVariable Long roomId) {
        return ResponseEntity.ok(reservationService.getRoomReservations(roomId));
    }

    @GetMapping("/check-availability")
    public ResponseEntity<AvailabilityResponse> checkAvailability(
            @RequestParam Long roomId,
            @RequestParam String checkInDate,
            @RequestParam String checkOutDate) {
        boolean available = reservationService.isRoomAvailable(
            roomId,
            LocalDate.parse(checkInDate),
            LocalDate.parse(checkOutDate)
        );
        return ResponseEntity.ok(new AvailabilityResponse(roomId, available));
    }

    // DTOs
    public static class ReservationRequest {
        public Long roomId;
        public Long userId;
        public LocalDate checkInDate;
        public LocalDate checkOutDate;
        public Integer numberOfGuests;
        public Reservation.CancellationPolicy cancellationPolicy;
    }

    public static class CancellationRequest {
        public String reason;
    }

    public static class AvailabilityResponse {
        public Long roomId;
        public boolean available;

        public AvailabilityResponse(Long roomId, boolean available) {
            this.roomId = roomId;
            this.available = available;
        }
    }
}
