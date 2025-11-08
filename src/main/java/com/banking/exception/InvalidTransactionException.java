package com.banking.exception;

/**
 * Exception thrown when a transaction is invalid.
 */
public class InvalidTransactionException extends RuntimeException {

    public InvalidTransactionException(String message) {
        super(message);
    }
}
