package com.banking.dto;

import com.banking.entity.Account;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * DTO for creating a new account.
 */
public record CreateAccountRequest(
        @NotBlank(message = "Account number is required")
        String accountNumber,

        @NotBlank(message = "Customer name is required")
        String customerName,

        @NotNull(message = "Initial balance is required")
        @DecimalMin(value = "0.0", message = "Initial balance cannot be negative")
        BigDecimal initialBalance,

        @NotBlank(message = "Currency is required")
        String currency,

        @NotNull(message = "Account type is required")
        Account.AccountType accountType
) {}
