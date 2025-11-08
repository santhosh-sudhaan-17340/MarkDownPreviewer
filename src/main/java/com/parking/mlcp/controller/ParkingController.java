package com.parking.mlcp.controller;

import com.parking.mlcp.dto.CheckInRequest;
import com.parking.mlcp.dto.CheckInResponse;
import com.parking.mlcp.dto.CheckOutRequest;
import com.parking.mlcp.dto.CheckOutResponse;
import com.parking.mlcp.entity.ParkingTicket;
import com.parking.mlcp.service.ParkingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for parking operations
 */
@RestController
@RequestMapping("/api/parking")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingService parkingService;

    /**
     * Vehicle check-in endpoint
     */
    @PostMapping("/check-in")
    public ResponseEntity<CheckInResponse> checkIn(@Valid @RequestBody CheckInRequest request) {
        log.info("Check-in request for vehicle: {}", request.getVehicleNumber());
        CheckInResponse response = parkingService.checkIn(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Vehicle check-out endpoint
     */
    @PostMapping("/check-out")
    public ResponseEntity<CheckOutResponse> checkOut(@Valid @RequestBody CheckOutRequest request) {
        log.info("Check-out request for ticket: {}", request.getTicketNumber());
        CheckOutResponse response = parkingService.checkOut(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get ticket details
     */
    @GetMapping("/ticket/{ticketNumber}")
    public ResponseEntity<ParkingTicket> getTicket(@PathVariable String ticketNumber) {
        ParkingTicket ticket = parkingService.getTicketByNumber(ticketNumber);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Get active ticket for a vehicle
     */
    @GetMapping("/ticket/vehicle/{vehicleNumber}")
    public ResponseEntity<ParkingTicket> getActiveTicket(@PathVariable String vehicleNumber) {
        ParkingTicket ticket = parkingService.getActiveTicketForVehicle(vehicleNumber);
        return ResponseEntity.ok(ticket);
    }
}
