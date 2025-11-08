package com.digitalwallet.ledger.repository;

import com.digitalwallet.ledger.entity.Transaction;
import com.digitalwallet.ledger.entity.TransactionStatus;
import com.digitalwallet.ledger.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByReferenceNumber(String referenceNumber);

    Page<Transaction> findByWalletId(Long walletId, Pageable pageable);

    Page<Transaction> findByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.wallet.id = :walletId " +
           "AND (:transactionType IS NULL OR t.transactionType = :transactionType) " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:startDate IS NULL OR t.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR t.createdAt <= :endDate) " +
           "ORDER BY t.createdAt DESC")
    Page<Transaction> findByFilters(
        @Param("walletId") Long walletId,
        @Param("transactionType") TransactionType transactionType,
        @Param("status") TransactionStatus status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.wallet.id = :walletId " +
           "AND t.createdAt >= :since")
    long countTransactionsSince(
        @Param("walletId") Long walletId,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT SUM(t.amount) FROM Transaction t WHERE t.wallet.id = :walletId " +
           "AND t.transactionType = :transactionType " +
           "AND t.status = :status " +
           "AND t.createdAt >= :since")
    Double sumAmountByTypeAndStatusSince(
        @Param("walletId") Long walletId,
        @Param("transactionType") TransactionType transactionType,
        @Param("status") TransactionStatus status,
        @Param("since") LocalDateTime since
    );

    List<Transaction> findByWalletIdAndFlaggedForFraudTrue(Long walletId);
}
