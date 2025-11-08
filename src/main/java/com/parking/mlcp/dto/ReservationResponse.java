package com.parking.mlcp.dto;

import com.parking.mlcp.model.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {

    private String reservationNumber;
    private String vehicleNumber;
    private String slotNumber;
    private Integer floorNumber;
    private LocalDateTime reservedFrom;
    private LocalDateTime reservedUntil;
    private ReservationStatus status;
    private String message;
}
