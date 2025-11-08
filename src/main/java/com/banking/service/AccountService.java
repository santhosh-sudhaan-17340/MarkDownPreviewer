package com.banking.service;

import com.banking.dto.*;
import com.banking.entity.Account;
import com.banking.entity.Transaction;
import com.banking.exception.*;
import com.banking.repository.AccountRepository;
import com.banking.repository.TransactionRepository;
import jakarta.persistence.OptimisticLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DeadlockLoserDataAccessException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for banking operations.
 * Implements transaction management with different isolation levels,
 * deadlock handling, and automatic retry mechanisms.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Creates a new bank account.
     * Uses default isolation level (READ_COMMITTED).
     */
    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request) {
        log.info("Creating new account: {}", request.accountNumber());

        // Check if account already exists
        if (accountRepository.existsByAccountNumber(request.accountNumber())) {
            throw new InvalidTransactionException(
                    "Account with number " + request.accountNumber() + " already exists");
        }

        Account account = new Account(
                request.accountNumber(),
                request.customerName(),
                request.initialBalance(),
                request.currency(),
                request.accountType()
        );

        Account savedAccount = accountRepository.save(account);
        log.info("Account created successfully: {}", savedAccount.getAccountNumber());

        return AccountResponse.from(savedAccount);
    }

    /**
     * Retrieves an account by account number.
     * Read-only operation with READ_COMMITTED isolation level.
     */
    @Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
    public AccountResponse getAccount(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException(accountNumber, "account number"));
        return AccountResponse.from(account);
    }

    /**
     * Deposits money into an account.
     * Uses REPEATABLE_READ isolation level to ensure consistency.
     * Implements retry mechanism for deadlock handling.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
            retryFor = {DeadlockLoserDataAccessException.class, CannotAcquireLockException.class,
                       ObjectOptimisticLockingFailureException.class},
            maxAttempts = 3,
            backoff = @Backoff(delay = 100, multiplier = 2)
    )
    public TransactionResponse deposit(TransactionRequest request) {
        log.info("Processing deposit for account: {}, amount: {}",
                request.accountNumber(), request.amount());

        String referenceNumber = generateReferenceNumber("DEP");

        try {
            // Acquire pessimistic lock on account
            Account account = accountRepository.findByAccountNumberWithLock(request.accountNumber())
                    .orElseThrow(() -> new AccountNotFoundException(request.accountNumber(), "account number"));

            // Validate account status
            if (account.getStatus() != Account.AccountStatus.ACTIVE) {
                throw new InvalidTransactionException(
                        "Cannot deposit to a non-active account: " + account.getStatus());
            }

            // Perform deposit
            account.deposit(request.amount());
            Account savedAccount = accountRepository.save(account);

            // Create transaction record
            Transaction txn = new Transaction(
                    savedAccount.getId(),
                    savedAccount.getAccountNumber(),
                    Transaction.TransactionType.DEPOSIT,
                    request.amount(),
                    savedAccount.getBalance(),
                    savedAccount.getCurrency(),
                    referenceNumber,
                    request.description()
            );
            Transaction savedTxn = transactionRepository.save(txn);

            log.info("Deposit successful. Reference: {}, New balance: {}",
                    referenceNumber, savedAccount.getBalance());

            return TransactionResponse.from(savedTxn);

        } catch (Exception e) {
            log.error("Deposit failed for reference: {}", referenceNumber, e);
            // Record failed transaction
            recordFailedTransaction(null, request.accountNumber(),
                    Transaction.TransactionType.DEPOSIT, request.amount(), referenceNumber, e.getMessage());
            throw e;
        }
    }

    /**
     * Withdraws money from an account.
     * Uses REPEATABLE_READ isolation level to prevent phantom reads.
     * Implements retry mechanism for deadlock handling.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    @Retryable(
            retryFor = {DeadlockLoserDataAccessException.class, CannotAcquireLockException.class,
                       ObjectOptimisticLockingFailureException.class},
            maxAttempts = 3,
            backoff = @Backoff(delay = 100, multiplier = 2)
    )
    public TransactionResponse withdraw(TransactionRequest request) {
        log.info("Processing withdrawal for account: {}, amount: {}",
                request.accountNumber(), request.amount());

        String referenceNumber = generateReferenceNumber("WDR");

        try {
            // Acquire pessimistic lock on account
            Account account = accountRepository.findByAccountNumberWithLock(request.accountNumber())
                    .orElseThrow(() -> new AccountNotFoundException(request.accountNumber(), "account number"));

            // Validate account status
            if (account.getStatus() != Account.AccountStatus.ACTIVE) {
                throw new InvalidTransactionException(
                        "Cannot withdraw from a non-active account: " + account.getStatus());
            }

            // Check sufficient balance
            if (account.getBalance().compareTo(request.amount()) < 0) {
                throw new InsufficientBalanceException(
                        account.getAccountNumber(), account.getBalance(), request.amount());
            }

            // Perform withdrawal
            account.withdraw(request.amount());
            Account savedAccount = accountRepository.save(account);

            // Create transaction record
            Transaction txn = new Transaction(
                    savedAccount.getId(),
                    savedAccount.getAccountNumber(),
                    Transaction.TransactionType.WITHDRAWAL,
                    request.amount(),
                    savedAccount.getBalance(),
                    savedAccount.getCurrency(),
                    referenceNumber,
                    request.description()
            );
            Transaction savedTxn = transactionRepository.save(txn);

            log.info("Withdrawal successful. Reference: {}, New balance: {}",
                    referenceNumber, savedAccount.getBalance());

            return TransactionResponse.from(savedTxn);

        } catch (Exception e) {
            log.error("Withdrawal failed for reference: {}", referenceNumber, e);
            // Record failed transaction
            recordFailedTransaction(null, request.accountNumber(),
                    Transaction.TransactionType.WITHDRAWAL, request.amount(), referenceNumber, e.getMessage());
            throw e;
        }
    }

    /**
     * Transfers money between two accounts.
     * Uses SERIALIZABLE isolation level to prevent all concurrency anomalies.
     * Implements deadlock prevention by always acquiring locks in order (by account ID).
     * Implements retry mechanism for deadlock handling.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    @Retryable(
            retryFor = {DeadlockLoserDataAccessException.class, CannotAcquireLockException.class,
                       ObjectOptimisticLockingFailureException.class},
            maxAttempts = 3,
            backoff = @Backoff(delay = 100, multiplier = 2)
    )
    public List<TransactionResponse> transfer(TransferRequest request) {
        log.info("Processing transfer from {} to {}, amount: {}",
                request.fromAccountNumber(), request.toAccountNumber(), request.amount());

        String referenceNumber = generateReferenceNumber("TRF");

        try {
            // Validate that source and destination are different
            if (request.fromAccountNumber().equals(request.toAccountNumber())) {
                throw new InvalidTransactionException("Cannot transfer to the same account");
            }

            // Find both accounts first (without locks)
            Account fromAccount = accountRepository.findByAccountNumber(request.fromAccountNumber())
                    .orElseThrow(() -> new AccountNotFoundException(request.fromAccountNumber(), "account number"));
            Account toAccount = accountRepository.findByAccountNumber(request.toAccountNumber())
                    .orElseThrow(() -> new AccountNotFoundException(request.toAccountNumber(), "account number"));

            // Deadlock prevention: acquire locks in consistent order (by ID)
            Account firstLock, secondLock;
            if (fromAccount.getId() < toAccount.getId()) {
                firstLock = accountRepository.findByIdWithLock(fromAccount.getId()).orElseThrow();
                secondLock = accountRepository.findByIdWithLock(toAccount.getId()).orElseThrow();
            } else {
                firstLock = accountRepository.findByIdWithLock(toAccount.getId()).orElseThrow();
                secondLock = accountRepository.findByIdWithLock(fromAccount.getId()).orElseThrow();
            }

            // Re-assign to correct variables
            if (fromAccount.getId() < toAccount.getId()) {
                fromAccount = firstLock;
                toAccount = secondLock;
            } else {
                fromAccount = secondLock;
                toAccount = firstLock;
            }

            // Validate both accounts are active
            if (fromAccount.getStatus() != Account.AccountStatus.ACTIVE) {
                throw new InvalidTransactionException(
                        "Source account is not active: " + fromAccount.getStatus());
            }
            if (toAccount.getStatus() != Account.AccountStatus.ACTIVE) {
                throw new InvalidTransactionException(
                        "Destination account is not active: " + toAccount.getStatus());
            }

            // Validate currency match
            if (!fromAccount.getCurrency().equals(toAccount.getCurrency())) {
                throw new InvalidTransactionException(
                        "Currency mismatch: " + fromAccount.getCurrency() + " vs " + toAccount.getCurrency());
            }

            // Check sufficient balance
            if (fromAccount.getBalance().compareTo(request.amount()) < 0) {
                throw new InsufficientBalanceException(
                        fromAccount.getAccountNumber(), fromAccount.getBalance(), request.amount());
            }

            // Perform the transfer
            fromAccount.withdraw(request.amount());
            toAccount.deposit(request.amount());

            Account savedFromAccount = accountRepository.save(fromAccount);
            Account savedToAccount = accountRepository.save(toAccount);

            // Create transaction records for both accounts
            Transaction fromTxn = new Transaction(
                    savedFromAccount.getId(),
                    savedFromAccount.getAccountNumber(),
                    Transaction.TransactionType.TRANSFER_OUT,
                    request.amount(),
                    savedFromAccount.getBalance(),
                    savedFromAccount.getCurrency(),
                    referenceNumber + "-OUT",
                    request.description()
            );
            fromTxn.setRelatedAccountNumber(savedToAccount.getAccountNumber());

            Transaction toTxn = new Transaction(
                    savedToAccount.getId(),
                    savedToAccount.getAccountNumber(),
                    Transaction.TransactionType.TRANSFER_IN,
                    request.amount(),
                    savedToAccount.getBalance(),
                    savedToAccount.getCurrency(),
                    referenceNumber + "-IN",
                    request.description()
            );
            toTxn.setRelatedAccountNumber(savedFromAccount.getAccountNumber());

            Transaction savedFromTxn = transactionRepository.save(fromTxn);
            Transaction savedToTxn = transactionRepository.save(toTxn);

            log.info("Transfer successful. Reference: {}, From balance: {}, To balance: {}",
                    referenceNumber, savedFromAccount.getBalance(), savedToAccount.getBalance());

            return List.of(
                    TransactionResponse.from(savedFromTxn),
                    TransactionResponse.from(savedToTxn)
            );

        } catch (Exception e) {
            log.error("Transfer failed for reference: {}", referenceNumber, e);
            // Record failed transactions
            recordFailedTransaction(null, request.fromAccountNumber(),
                    Transaction.TransactionType.TRANSFER_OUT, request.amount(),
                    referenceNumber + "-OUT", e.getMessage());
            recordFailedTransaction(null, request.toAccountNumber(),
                    Transaction.TransactionType.TRANSFER_IN, request.amount(),
                    referenceNumber + "-IN", e.getMessage());
            throw e;
        }
    }

    /**
     * Retrieves transaction history for an account.
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionHistory(String accountNumber) {
        // Verify account exists
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException(accountNumber, "account number"));

        List<Transaction> transactions = transactionRepository
                .findByAccountNumberOrderByTransactionDateDesc(accountNumber);

        return transactions.stream()
                .map(TransactionResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Gets all accounts.
     */
    @Transactional(readOnly = true)
    public List<AccountResponse> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(AccountResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * Generates a unique reference number for transactions.
     */
    private String generateReferenceNumber(String prefix) {
        return prefix + "-" + LocalDateTime.now().toString().replace(":", "").replace(".", "")
                + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    /**
     * Records a failed transaction for audit purposes.
     */
    private void recordFailedTransaction(Long accountId, String accountNumber,
                                        Transaction.TransactionType type, BigDecimal amount,
                                        String referenceNumber, String failureReason) {
        try {
            Transaction failedTxn = new Transaction(
                    accountId, accountNumber, type, amount, referenceNumber, failureReason);
            transactionRepository.save(failedTxn);
        } catch (Exception e) {
            log.error("Failed to record failed transaction", e);
        }
    }
}
