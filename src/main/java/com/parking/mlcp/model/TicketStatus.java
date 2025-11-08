package com.parking.mlcp.model;

/**
 * Enum representing the status of a parking ticket
 */
public enum TicketStatus {
    ACTIVE,      // Vehicle currently parked
    COMPLETED,   // Vehicle exited and payment done
    CANCELLED    // Ticket cancelled
}
