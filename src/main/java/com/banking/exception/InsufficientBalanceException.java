package com.banking.exception;

import java.math.BigDecimal;

/**
 * Exception thrown when an account has insufficient balance for a transaction.
 */
public class InsufficientBalanceException extends RuntimeException {

    public InsufficientBalanceException(String message) {
        super(message);
    }

    public InsufficientBalanceException(String accountNumber, BigDecimal balance, BigDecimal required) {
        super(String.format("Insufficient balance in account %s. Available: %s, Required: %s",
                accountNumber, balance, required));
    }
}
