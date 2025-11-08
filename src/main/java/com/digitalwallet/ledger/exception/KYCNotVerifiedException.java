package com.digitalwallet.ledger.exception;

public class KYCNotVerifiedException extends RuntimeException {
    public KYCNotVerifiedException(String message) {
        super(message);
    }
}
