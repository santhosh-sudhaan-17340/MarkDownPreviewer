package com.parking.mlcp.controller;

import com.parking.mlcp.dto.OccupancyResponse;
import com.parking.mlcp.dto.PeakHourData;
import com.parking.mlcp.dto.RevenueReportResponse;
import com.parking.mlcp.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * REST controller for analytics and reporting
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Get real-time occupancy statistics
     */
    @GetMapping("/occupancy")
    public ResponseEntity<OccupancyResponse> getOccupancy() {
        OccupancyResponse occupancy = analyticsService.getOccupancyStatistics();
        return ResponseEntity.ok(occupancy);
    }

    /**
     * Get floor-wise occupancy
     */
    @GetMapping("/occupancy/floors")
    public ResponseEntity<Map<String, Long>> getFloorWiseOccupancy() {
        Map<String, Long> occupancy = analyticsService.getFloorWiseOccupancy();
        return ResponseEntity.ok(occupancy);
    }

    /**
     * Get vehicle type distribution
     */
    @GetMapping("/vehicle-distribution")
    public ResponseEntity<Map<String, Long>> getVehicleDistribution() {
        Map<String, Long> distribution = analyticsService.getVehicleTypeDistribution();
        return ResponseEntity.ok(distribution);
    }

    /**
     * Get revenue report for date range
     */
    @GetMapping("/revenue")
    public ResponseEntity<RevenueReportResponse> getRevenueReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        RevenueReportResponse report = analyticsService.getRevenueReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }

    /**
     * Get peak hour analysis
     */
    @GetMapping("/peak-hours")
    public ResponseEntity<List<PeakHourData>> getPeakHours(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<PeakHourData> peakHours = analyticsService.getPeakHourAnalysis(startDate, endDate);
        return ResponseEntity.ok(peakHours);
    }
}
