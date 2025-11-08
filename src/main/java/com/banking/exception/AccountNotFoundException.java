package com.banking.exception;

/**
 * Exception thrown when an account is not found.
 */
public class AccountNotFoundException extends RuntimeException {

    public AccountNotFoundException(String message) {
        super(message);
    }

    public AccountNotFoundException(String accountNumber, String field) {
        super(String.format("Account not found with %s: %s", field, accountNumber));
    }
}
