package com.parking.mlcp.dto;

import com.parking.mlcp.model.VehicleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequest {

    @NotBlank(message = "Vehicle number is required")
    private String vehicleNumber;

    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String userEmail;

    @NotBlank(message = "Phone number is required")
    private String userPhone;

    @NotNull(message = "Reservation start time is required")
    @Future(message = "Reservation must be in the future")
    private LocalDateTime reservedFrom;

    @NotNull(message = "Reservation end time is required")
    private LocalDateTime reservedUntil;

    private Boolean requiresEvCharging;

    private Boolean isVip;

    private Long preferredFloorId;
}
