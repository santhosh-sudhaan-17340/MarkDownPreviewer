package com.parking.mlcp.model;

/**
 * Enum representing the status of a parking slot
 */
public enum SlotStatus {
    AVAILABLE,      // Ready for parking
    OCCUPIED,       // Currently parked
    RESERVED,       // Reserved through online booking
    BLOCKED,        // Temporarily blocked by admin
    MAINTENANCE     // Under maintenance
}
