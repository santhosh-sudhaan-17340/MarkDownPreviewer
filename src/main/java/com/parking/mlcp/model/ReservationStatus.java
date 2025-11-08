package com.parking.mlcp.model;

/**
 * Enum representing the status of a reservation
 */
public enum ReservationStatus {
    PENDING,      // Reservation created but not confirmed
    CONFIRMED,    // Reservation confirmed
    EXPIRED,      // Reservation time expired
    CANCELLED,    // Cancelled by user or admin
    COMPLETED     // Vehicle parked and reservation fulfilled
}
