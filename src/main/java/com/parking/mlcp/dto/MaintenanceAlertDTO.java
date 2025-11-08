package com.parking.mlcp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceAlertDTO {

    private Long alertId;
    private String slotNumber;
    private String alertType;
    private String description;
    private String severity;
    private String status;
    private LocalDateTime createdAt;
}
