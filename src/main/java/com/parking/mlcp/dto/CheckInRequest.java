package com.parking.mlcp.dto;

import com.parking.mlcp.model.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    @NotBlank(message = "Vehicle number is required")
    private String vehicleNumber;

    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    @NotNull(message = "Gate ID is required")
    private Long gateId;

    private Boolean requiresEvCharging;

    private Boolean isVip;

    private String reservationNumber; // Optional: if user has a reservation
}
