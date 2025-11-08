package com.hotel.booking.exception;

/**
 * Exception thrown when a reservation conflicts with existing reservations
 */
public class ReservationConflictException extends RuntimeException {

    public ReservationConflictException(String message) {
        super(message);
    }

    public ReservationConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
