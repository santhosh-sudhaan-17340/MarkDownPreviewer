package com.banking.exception;

/**
 * Exception thrown when a transaction should be retried due to deadlock or optimistic locking failure.
 */
public class TransactionRetryException extends RuntimeException {

    public TransactionRetryException(String message) {
        super(message);
    }

    public TransactionRetryException(String message, Throwable cause) {
        super(message, cause);
    }
}
