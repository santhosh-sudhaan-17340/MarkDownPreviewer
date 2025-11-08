package com.hotel.booking.service;

import com.hotel.booking.exception.ResourceNotFoundException;
import com.hotel.booking.model.AuditLog;
import com.hotel.booking.model.PricingHistory;
import com.hotel.booking.model.Room;
import com.hotel.booking.repository.AuditLogRepository;
import com.hotel.booking.repository.PricingHistoryRepository;
import com.hotel.booking.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Pricing History Service
 * Tracks and manages room price changes over time
 */
@Service
@RequiredArgsConstructor
public class PricingHistoryService {

    private final PricingHistoryRepository pricingHistoryRepository;
    private final RoomRepository roomRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Update room price and record in pricing history
     */
    @Transactional
    public PricingHistory updateRoomPrice(Long roomId, BigDecimal newPrice, String reason, String changedBy) {
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        BigDecimal oldPrice = room.getCurrentPrice();

        // Only create history if price actually changed
        if (oldPrice.compareTo(newPrice) == 0) {
            throw new IllegalArgumentException("New price is the same as current price");
        }

        // Create pricing history record
        PricingHistory history = new PricingHistory();
        history.setRoom(room);
        history.setOldPrice(oldPrice);
        history.setNewPrice(newPrice);
        history.setEffectiveDate(LocalDate.now());
        history.setReason(reason);
        history.setChangedBy(changedBy);

        PricingHistory savedHistory = pricingHistoryRepository.save(history);

        // Update room's current price
        room.setCurrentPrice(newPrice);
        roomRepository.save(room);

        // Create audit log
        createAuditLog("PRICING", savedHistory.getId(), "UPDATE",
            "Price changed from " + oldPrice + " to " + newPrice + ". Reason: " + reason,
            changedBy);

        return savedHistory;
    }

    /**
     * Get pricing history for a room
     */
    public List<PricingHistory> getRoomPricingHistory(Long roomId) {
        return pricingHistoryRepository.findByRoomIdOrderByEffectiveDateDesc(roomId);
    }

    /**
     * Get pricing history for a room within a date range
     */
    public List<PricingHistory> getRoomPricingHistoryByDateRange(Long roomId, LocalDate startDate, LocalDate endDate) {
        return pricingHistoryRepository.findByRoomIdAndDateRange(roomId, startDate, endDate);
    }

    /**
     * Get price at a specific date (for historical pricing queries)
     */
    public BigDecimal getPriceAtDate(Long roomId, LocalDate date) {
        Room room = roomRepository.findById(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));

        // Get all pricing history up to and including the specified date
        List<PricingHistory> history = pricingHistoryRepository.findByRoomIdOrderByEffectiveDateDesc(roomId);

        // Find the most recent price change before or on the specified date
        for (PricingHistory priceChange : history) {
            if (!priceChange.getEffectiveDate().isAfter(date)) {
                return priceChange.getNewPrice();
            }
        }

        // If no history found before this date, return base price
        return room.getBasePrice();
    }

    /**
     * Calculate price trends for a room
     */
    public PriceTrend calculatePriceTrend(Long roomId, LocalDate startDate, LocalDate endDate) {
        List<PricingHistory> history = pricingHistoryRepository.findByRoomIdAndDateRange(
            roomId, startDate, endDate);

        if (history.isEmpty()) {
            Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: " + roomId));
            return new PriceTrend(roomId, room.getCurrentPrice(), room.getCurrentPrice(),
                room.getCurrentPrice(), BigDecimal.ZERO, 0);
        }

        BigDecimal minPrice = history.stream()
            .map(PricingHistory::getNewPrice)
            .min(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

        BigDecimal maxPrice = history.stream()
            .map(PricingHistory::getNewPrice)
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

        BigDecimal avgPrice = history.stream()
            .map(PricingHistory::getNewPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(history.size()), 2, BigDecimal.ROUND_HALF_UP);

        BigDecimal currentPrice = history.get(0).getNewPrice();

        return new PriceTrend(roomId, currentPrice, minPrice, maxPrice, avgPrice, history.size());
    }

    /**
     * Create audit log entry
     */
    private void createAuditLog(String entityType, Long entityId, String action,
                               String details, String performedBy) {
        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setAction(action);
        auditLog.setDetails(details);
        auditLog.setPerformedBy(performedBy);
        auditLogRepository.save(auditLog);
    }

    /**
     * Price trend analysis result
     */
    public static class PriceTrend {
        public final Long roomId;
        public final BigDecimal currentPrice;
        public final BigDecimal minPrice;
        public final BigDecimal maxPrice;
        public final BigDecimal avgPrice;
        public final int priceChanges;

        public PriceTrend(Long roomId, BigDecimal currentPrice, BigDecimal minPrice,
                         BigDecimal maxPrice, BigDecimal avgPrice, int priceChanges) {
            this.roomId = roomId;
            this.currentPrice = currentPrice;
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
            this.avgPrice = avgPrice;
            this.priceChanges = priceChanges;
        }
    }
}
