package com.banking.repository;

import com.banking.entity.Account;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Account entity.
 * Provides methods with different locking strategies for transaction management.
 */
@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    /**
     * Find account by account number (no locking).
     */
    Optional<Account> findByAccountNumber(String accountNumber);

    /**
     * Find account by account number with pessimistic write lock.
     * This prevents other transactions from reading or writing this row
     * until the current transaction completes.
     * Use this for operations that modify the account balance.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberWithLock(@Param("accountNumber") String accountNumber);

    /**
     * Find account by ID with pessimistic write lock.
     * This is crucial for preventing concurrent modifications
     * and avoiding deadlocks by always acquiring locks in a consistent order.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdWithLock(@Param("id") Long id);

    /**
     * Check if an account exists by account number.
     */
    boolean existsByAccountNumber(String accountNumber);

    /**
     * Find account by customer name (no locking).
     */
    Optional<Account> findByCustomerName(String customerName);
}
