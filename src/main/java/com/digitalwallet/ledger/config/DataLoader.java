package com.digitalwallet.ledger.config;

import com.digitalwallet.ledger.dto.DepositRequest;
import com.digitalwallet.ledger.dto.TransferRequest;
import com.digitalwallet.ledger.dto.UserRegistrationRequest;
import com.digitalwallet.ledger.entity.KYCStatus;
import com.digitalwallet.ledger.service.UserService;
import com.digitalwallet.ledger.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataLoader {

    private final UserService userService;
    private final WalletService walletService;

    @Bean
    public CommandLineRunner loadSampleData() {
        return args -> {
            log.info("Loading sample data...");

            try {
                // Create sample users
                UserRegistrationRequest user1 = new UserRegistrationRequest();
                user1.setUsername("alice");
                user1.setEmail("alice@example.com");
                user1.setFullName("Alice Johnson");
                user1.setPhoneNumber("+1-555-0101");
                var alice = userService.registerUser(user1);
                userService.updateKYCStatus(alice.getId(), KYCStatus.VERIFIED, "https://docs.example.com/alice-kyc");

                UserRegistrationRequest user2 = new UserRegistrationRequest();
                user2.setUsername("bob");
                user2.setEmail("bob@example.com");
                user2.setFullName("Bob Smith");
                user2.setPhoneNumber("+1-555-0102");
                var bob = userService.registerUser(user2);
                userService.updateKYCStatus(bob.getId(), KYCStatus.VERIFIED, "https://docs.example.com/bob-kyc");

                UserRegistrationRequest user3 = new UserRegistrationRequest();
                user3.setUsername("charlie");
                user3.setEmail("charlie@example.com");
                user3.setFullName("Charlie Brown");
                user3.setPhoneNumber("+1-555-0103");
                var charlie = userService.registerUser(user3);
                userService.updateKYCStatus(charlie.getId(), KYCStatus.PENDING_VERIFICATION, null);

                log.info("Created 3 sample users: alice, bob, charlie");

                // Add initial balances
                DepositRequest deposit1 = new DepositRequest();
                deposit1.setUserId(alice.getId());
                deposit1.setAmount(new BigDecimal("5000.00"));
                deposit1.setDescription("Initial deposit");
                walletService.deposit(deposit1);

                DepositRequest deposit2 = new DepositRequest();
                deposit2.setUserId(bob.getId());
                deposit2.setAmount(new BigDecimal("3000.00"));
                deposit2.setDescription("Initial deposit");
                walletService.deposit(deposit2);

                DepositRequest deposit3 = new DepositRequest();
                deposit3.setUserId(charlie.getId());
                deposit3.setAmount(new BigDecimal("1000.00"));
                deposit3.setDescription("Initial deposit");
                walletService.deposit(deposit3);

                log.info("Added initial deposits to all wallets");

                // Create sample transfers
                TransferRequest transfer1 = new TransferRequest();
                transfer1.setFromUserId(alice.getId());
                transfer1.setToUserId(bob.getId());
                transfer1.setAmount(new BigDecimal("500.00"));
                transfer1.setDescription("Payment for services");
                transfer1.setIpAddress("192.168.1.100");
                walletService.transfer(transfer1);

                TransferRequest transfer2 = new TransferRequest();
                transfer2.setFromUserId(bob.getId());
                transfer2.setToUserId(charlie.getId());
                transfer2.setAmount(new BigDecimal("250.00"));
                transfer2.setDescription("Shared lunch payment");
                transfer2.setIpAddress("192.168.1.101");
                walletService.transfer(transfer2);

                log.info("Created sample transfers");

                log.info("Sample data loaded successfully!");
                log.info("==============================================");
                log.info("You can now test the API endpoints:");
                log.info("- Swagger UI: http://localhost:8080/swagger-ui.html");
                log.info("- H2 Console: http://localhost:8080/h2-console");
                log.info("  JDBC URL: jdbc:h2:mem:walletdb");
                log.info("  Username: sa");
                log.info("  Password: (leave blank)");
                log.info("==============================================");

            } catch (Exception e) {
                log.error("Error loading sample data: {}", e.getMessage(), e);
            }
        };
    }
}
