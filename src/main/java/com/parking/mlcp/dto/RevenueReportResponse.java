package com.parking.mlcp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportResponse {

    private BigDecimal totalRevenue;
    private Long totalTransactions;
    private BigDecimal averageTicketValue;
    private LocalDateTime reportStartDate;
    private LocalDateTime reportEndDate;
    private Map<String, BigDecimal> vehicleTypeRevenue;
    private Map<String, BigDecimal> paymentMethodDistribution;
}
