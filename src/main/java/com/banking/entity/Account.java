package com.banking.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Account entity representing a bank account.
 * Uses optimistic locking with @Version to handle concurrent updates.
 */
@Entity
@Table(name = "accounts", indexes = {
    @Index(name = "idx_account_number", columnList = "accountNumber", unique = true),
    @Index(name = "idx_customer_name", columnList = "customerName")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Account number is required")
    @Column(nullable = false, unique = true, length = 20)
    private String accountNumber;

    @NotBlank(message = "Customer name is required")
    @Column(nullable = false, length = 100)
    private String customerName;

    @NotNull(message = "Balance is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Balance cannot be negative")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @NotBlank(message = "Currency is required")
    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccountType type;

    /**
     * Version field for optimistic locking.
     * This helps prevent lost updates in concurrent transactions.
     */
    @Version
    @Column(nullable = false)
    private Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum AccountStatus {
        ACTIVE,
        FROZEN,
        CLOSED
    }

    public enum AccountType {
        SAVINGS,
        CHECKING,
        BUSINESS
    }

    /**
     * Constructor for creating new accounts.
     */
    public Account(String accountNumber, String customerName, BigDecimal balance,
                   String currency, AccountType type) {
        this.accountNumber = accountNumber;
        this.customerName = customerName;
        this.balance = balance;
        this.currency = currency;
        this.type = type;
        this.status = AccountStatus.ACTIVE;
    }

    /**
     * Deposits money into the account.
     * @param amount the amount to deposit
     * @throws IllegalArgumentException if amount is negative or zero
     */
    public void deposit(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }
        if (this.status != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot deposit to a non-active account");
        }
        this.balance = this.balance.add(amount);
    }

    /**
     * Withdraws money from the account.
     * @param amount the amount to withdraw
     * @throws IllegalArgumentException if amount is negative or zero
     * @throws IllegalStateException if insufficient balance or account is not active
     */
    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }
        if (this.status != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot withdraw from a non-active account");
        }
        if (this.balance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient balance");
        }
        this.balance = this.balance.subtract(amount);
    }
}
