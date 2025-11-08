package com.parking.mlcp.service;

import com.parking.mlcp.dto.OccupancyResponse;
import com.parking.mlcp.dto.PeakHourData;
import com.parking.mlcp.dto.RevenueReportResponse;
import com.parking.mlcp.entity.ParkingTicket;
import com.parking.mlcp.model.SlotStatus;
import com.parking.mlcp.model.VehicleType;
import com.parking.mlcp.repository.ParkingSlotRepository;
import com.parking.mlcp.repository.ParkingTicketRepository;
import com.parking.mlcp.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for analytics and reporting
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final ParkingSlotRepository slotRepository;
    private final ParkingTicketRepository ticketRepository;
    private final PaymentTransactionRepository paymentRepository;

    /**
     * Get real-time occupancy statistics
     * Cached for 10 seconds to reduce database load
     */
    @Cacheable(value = "occupancy", key = "'current'")
    @Transactional(readOnly = true)
    public OccupancyResponse getOccupancyStatistics() {
        List<Object[]> stats = slotRepository.getOccupancyStatistics();

        long totalSlots = 0;
        long availableSlots = 0;
        long occupiedSlots = 0;
        long reservedSlots = 0;
        long blockedSlots = 0;

        for (Object[] stat : stats) {
            SlotStatus status = (SlotStatus) stat[0];
            long count = ((Number) stat[1]).longValue();
            totalSlots += count;

            switch (status) {
                case AVAILABLE -> availableSlots = count;
                case OCCUPIED -> occupiedSlots = count;
                case RESERVED -> reservedSlots = count;
                case BLOCKED, MAINTENANCE -> blockedSlots += count;
            }
        }

        double occupancyPercentage = totalSlots > 0 ?
                (double) occupiedSlots / totalSlots * 100 : 0;

        // Get floor-wise occupancy
        Map<String, Long> floorWiseOccupancy = getFloorWiseOccupancy();

        // Get vehicle type distribution
        Map<String, Long> vehicleTypeDistribution = getVehicleTypeDistribution();

        return OccupancyResponse.builder()
                .totalSlots(totalSlots)
                .availableSlots(availableSlots)
                .occupiedSlots(occupiedSlots)
                .reservedSlots(reservedSlots)
                .blockedSlots(blockedSlots)
                .occupancyPercentage(Math.round(occupancyPercentage * 100.0) / 100.0)
                .floorWiseOccupancy(floorWiseOccupancy)
                .vehicleTypeDistribution(vehicleTypeDistribution)
                .build();
    }

    /**
     * Get floor-wise occupancy
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getFloorWiseOccupancy() {
        List<Object[]> floorStats = slotRepository.getFloorWiseOccupancy();
        Map<String, Long> result = new HashMap<>();

        for (Object[] stat : floorStats) {
            String floorName = (String) stat[1];
            SlotStatus status = (SlotStatus) stat[2];
            long count = ((Number) stat[3]).longValue();

            if (status == SlotStatus.OCCUPIED) {
                result.put(floorName, count);
            }
        }

        return result;
    }

    /**
     * Get vehicle type distribution for currently parked vehicles
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getVehicleTypeDistribution() {
        Map<String, Long> distribution = new HashMap<>();

        for (VehicleType type : VehicleType.values()) {
            long count = slotRepository.countByVehicleTypeAndSlotStatus(type, SlotStatus.OCCUPIED);
            distribution.put(type.name(), count);
        }

        return distribution;
    }

    /**
     * Get revenue report for a date range
     */
    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(LocalDateTime startDate, LocalDateTime endDate) {
        List<ParkingTicket> tickets = ticketRepository.findByDateRange(startDate, endDate);

        BigDecimal totalRevenue = tickets.stream()
                .filter(t -> t.getExitTime() != null)
                .map(ParkingTicket::getParkingFee)
                .filter(fee -> fee != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalTransactions = tickets.stream()
                .filter(t -> t.getExitTime() != null)
                .count();

        BigDecimal averageTicketValue = totalTransactions > 0 ?
                totalRevenue.divide(BigDecimal.valueOf(totalTransactions), 2, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        // Vehicle type revenue breakdown
        Map<String, BigDecimal> vehicleTypeRevenue = tickets.stream()
                .filter(t -> t.getExitTime() != null && t.getParkingFee() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getVehicleType().name(),
                        Collectors.reducing(BigDecimal.ZERO, ParkingTicket::getParkingFee, BigDecimal::add)
                ));

        // Payment method distribution
        List<Object[]> paymentStats = paymentRepository.getPaymentMethodDistribution(startDate, endDate);
        Map<String, BigDecimal> paymentMethodDistribution = new HashMap<>();
        for (Object[] stat : paymentStats) {
            String method = stat[0] != null ? stat[0].toString() : "CASH";
            BigDecimal amount = stat[2] != null ? new BigDecimal(stat[2].toString()) : BigDecimal.ZERO;
            paymentMethodDistribution.put(method, amount);
        }

        return RevenueReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalTransactions(totalTransactions)
                .averageTicketValue(averageTicketValue)
                .reportStartDate(startDate)
                .reportEndDate(endDate)
                .vehicleTypeRevenue(vehicleTypeRevenue)
                .paymentMethodDistribution(paymentMethodDistribution)
                .build();
    }

    /**
     * Get peak hour analysis
     */
    @Transactional(readOnly = true)
    public List<PeakHourData> getPeakHourAnalysis(LocalDateTime startDate, LocalDateTime endDate) {
        List<Object[]> hourlyStats = ticketRepository.getHourlyEntryStatistics(startDate, endDate);

        return hourlyStats.stream()
                .map(stat -> {
                    Integer hour = ((Number) stat[0]).intValue();
                    Long count = ((Number) stat[1]).longValue();
                    String timeRange = String.format("%02d:00 - %02d:00", hour, (hour + 1) % 24);

                    return PeakHourData.builder()
                            .hour(hour)
                            .entryCount(count)
                            .timeRange(timeRange)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get today's revenue
     */
    @Transactional(readOnly = true)
    public BigDecimal getTodayRevenue() {
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        Double revenue = paymentRepository.getTotalRevenueByDateRange(startOfDay, endOfDay);
        return revenue != null ? BigDecimal.valueOf(revenue) : BigDecimal.ZERO;
    }

    /**
     * Get month's revenue
     */
    @Transactional(readOnly = true)
    public BigDecimal getMonthRevenue() {
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1)
                .withHour(0).withMinute(0).withSecond(0);
        LocalDateTime now = LocalDateTime.now();

        Double revenue = paymentRepository.getTotalRevenueByDateRange(startOfMonth, now);
        return revenue != null ? BigDecimal.valueOf(revenue) : BigDecimal.ZERO;
    }
}
