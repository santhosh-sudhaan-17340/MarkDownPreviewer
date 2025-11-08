package com.banking.dto;

import com.banking.entity.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for transaction response.
 */
public record TransactionResponse(
        Long id,
        String accountNumber,
        Transaction.TransactionType transactionType,
        BigDecimal amount,
        BigDecimal balanceAfter,
        String currency,
        String referenceNumber,
        String relatedAccountNumber,
        String description,
        Transaction.TransactionStatus status,
        LocalDateTime transactionDate,
        String failureReason
) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getAccountNumber(),
                transaction.getTransactionType(),
                transaction.getAmount(),
                transaction.getBalanceAfter(),
                transaction.getCurrency(),
                transaction.getReferenceNumber(),
                transaction.getRelatedAccountNumber(),
                transaction.getDescription(),
                transaction.getStatus(),
                transaction.getTransactionDate(),
                transaction.getFailureReason()
        );
    }
}
