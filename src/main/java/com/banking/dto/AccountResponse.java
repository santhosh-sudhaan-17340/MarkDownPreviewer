package com.banking.dto;

import com.banking.entity.Account;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for account response.
 */
public record AccountResponse(
        Long id,
        String accountNumber,
        String customerName,
        BigDecimal balance,
        String currency,
        Account.AccountStatus status,
        Account.AccountType type,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AccountResponse from(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getCustomerName(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus(),
                account.getType(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}
