package com.banking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Main Spring Boot Application class for Banking Mini-Core System.
 *
 * Features:
 * - Transaction Management with different isolation levels
 * - Deadlock handling and automatic retry mechanisms
 * - Pessimistic and Optimistic locking strategies
 * - ACID compliance for all banking operations
 *
 * Access Points:
 * - REST API: http://localhost:8080/api/v1/accounts
 * - Swagger UI: http://localhost:8080/swagger-ui.html
 * - H2 Console: http://localhost:8080/h2-console
 * - API Docs: http://localhost:8080/api-docs
 */
@SpringBootApplication
@EnableTransactionManagement
@EnableRetry
public class BankingApplication {

    public static void main(String[] args) {
        SpringApplication.run(BankingApplication.class, args);
    }
}
