package com.digitalwallet.ledger.exception;

public class WithdrawalLimitExceededException extends RuntimeException {
    public WithdrawalLimitExceededException(String message) {
        super(message);
    }
}
