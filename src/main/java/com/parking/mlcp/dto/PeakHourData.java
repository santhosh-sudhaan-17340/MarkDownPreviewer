package com.parking.mlcp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeakHourData {

    private Integer hour;
    private Long entryCount;
    private String timeRange;
}
