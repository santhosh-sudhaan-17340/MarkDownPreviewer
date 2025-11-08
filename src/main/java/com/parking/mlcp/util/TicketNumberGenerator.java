package com.parking.mlcp.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Utility class for generating unique ticket and reservation numbers
 */
public class TicketNumberGenerator {

    private static final AtomicLong counter = new AtomicLong(0);
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

    public static String generateTicketNumber() {
        String date = LocalDateTime.now().format(formatter);
        long count = counter.incrementAndGet();
        return String.format("TKT-%s-%06d", date, count);
    }

    public static String generateReservationNumber() {
        String date = LocalDateTime.now().format(formatter);
        long count = counter.incrementAndGet();
        return String.format("RSV-%s-%06d", date, count);
    }
}
