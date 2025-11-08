package com.parking.mlcp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OccupancyResponse {

    private Long totalSlots;
    private Long availableSlots;
    private Long occupiedSlots;
    private Long reservedSlots;
    private Long blockedSlots;
    private Double occupancyPercentage;
    private Map<String, Long> floorWiseOccupancy;
    private Map<String, Long> vehicleTypeDistribution;
}
