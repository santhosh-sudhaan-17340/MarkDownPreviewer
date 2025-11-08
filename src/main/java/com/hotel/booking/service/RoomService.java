package com.hotel.booking.service;

import com.hotel.booking.exception.ResourceNotFoundException;
import com.hotel.booking.model.Room;
import com.hotel.booking.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

/**
 * Room Service
 * Business logic for room management
 */
@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;

    @Transactional
    public Room createRoom(Room room) {
        return roomRepository.save(room);
    }

    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + id));
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public List<Room> getRoomsByHotel(Long hotelId) {
        return roomRepository.findByHotelId(hotelId);
    }

    public List<Room> getAvailableRooms(Long hotelId, LocalDate checkInDate, LocalDate checkOutDate) {
        return roomRepository.findAvailableRooms(hotelId, checkInDate, checkOutDate);
    }

    public List<Room> getAvailableRoomsByType(Long hotelId, Room.RoomType roomType,
                                              LocalDate checkInDate, LocalDate checkOutDate) {
        return roomRepository.findAvailableRoomsByType(hotelId, roomType, checkInDate, checkOutDate);
    }

    @Transactional
    public Room updateRoom(Long id, Room roomDetails) {
        Room room = getRoomById(id);
        room.setRoomNumber(roomDetails.getRoomNumber());
        room.setRoomType(roomDetails.getRoomType());
        room.setFloorNumber(roomDetails.getFloorNumber());
        room.setMaxOccupancy(roomDetails.getMaxOccupancy());
        room.setBasePrice(roomDetails.getBasePrice());
        room.setCurrentPrice(roomDetails.getCurrentPrice());
        room.setDescription(roomDetails.getDescription());
        room.setAmenities(roomDetails.getAmenities());
        room.setIsAvailable(roomDetails.getIsAvailable());
        return roomRepository.save(room);
    }

    @Transactional
    public void deleteRoom(Long id) {
        Room room = getRoomById(id);
        roomRepository.delete(room);
    }
}
