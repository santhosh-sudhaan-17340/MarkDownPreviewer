package com.parking.mlcp.service;

import com.parking.mlcp.entity.EntryGate;
import com.parking.mlcp.entity.ParkingSlot;
import com.parking.mlcp.exception.SlotNotAvailableException;
import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.model.VehicleType;
import com.parking.mlcp.repository.EntryGateRepository;
import com.parking.mlcp.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Service responsible for slot allocation with nearest-slot algorithm
 * Uses pessimistic locking to prevent race conditions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SlotAllocationService {

    private final ParkingSlotRepository slotRepository;
    private final EntryGateRepository gateRepository;

    /**
     * Allocate nearest available slot for a vehicle
     * Uses SERIALIZABLE isolation and pessimistic locking
     * Includes retry mechanism for concurrent access
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Retryable(
        retryFor = {SlotNotAvailableException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2)
    )
    public ParkingSlot allocateNearestSlot(
            VehicleType vehicleType,
            Long gateId,
            Boolean requiresEvCharging,
            Boolean isVip) {

        log.info("Allocating slot for vehicle type: {}, gate: {}, EV: {}, VIP: {}",
                vehicleType, gateId, requiresEvCharging, isVip);

        // Get entry gate with coordinates
        EntryGate entryGate = gateRepository.findById(gateId)
                .orElseThrow(() -> new SlotNotAvailableException("Entry gate not found: " + gateId));

        // Get available slots with pessimistic lock (FOR UPDATE)
        List<ParkingSlot> availableSlots = slotRepository.findAvailableSlotsWithLock(
                vehicleType, SlotStatus.AVAILABLE);

        if (availableSlots.isEmpty()) {
            throw new SlotNotAvailableException("No available slots for vehicle type: " + vehicleType);
        }

        // Filter by requirements
        List<ParkingSlot> filteredSlots = availableSlots.stream()
                .filter(slot -> {
                    if (Boolean.TRUE.equals(requiresEvCharging) && !Boolean.TRUE.equals(slot.getIsEvCharging())) {
                        return false;
                    }
                    if (Boolean.TRUE.equals(isVip) && !Boolean.TRUE.equals(slot.getIsVip())) {
                        return false;
                    }
                    return true;
                })
                .toList();

        if (filteredSlots.isEmpty()) {
            throw new SlotNotAvailableException("No slots matching requirements");
        }

        // Find nearest slot using Euclidean distance
        ParkingSlot nearestSlot = filteredSlots.stream()
                .min(Comparator.comparingDouble(slot ->
                        slot.calculateDistance(entryGate.getXCoordinate(), entryGate.getYCoordinate())))
                .orElseThrow(() -> new SlotNotAvailableException("Could not find nearest slot"));

        // Mark slot as occupied
        nearestSlot.setSlotStatus(SlotStatus.OCCUPIED);
        ParkingSlot allocatedSlot = slotRepository.save(nearestSlot);

        log.info("Allocated slot: {} for vehicle type: {}", allocatedSlot.getSlotNumber(), vehicleType);

        return allocatedSlot;
    }

    /**
     * Release a slot back to available status
     */
    @Transactional
    public void releaseSlot(Long slotId) {
        ParkingSlot slot = slotRepository.findByIdWithLock(slotId)
                .orElseThrow(() -> new SlotNotAvailableException("Slot not found: " + slotId));

        slot.setSlotStatus(SlotStatus.AVAILABLE);
        slotRepository.save(slot);

        log.info("Released slot: {}", slot.getSlotNumber());
    }

    /**
     * Reserve a slot for online booking
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public ParkingSlot reserveSlot(
            VehicleType vehicleType,
            Boolean requiresEvCharging,
            Boolean isVip,
            Long preferredFloorId) {

        List<ParkingSlot> availableSlots = slotRepository.findAvailableSlotsWithLock(
                vehicleType, SlotStatus.AVAILABLE);

        if (availableSlots.isEmpty()) {
            throw new SlotNotAvailableException("No available slots for reservation");
        }

        // Filter by requirements
        Optional<ParkingSlot> selectedSlot = availableSlots.stream()
                .filter(slot -> {
                    if (Boolean.TRUE.equals(requiresEvCharging) && !Boolean.TRUE.equals(slot.getIsEvCharging())) {
                        return false;
                    }
                    if (Boolean.TRUE.equals(isVip) && !Boolean.TRUE.equals(slot.getIsVip())) {
                        return false;
                    }
                    if (preferredFloorId != null && !slot.getFloor().getFloorId().equals(preferredFloorId)) {
                        return false;
                    }
                    return true;
                })
                .findFirst();

        ParkingSlot slot = selectedSlot.orElseThrow(() ->
                new SlotNotAvailableException("No slots matching reservation requirements"));

        slot.setSlotStatus(SlotStatus.RESERVED);
        return slotRepository.save(slot);
    }
}
