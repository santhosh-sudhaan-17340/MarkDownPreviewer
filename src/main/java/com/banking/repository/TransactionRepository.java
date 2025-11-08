package com.banking.repository;

import com.banking.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for Transaction entity.
 * Provides methods for querying transaction history and audit trails.
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Find all transactions for a specific account.
     */
    List<Transaction> findByAccountIdOrderByTransactionDateDesc(Long accountId);

    /**
     * Find all transactions for a specific account number.
     */
    List<Transaction> findByAccountNumberOrderByTransactionDateDesc(String accountNumber);

    /**
     * Find transactions by type for a specific account.
     */
    List<Transaction> findByAccountIdAndTransactionTypeOrderByTransactionDateDesc(
            Long accountId, Transaction.TransactionType transactionType);

    /**
     * Find transactions within a date range for a specific account.
     */
    @Query("SELECT t FROM Transaction t WHERE t.accountId = :accountId " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate " +
           "ORDER BY t.transactionDate DESC")
    List<Transaction> findByAccountIdAndDateRange(
            @Param("accountId") Long accountId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Find transaction by reference number.
     */
    java.util.Optional<Transaction> findByReferenceNumber(String referenceNumber);

    /**
     * Find all failed transactions for an account.
     */
    List<Transaction> findByAccountIdAndStatusOrderByTransactionDateDesc(
            Long accountId, Transaction.TransactionStatus status);

    /**
     * Count transactions by account and status.
     */
    long countByAccountIdAndStatus(Long accountId, Transaction.TransactionStatus status);
}
