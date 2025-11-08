package com.digitalwallet.ledger.service;

import com.digitalwallet.ledger.dto.*;
import com.digitalwallet.ledger.entity.*;
import com.digitalwallet.ledger.exception.*;
import com.digitalwallet.ledger.repository.TransactionRepository;
import com.digitalwallet.ledger.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final FraudDetectionService fraudDetectionService;

    @Value("${wallet.withdrawal.daily-limit:10000.00}")
    private BigDecimal defaultDailyLimit;

    /**
     * Deposits money into a wallet
     * Uses SERIALIZABLE isolation to prevent race conditions
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransactionResponse deposit(DepositRequest request) {
        log.info("Processing deposit for user {} amount {}", request.getUserId(), request.getAmount());

        try {
            // Get wallet with pessimistic lock
            Wallet wallet = walletRepository.findByUserIdWithLock(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + request.getUserId()));

            // Validate wallet is not frozen
            if (wallet.getFrozen()) {
                throw new WalletFrozenException("Wallet is frozen: " + wallet.getFrozenReason());
            }

            // Create transaction record
            Transaction transaction = new Transaction();
            transaction.setWallet(wallet);
            transaction.setTransactionType(TransactionType.DEPOSIT);
            transaction.setAmount(request.getAmount());
            transaction.setBalanceBefore(wallet.getBalance());
            transaction.setStatus(TransactionStatus.PENDING);
            transaction.setReferenceNumber(generateReferenceNumber());
            transaction.setDescription(request.getDescription());

            // Update wallet balance
            BigDecimal newBalance = wallet.getBalance().add(request.getAmount());
            wallet.setBalance(newBalance);
            transaction.setBalanceAfter(newBalance);

            // Complete transaction
            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setCompletedAt(LocalDateTime.now());

            // Save changes
            walletRepository.save(wallet);
            Transaction savedTransaction = transactionRepository.save(transaction);

            log.info("Deposit completed successfully. Reference: {}", savedTransaction.getReferenceNumber());
            return mapToTransactionResponse(savedTransaction);

        } catch (Exception e) {
            log.error("Deposit failed for user {}: {}", request.getUserId(), e.getMessage(), e);
            throw e; // Transaction will be rolled back
        }
    }

    /**
     * Withdraws money from a wallet with limit checks and fraud detection
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransactionResponse withdraw(WithdrawalRequest request) {
        log.info("Processing withdrawal for user {} amount {}", request.getUserId(), request.getAmount());

        try {
            // Get wallet with pessimistic lock
            Wallet wallet = walletRepository.findByUserIdWithLock(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + request.getUserId()));

            // Validate wallet is not frozen
            if (wallet.getFrozen()) {
                throw new WalletFrozenException("Wallet is frozen: " + wallet.getFrozenReason());
            }

            // Validate KYC for large withdrawals
            if (request.getAmount().compareTo(new BigDecimal("5000")) > 0) {
                if (wallet.getUser().getKycStatus() != KYCStatus.VERIFIED) {
                    throw new KYCNotVerifiedException("KYC verification required for withdrawals above 5000");
                }
            }

            // Check sufficient balance
            if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
                throw new InsufficientBalanceException(
                        String.format("Insufficient balance. Available: %s, Requested: %s",
                                wallet.getBalance(), request.getAmount()));
            }

            // Reset daily withdrawal counter if needed
            resetDailyWithdrawalIfNeeded(wallet);

            // Check daily withdrawal limit
            BigDecimal totalWithdrawalToday = wallet.getWithdrawnToday().add(request.getAmount());
            if (totalWithdrawalToday.compareTo(wallet.getDailyWithdrawalLimit()) > 0) {
                throw new WithdrawalLimitExceededException(
                        String.format("Daily withdrawal limit exceeded. Limit: %s, Already withdrawn: %s, Requested: %s",
                                wallet.getDailyWithdrawalLimit(), wallet.getWithdrawnToday(), request.getAmount()));
            }

            // Fraud detection
            String fraudReason = fraudDetectionService.checkForFraud(wallet, request.getAmount(), TransactionType.WITHDRAWAL);

            // Create transaction record
            Transaction transaction = new Transaction();
            transaction.setWallet(wallet);
            transaction.setTransactionType(TransactionType.WITHDRAWAL);
            transaction.setAmount(request.getAmount());
            transaction.setBalanceBefore(wallet.getBalance());
            transaction.setStatus(TransactionStatus.PENDING);
            transaction.setReferenceNumber(generateReferenceNumber());
            transaction.setDescription(request.getDescription());
            transaction.setIpAddress(request.getIpAddress());
            transaction.setUserAgent(request.getUserAgent());

            if (fraudReason != null) {
                transaction.setFlaggedForFraud(true);
                transaction.setFraudReason(fraudReason);
                transaction.setStatus(TransactionStatus.FRAUD_BLOCKED);
                transactionRepository.save(transaction);

                log.warn("Withdrawal blocked due to fraud detection: {}", fraudReason);
                throw new FraudDetectedException(fraudReason);
            }

            // Update wallet balance and withdrawal tracking
            BigDecimal newBalance = wallet.getBalance().subtract(request.getAmount());
            wallet.setBalance(newBalance);
            wallet.setWithdrawnToday(totalWithdrawalToday);
            transaction.setBalanceAfter(newBalance);

            // Complete transaction
            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setCompletedAt(LocalDateTime.now());

            // Save changes
            walletRepository.save(wallet);
            Transaction savedTransaction = transactionRepository.save(transaction);

            log.info("Withdrawal completed successfully. Reference: {}", savedTransaction.getReferenceNumber());
            return mapToTransactionResponse(savedTransaction);

        } catch (Exception e) {
            log.error("Withdrawal failed for user {}: {}", request.getUserId(), e.getMessage(), e);
            throw e; // Transaction will be rolled back
        }
    }

    /**
     * Transfers money between wallets
     * Uses SERIALIZABLE isolation and pessimistic locking to prevent race conditions
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransferResult transfer(TransferRequest request) {
        log.info("Processing transfer from user {} to user {} amount {}",
                request.getFromUserId(), request.getToUserId(), request.getAmount());

        try {
            // Validate not transferring to self
            if (request.getFromUserId().equals(request.getToUserId())) {
                throw new IllegalArgumentException("Cannot transfer to the same wallet");
            }

            // Get both wallets with pessimistic locks (in consistent order to prevent deadlock)
            Long firstLockId = Math.min(request.getFromUserId(), request.getToUserId());
            Long secondLockId = Math.max(request.getFromUserId(), request.getToUserId());

            Wallet firstWallet = walletRepository.findByUserIdWithLock(firstLockId)
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + firstLockId));
            Wallet secondWallet = walletRepository.findByUserIdWithLock(secondLockId)
                    .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + secondLockId));

            // Assign sender and receiver based on request
            Wallet fromWallet = request.getFromUserId().equals(firstLockId) ? firstWallet : secondWallet;
            Wallet toWallet = request.getFromUserId().equals(firstLockId) ? secondWallet : firstWallet;

            // Validate both wallets are not frozen
            if (fromWallet.getFrozen()) {
                throw new WalletFrozenException("Sender wallet is frozen: " + fromWallet.getFrozenReason());
            }
            if (toWallet.getFrozen()) {
                throw new WalletFrozenException("Receiver wallet is frozen: " + toWallet.getFrozenReason());
            }

            // Validate KYC for large transfers
            if (request.getAmount().compareTo(new BigDecimal("5000")) > 0) {
                if (fromWallet.getUser().getKycStatus() != KYCStatus.VERIFIED) {
                    throw new KYCNotVerifiedException("KYC verification required for transfers above 5000");
                }
            }

            // Check sufficient balance
            if (fromWallet.getBalance().compareTo(request.getAmount()) < 0) {
                throw new InsufficientBalanceException(
                        String.format("Insufficient balance. Available: %s, Requested: %s",
                                fromWallet.getBalance(), request.getAmount()));
            }

            // Reset daily withdrawal counter if needed (transfers count as withdrawals)
            resetDailyWithdrawalIfNeeded(fromWallet);

            // Check daily withdrawal limit
            BigDecimal totalWithdrawalToday = fromWallet.getWithdrawnToday().add(request.getAmount());
            if (totalWithdrawalToday.compareTo(fromWallet.getDailyWithdrawalLimit()) > 0) {
                throw new WithdrawalLimitExceededException(
                        String.format("Daily withdrawal limit exceeded. Limit: %s, Already withdrawn: %s, Requested: %s",
                                fromWallet.getDailyWithdrawalLimit(), fromWallet.getWithdrawnToday(), request.getAmount()));
            }

            // Fraud detection
            String fraudReason = fraudDetectionService.checkForFraud(fromWallet, request.getAmount(), TransactionType.TRANSFER_SENT);

            String referenceNumber = generateReferenceNumber();

            // Create sender transaction
            Transaction senderTransaction = new Transaction();
            senderTransaction.setWallet(fromWallet);
            senderTransaction.setTransactionType(TransactionType.TRANSFER_SENT);
            senderTransaction.setAmount(request.getAmount());
            senderTransaction.setBalanceBefore(fromWallet.getBalance());
            senderTransaction.setStatus(TransactionStatus.PENDING);
            senderTransaction.setReferenceNumber(referenceNumber);
            senderTransaction.setDescription(request.getDescription());
            senderTransaction.setCounterpartyWallet(toWallet);
            senderTransaction.setCounterpartyName(toWallet.getUser().getFullName());
            senderTransaction.setIpAddress(request.getIpAddress());
            senderTransaction.setUserAgent(request.getUserAgent());

            // Create receiver transaction
            Transaction receiverTransaction = new Transaction();
            receiverTransaction.setWallet(toWallet);
            receiverTransaction.setTransactionType(TransactionType.TRANSFER_RECEIVED);
            receiverTransaction.setAmount(request.getAmount());
            receiverTransaction.setBalanceBefore(toWallet.getBalance());
            receiverTransaction.setStatus(TransactionStatus.PENDING);
            receiverTransaction.setReferenceNumber(referenceNumber);
            receiverTransaction.setDescription(request.getDescription());
            receiverTransaction.setCounterpartyWallet(fromWallet);
            receiverTransaction.setCounterpartyName(fromWallet.getUser().getFullName());

            if (fraudReason != null) {
                senderTransaction.setFlaggedForFraud(true);
                senderTransaction.setFraudReason(fraudReason);
                senderTransaction.setStatus(TransactionStatus.FRAUD_BLOCKED);
                receiverTransaction.setStatus(TransactionStatus.FRAUD_BLOCKED);

                transactionRepository.save(senderTransaction);
                transactionRepository.save(receiverTransaction);

                log.warn("Transfer blocked due to fraud detection: {}", fraudReason);
                throw new FraudDetectedException(fraudReason);
            }

            // Update balances
            BigDecimal fromNewBalance = fromWallet.getBalance().subtract(request.getAmount());
            BigDecimal toNewBalance = toWallet.getBalance().add(request.getAmount());

            fromWallet.setBalance(fromNewBalance);
            fromWallet.setWithdrawnToday(totalWithdrawalToday);
            toWallet.setBalance(toNewBalance);

            senderTransaction.setBalanceAfter(fromNewBalance);
            receiverTransaction.setBalanceAfter(toNewBalance);

            // Complete transactions
            LocalDateTime completedAt = LocalDateTime.now();
            senderTransaction.setStatus(TransactionStatus.COMPLETED);
            senderTransaction.setCompletedAt(completedAt);
            receiverTransaction.setStatus(TransactionStatus.COMPLETED);
            receiverTransaction.setCompletedAt(completedAt);

            // Save all changes
            walletRepository.save(fromWallet);
            walletRepository.save(toWallet);
            Transaction savedSenderTxn = transactionRepository.save(senderTransaction);
            Transaction savedReceiverTxn = transactionRepository.save(receiverTransaction);

            log.info("Transfer completed successfully. Reference: {}", referenceNumber);

            return new TransferResult(
                    mapToTransactionResponse(savedSenderTxn),
                    mapToTransactionResponse(savedReceiverTxn)
            );

        } catch (Exception e) {
            log.error("Transfer failed from user {} to user {}: {}",
                    request.getFromUserId(), request.getToUserId(), e.getMessage(), e);
            throw e; // Transaction will be rolled back
        }
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        resetDailyWithdrawalIfNeeded(wallet);

        BigDecimal remainingLimit = wallet.getDailyWithdrawalLimit().subtract(wallet.getWithdrawnToday());

        return WalletResponse.builder()
                .id(wallet.getId())
                .userId(wallet.getUser().getId())
                .username(wallet.getUser().getUsername())
                .balance(wallet.getBalance())
                .dailyWithdrawalLimit(wallet.getDailyWithdrawalLimit())
                .withdrawnToday(wallet.getWithdrawnToday())
                .remainingDailyLimit(remainingLimit.max(BigDecimal.ZERO))
                .frozen(wallet.getFrozen())
                .frozenReason(wallet.getFrozenReason())
                .createdAt(wallet.getCreatedAt())
                .build();
    }

    @Transactional
    public void freezeWallet(Long userId, String reason) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        wallet.setFrozen(true);
        wallet.setFrozenReason(reason);
        walletRepository.save(wallet);

        log.warn("Wallet frozen for user {}: {}", userId, reason);
    }

    @Transactional
    public void unfreezeWallet(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        wallet.setFrozen(false);
        wallet.setFrozenReason(null);
        walletRepository.save(wallet);

        log.info("Wallet unfrozen for user {}", userId);
    }

    private void resetDailyWithdrawalIfNeeded(Wallet wallet) {
        LocalDateTime lastReset = wallet.getLastWithdrawalReset();
        LocalDate today = LocalDate.now();

        if (lastReset == null || lastReset.toLocalDate().isBefore(today)) {
            wallet.setWithdrawnToday(BigDecimal.ZERO);
            wallet.setLastWithdrawalReset(LocalDateTime.of(today, LocalTime.MIDNIGHT));
        }
    }

    private String generateReferenceNumber() {
        return "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private TransactionResponse mapToTransactionResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .transactionType(transaction.getTransactionType())
                .amount(transaction.getAmount())
                .balanceBefore(transaction.getBalanceBefore())
                .balanceAfter(transaction.getBalanceAfter())
                .status(transaction.getStatus())
                .referenceNumber(transaction.getReferenceNumber())
                .description(transaction.getDescription())
                .counterpartyName(transaction.getCounterpartyName())
                .flaggedForFraud(transaction.getFlaggedForFraud())
                .fraudReason(transaction.getFraudReason())
                .createdAt(transaction.getCreatedAt())
                .completedAt(transaction.getCompletedAt())
                .build();
    }

    // Inner class for transfer result
    public static class TransferResult {
        public final TransactionResponse senderTransaction;
        public final TransactionResponse receiverTransaction;

        public TransferResult(TransactionResponse senderTransaction, TransactionResponse receiverTransaction) {
            this.senderTransaction = senderTransaction;
            this.receiverTransaction = receiverTransaction;
        }
    }
}
