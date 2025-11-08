package com.hotel.booking.repository;

import com.hotel.booking.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

/**
 * Room Repository
 * Data access layer for Room entity with availability checking
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByHotelId(Long hotelId);

    List<Room> findByHotelIdAndIsAvailable(Long hotelId, Boolean isAvailable);

    List<Room> findByRoomType(Room.RoomType roomType);

    /**
     * Find rooms that are available for a given date range
     * A room is available if it has no conflicting reservations (CONFIRMED or PENDING status)
     */
    @Query("SELECT r FROM Room r WHERE r.hotel.id = :hotelId " +
           "AND r.isAvailable = true " +
           "AND r.id NOT IN (" +
           "  SELECT res.room.id FROM Reservation res " +
           "  WHERE res.status IN ('CONFIRMED', 'PENDING') " +
           "  AND res.checkInDate < :checkOutDate " +
           "  AND res.checkOutDate > :checkInDate" +
           ")")
    List<Room> findAvailableRooms(
        @Param("hotelId") Long hotelId,
        @Param("checkInDate") LocalDate checkInDate,
        @Param("checkOutDate") LocalDate checkOutDate
    );

    /**
     * Find available rooms by type and date range
     */
    @Query("SELECT r FROM Room r WHERE r.hotel.id = :hotelId " +
           "AND r.roomType = :roomType " +
           "AND r.isAvailable = true " +
           "AND r.id NOT IN (" +
           "  SELECT res.room.id FROM Reservation res " +
           "  WHERE res.status IN ('CONFIRMED', 'PENDING') " +
           "  AND res.checkInDate < :checkOutDate " +
           "  AND res.checkOutDate > :checkInDate" +
           ")")
    List<Room> findAvailableRoomsByType(
        @Param("hotelId") Long hotelId,
        @Param("roomType") Room.RoomType roomType,
        @Param("checkInDate") LocalDate checkInDate,
        @Param("checkOutDate") LocalDate checkOutDate
    );
}
