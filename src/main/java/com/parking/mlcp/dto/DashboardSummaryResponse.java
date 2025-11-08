package com.parking.mlcp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {

    private Long totalSlots;
    private Long availableSlots;
    private Long currentOccupancy;
    private Double occupancyRate;
    private Long activeTickets;
    private Long activeReservations;
    private BigDecimal todayRevenue;
    private BigDecimal monthRevenue;
    private List<MaintenanceAlertDTO> criticalAlerts;
    private List<PeakHourData> peakHours;
}
