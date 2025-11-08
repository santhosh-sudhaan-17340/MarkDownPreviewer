package com.hotel.booking.controller;

import com.hotel.booking.model.Room;
import com.hotel.booking.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Room Controller
 * REST API endpoints for room management
 */
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.createRoom(room));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoom(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<List<Room>> getRoomsByHotel(@PathVariable Long hotelId) {
        return ResponseEntity.ok(roomService.getRoomsByHotel(hotelId));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Room>> getAvailableRooms(
            @RequestParam Long hotelId,
            @RequestParam String checkInDate,
            @RequestParam String checkOutDate) {
        return ResponseEntity.ok(roomService.getAvailableRooms(
            hotelId,
            LocalDate.parse(checkInDate),
            LocalDate.parse(checkOutDate)
        ));
    }

    @GetMapping("/available/type")
    public ResponseEntity<List<Room>> getAvailableRoomsByType(
            @RequestParam Long hotelId,
            @RequestParam Room.RoomType roomType,
            @RequestParam String checkInDate,
            @RequestParam String checkOutDate) {
        return ResponseEntity.ok(roomService.getAvailableRoomsByType(
            hotelId,
            roomType,
            LocalDate.parse(checkInDate),
            LocalDate.parse(checkOutDate)
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(@PathVariable Long id, @RequestBody Room room) {
        return ResponseEntity.ok(roomService.updateRoom(id, room));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
