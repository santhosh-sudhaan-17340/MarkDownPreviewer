package com.hotel.booking.controller;

import com.hotel.booking.model.PricingHistory;
import com.hotel.booking.service.PricingHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Pricing History Controller
 * REST API endpoints for pricing history management
 */
@RestController
@RequestMapping("/api/pricing-history")
@RequiredArgsConstructor
public class PricingHistoryController {

    private final PricingHistoryService pricingHistoryService;

    @PostMapping("/room/{roomId}")
    public ResponseEntity<PricingHistory> updateRoomPrice(
            @PathVariable Long roomId,
            @RequestBody PriceUpdateRequest request) {
        PricingHistory history = pricingHistoryService.updateRoomPrice(
            roomId,
            request.newPrice,
            request.reason,
            request.changedBy
        );
        return ResponseEntity.ok(history);
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<PricingHistory>> getRoomPricingHistory(@PathVariable Long roomId) {
        return ResponseEntity.ok(pricingHistoryService.getRoomPricingHistory(roomId));
    }

    @GetMapping("/room/{roomId}/date-range")
    public ResponseEntity<List<PricingHistory>> getRoomPricingHistoryByDateRange(
            @PathVariable Long roomId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        return ResponseEntity.ok(pricingHistoryService.getRoomPricingHistoryByDateRange(
            roomId,
            LocalDate.parse(startDate),
            LocalDate.parse(endDate)
        ));
    }

    @GetMapping("/room/{roomId}/price-at-date")
    public ResponseEntity<PriceAtDateResponse> getPriceAtDate(
            @PathVariable Long roomId,
            @RequestParam String date) {
        BigDecimal price = pricingHistoryService.getPriceAtDate(roomId, LocalDate.parse(date));
        return ResponseEntity.ok(new PriceAtDateResponse(roomId, LocalDate.parse(date), price));
    }

    @GetMapping("/room/{roomId}/trend")
    public ResponseEntity<PricingHistoryService.PriceTrend> getPriceTrend(
            @PathVariable Long roomId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        PricingHistoryService.PriceTrend trend = pricingHistoryService.calculatePriceTrend(
            roomId,
            LocalDate.parse(startDate),
            LocalDate.parse(endDate)
        );
        return ResponseEntity.ok(trend);
    }

    // DTOs
    public static class PriceUpdateRequest {
        public BigDecimal newPrice;
        public String reason;
        public String changedBy;
    }

    public static class PriceAtDateResponse {
        public Long roomId;
        public LocalDate date;
        public BigDecimal price;

        public PriceAtDateResponse(Long roomId, LocalDate date, BigDecimal price) {
            this.roomId = roomId;
            this.date = date;
            this.price = price;
        }
    }
}
