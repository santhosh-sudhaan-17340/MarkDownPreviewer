package com.banking.config;

import com.banking.entity.Account;
import com.banking.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Data loader to initialize the database with sample accounts.
 * Runs automatically on application startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final AccountRepository accountRepository;

    @Override
    public void run(String... args) {
        log.info("Initializing database with sample data...");

        // Create sample accounts
        Account account1 = new Account(
                "ACC001",
                "John Doe",
                new BigDecimal("10000.00"),
                "USD",
                Account.AccountType.CHECKING
        );

        Account account2 = new Account(
                "ACC002",
                "Jane Smith",
                new BigDecimal("5000.00"),
                "USD",
                Account.AccountType.SAVINGS
        );

        Account account3 = new Account(
                "ACC003",
                "Bob Johnson",
                new BigDecimal("15000.00"),
                "USD",
                Account.AccountType.BUSINESS
        );

        Account account4 = new Account(
                "ACC004",
                "Alice Williams",
                new BigDecimal("7500.00"),
                "USD",
                Account.AccountType.CHECKING
        );

        accountRepository.save(account1);
        accountRepository.save(account2);
        accountRepository.save(account3);
        accountRepository.save(account4);

        log.info("Sample data initialized successfully:");
        log.info("  - Account {} created with balance {}", account1.getAccountNumber(), account1.getBalance());
        log.info("  - Account {} created with balance {}", account2.getAccountNumber(), account2.getBalance());
        log.info("  - Account {} created with balance {}", account3.getAccountNumber(), account3.getBalance());
        log.info("  - Account {} created with balance {}", account4.getAccountNumber(), account4.getBalance());
    }
}
