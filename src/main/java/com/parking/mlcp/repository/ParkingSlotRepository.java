package com.parking.mlcp.repository;

import com.parking.mlcp.entity.ParkingSlot;
import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.model.VehicleType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    /**
     * Find all available slots for a specific vehicle type
     */
    List<ParkingSlot> findByVehicleTypeAndSlotStatus(VehicleType vehicleType, SlotStatus status);

    /**
     * Find available slots with pessimistic lock (FOR UPDATE)
     * This prevents race conditions during slot allocation
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ParkingSlot s WHERE s.vehicleType = :vehicleType " +
           "AND s.slotStatus = :status ORDER BY s.slotId")
    List<ParkingSlot> findAvailableSlotsWithLock(
        @Param("vehicleType") VehicleType vehicleType,
        @Param("status") SlotStatus status
    );

    /**
     * Find a specific slot with pessimistic lock
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ParkingSlot s WHERE s.slotId = :slotId")
    Optional<ParkingSlot> findByIdWithLock(@Param("slotId") Long slotId);

    /**
     * Count slots by floor and status
     */
    @Query("SELECT COUNT(s) FROM ParkingSlot s WHERE s.floor.floorId = :floorId " +
           "AND s.slotStatus = :status")
    Long countByFloorAndStatus(@Param("floorId") Long floorId, @Param("status") SlotStatus status);

    /**
     * Count total slots by vehicle type and status
     */
    Long countByVehicleTypeAndSlotStatus(VehicleType vehicleType, SlotStatus status);

    /**
     * Find slots by floor and vehicle type
     */
    List<ParkingSlot> findByFloor_FloorIdAndVehicleType(Long floorId, VehicleType vehicleType);

    /**
     * Find all EV charging slots
     */
    List<ParkingSlot> findByIsEvChargingTrueAndSlotStatus(SlotStatus status);

    /**
     * Find all VIP slots
     */
    List<ParkingSlot> findByIsVipTrueAndSlotStatus(SlotStatus status);

    /**
     * Find slot by slot number
     */
    Optional<ParkingSlot> findBySlotNumber(String slotNumber);

    /**
     * Get occupancy statistics
     */
    @Query("SELECT s.slotStatus, COUNT(s) FROM ParkingSlot s GROUP BY s.slotStatus")
    List<Object[]> getOccupancyStatistics();

    /**
     * Get floor-wise occupancy
     */
    @Query("SELECT s.floor.floorId, s.floor.floorName, s.slotStatus, COUNT(s) " +
           "FROM ParkingSlot s GROUP BY s.floor.floorId, s.floor.floorName, s.slotStatus")
    List<Object[]> getFloorWiseOccupancy();
}
