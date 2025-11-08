package com.digitalwallet.ledger.dto;

import com.digitalwallet.ledger.entity.TransactionStatus;
import com.digitalwallet.ledger.entity.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {

    private Long id;
    private TransactionType transactionType;
    private BigDecimal amount;
    private BigDecimal balanceBefore;
    private BigDecimal balanceAfter;
    private TransactionStatus status;
    private String referenceNumber;
    private String description;
    private String counterpartyName;
    private Boolean flaggedForFraud;
    private String fraudReason;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
