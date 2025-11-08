package com.digitalwallet.ledger.service;

import com.digitalwallet.ledger.entity.TransactionStatus;
import com.digitalwallet.ledger.entity.TransactionType;
import com.digitalwallet.ledger.entity.Wallet;
import com.digitalwallet.ledger.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

    private final TransactionRepository transactionRepository;

    @Value("${wallet.fraud.max-transaction-amount:50000.00}")
    private BigDecimal maxTransactionAmount;

    @Value("${wallet.fraud.max-transactions-per-hour:10}")
    private int maxTransactionsPerHour;

    /**
     * Checks for potential fraud indicators
     * Returns fraud reason if detected, null otherwise
     */
    public String checkForFraud(Wallet wallet, BigDecimal amount, TransactionType type) {
        // Check 1: Unusually large transaction
        if (amount.compareTo(maxTransactionAmount) > 0) {
            log.warn("Fraud detected: Transaction amount {} exceeds maximum {}", amount, maxTransactionAmount);
            return String.format("Transaction amount exceeds maximum allowed: %s", maxTransactionAmount);
        }

        // Check 2: Too many transactions in short period
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentTransactionCount = transactionRepository.countTransactionsSince(wallet.getId(), oneHourAgo);

        if (recentTransactionCount >= maxTransactionsPerHour) {
            log.warn("Fraud detected: {} transactions in last hour exceeds limit of {}",
                    recentTransactionCount, maxTransactionsPerHour);
            return String.format("Too many transactions in short period: %d in last hour", recentTransactionCount);
        }

        // Check 3: Rapid withdrawals after large deposit
        if (type == TransactionType.WITHDRAWAL || type == TransactionType.TRANSFER_SENT) {
            LocalDateTime last30Minutes = LocalDateTime.now().minusMinutes(30);
            Double recentDeposits = transactionRepository.sumAmountByTypeAndStatusSince(
                wallet.getId(), TransactionType.DEPOSIT, TransactionStatus.COMPLETED, last30Minutes);

            if (recentDeposits != null && recentDeposits > 0) {
                BigDecimal depositAmount = BigDecimal.valueOf(recentDeposits);
                // If withdrawal/transfer is more than 80% of recent deposit, flag it
                if (amount.compareTo(depositAmount.multiply(BigDecimal.valueOf(0.8))) > 0) {
                    log.warn("Fraud detected: Large withdrawal/transfer shortly after deposit");
                    return "Suspicious: Large withdrawal/transfer shortly after deposit";
                }
            }
        }

        return null; // No fraud detected
    }

    /**
     * Calculates a risk score (0-100) based on transaction patterns
     */
    public int calculateRiskScore(Wallet wallet, BigDecimal amount) {
        int riskScore = 0;

        // Factor 1: Transaction amount relative to max
        double amountRatio = amount.divide(maxTransactionAmount, 2, BigDecimal.ROUND_HALF_UP).doubleValue();
        riskScore += (int) (amountRatio * 30);

        // Factor 2: Transaction frequency
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentCount = transactionRepository.countTransactionsSince(wallet.getId(), oneHourAgo);
        double frequencyRatio = (double) recentCount / maxTransactionsPerHour;
        riskScore += (int) (frequencyRatio * 40);

        // Factor 3: Account age (newer accounts are riskier)
        LocalDateTime accountCreated = wallet.getCreatedAt();
        long daysOld = java.time.temporal.ChronoUnit.DAYS.between(accountCreated, LocalDateTime.now());
        if (daysOld < 7) {
            riskScore += 30;
        } else if (daysOld < 30) {
            riskScore += 15;
        }

        return Math.min(riskScore, 100);
    }
}
