package com.digitalwallet.ledger.service;

import com.digitalwallet.ledger.dto.TransactionResponse;
import com.digitalwallet.ledger.entity.Transaction;
import com.digitalwallet.ledger.entity.TransactionStatus;
import com.digitalwallet.ledger.entity.TransactionType;
import com.digitalwallet.ledger.entity.Wallet;
import com.digitalwallet.ledger.exception.ResourceNotFoundException;
import com.digitalwallet.ledger.repository.TransactionRepository;
import com.digitalwallet.ledger.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;

    /**
     * Generates a statement with filters and pagination
     */
    @Transactional(readOnly = true)
    public StatementResponse generateStatement(
            Long userId,
            TransactionType transactionType,
            TransactionStatus status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            int page,
            int size) {

        log.info("Generating statement for user {} with filters - type: {}, status: {}, start: {}, end: {}",
                userId, transactionType, status, startDate, endDate);

        // Get wallet
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        // Create pageable with sorting (newest first)
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        // Get filtered transactions
        Page<Transaction> transactionPage = transactionRepository.findByFilters(
                wallet.getId(),
                transactionType,
                status,
                startDate,
                endDate,
                pageable
        );

        // Map to DTOs
        List<TransactionResponse> transactions = transactionPage.getContent()
                .stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());

        return new StatementResponse(
                wallet.getUser().getFullName(),
                wallet.getUser().getUsername(),
                wallet.getBalance(),
                transactions,
                transactionPage.getTotalElements(),
                transactionPage.getTotalPages(),
                transactionPage.getNumber(),
                transactionPage.getSize(),
                transactionPage.isFirst(),
                transactionPage.isLast()
        );
    }

    /**
     * Gets transaction history for a user (simplified version without filters)
     */
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(Long userId, int page, int size) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Transaction> transactionPage = transactionRepository.findByWalletIdOrderByCreatedAtDesc(
                wallet.getId(), pageable);

        return transactionPage.map(this::mapToTransactionResponse);
    }

    /**
     * Gets a specific transaction by reference number
     */
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionByReference(String referenceNumber) {
        Transaction transaction = transactionRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Transaction not found with reference: " + referenceNumber));

        return mapToTransactionResponse(transaction);
    }

    /**
     * Gets all flagged transactions for a user
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getFlaggedTransactions(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));

        List<Transaction> flaggedTransactions = transactionRepository
                .findByWalletIdAndFlaggedForFraudTrue(wallet.getId());

        return flaggedTransactions.stream()
                .map(this::mapToTransactionResponse)
                .collect(Collectors.toList());
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

    /**
     * Inner class for statement response with pagination info
     */
    public static class StatementResponse {
        public final String accountHolderName;
        public final String username;
        public final java.math.BigDecimal currentBalance;
        public final List<TransactionResponse> transactions;
        public final long totalTransactions;
        public final int totalPages;
        public final int currentPage;
        public final int pageSize;
        public final boolean isFirstPage;
        public final boolean isLastPage;

        public StatementResponse(String accountHolderName, String username,
                                 java.math.BigDecimal currentBalance,
                                 List<TransactionResponse> transactions,
                                 long totalTransactions, int totalPages, int currentPage,
                                 int pageSize, boolean isFirstPage, boolean isLastPage) {
            this.accountHolderName = accountHolderName;
            this.username = username;
            this.currentBalance = currentBalance;
            this.transactions = transactions;
            this.totalTransactions = totalTransactions;
            this.totalPages = totalPages;
            this.currentPage = currentPage;
            this.pageSize = pageSize;
            this.isFirstPage = isFirstPage;
            this.isLastPage = isLastPage;
        }
    }
}
