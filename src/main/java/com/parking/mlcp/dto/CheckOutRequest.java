package com.parking.mlcp.dto;

import com.parking.mlcp.model.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckOutRequest {

    @NotBlank(message = "Ticket number is required")
    private String ticketNumber;

    private PaymentMethod paymentMethod;
}
