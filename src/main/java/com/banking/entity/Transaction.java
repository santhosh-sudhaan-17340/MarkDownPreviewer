package com.banking.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Transaction entity for maintaining an audit trail of all banking operations.
 * This is an immutable record - transactions should never be updated after creation.
 */
@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_account_id", columnList = "accountId"),
    @Index(name = "idx_transaction_type", columnList = "transactionType"),
    @Index(name = "idx_transaction_date", columnList = "transactionDate"),
    @Index(name = "idx_reference_number", columnList = "referenceNumber", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Account ID is required")
    @Column(nullable = false)
    private Long accountId;

    @Column(length = 20)
    private String accountNumber;

    @NotNull(message = "Transaction type is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType transactionType;

    @NotNull(message = "Amount is required")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Balance after transaction is required")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balanceAfter;

    @Column(length = 3)
    private String currency;

    @NotBlank(message = "Reference number is required")
    @Column(nullable = false, unique = true, length = 50)
    private String referenceNumber;

    @Column(length = 50)
    private String relatedAccountNumber;

    @Column(length = 255)
    private String description;

    @NotNull(message = "Transaction status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime transactionDate;

    @Column(length = 500)
    private String failureReason;

    public enum TransactionType {
        DEPOSIT,
        WITHDRAWAL,
        TRANSFER_OUT,
        TRANSFER_IN
    }

    public enum TransactionStatus {
        SUCCESS,
        FAILED,
        PENDING,
        REVERSED
    }

    /**
     * Constructor for creating a successful transaction.
     */
    public Transaction(Long accountId, String accountNumber, TransactionType type,
                      BigDecimal amount, BigDecimal balanceAfter, String currency,
                      String referenceNumber, String description) {
        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.transactionType = type;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.currency = currency;
        this.referenceNumber = referenceNumber;
        this.description = description;
        this.status = TransactionStatus.SUCCESS;
    }

    /**
     * Constructor for creating a failed transaction.
     */
    public Transaction(Long accountId, String accountNumber, TransactionType type,
                      BigDecimal amount, String referenceNumber, String failureReason) {
        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.transactionType = type;
        this.amount = amount;
        this.referenceNumber = referenceNumber;
        this.failureReason = failureReason;
        this.status = TransactionStatus.FAILED;
    }
}
