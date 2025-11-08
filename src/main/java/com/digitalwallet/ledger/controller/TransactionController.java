package com.digitalwallet.ledger.controller;

import com.digitalwallet.ledger.dto.TransactionResponse;
import com.digitalwallet.ledger.entity.TransactionStatus;
import com.digitalwallet.ledger.entity.TransactionType;
import com.digitalwallet.ledger.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Tag(name = "Transaction & Statements", description = "Transaction history and statement generation")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping("/user/{userId}/history")
    @Operation(summary = "Get transaction history", description = "Gets paginated transaction history for a user")
    public ResponseEntity<Page<TransactionResponse>> getTransactionHistory(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TransactionResponse> transactions = transactionService.getTransactionHistory(userId, page, size);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/user/{userId}/statement")
    @Operation(summary = "Generate statement", description = "Generates a filtered statement with pagination")
    public ResponseEntity<TransactionService.StatementResponse> generateStatement(
            @PathVariable Long userId,
            @RequestParam(required = false) TransactionType transactionType,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        TransactionService.StatementResponse statement = transactionService.generateStatement(
                userId, transactionType, status, startDate, endDate, page, size);
        return ResponseEntity.ok(statement);
    }

    @GetMapping("/reference/{referenceNumber}")
    @Operation(summary = "Get transaction by reference", description = "Gets a specific transaction by reference number")
    public ResponseEntity<TransactionResponse> getTransactionByReference(@PathVariable String referenceNumber) {
        TransactionResponse transaction = transactionService.getTransactionByReference(referenceNumber);
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/user/{userId}/flagged")
    @Operation(summary = "Get flagged transactions", description = "Gets all fraud-flagged transactions for a user")
    public ResponseEntity<List<TransactionResponse>> getFlaggedTransactions(@PathVariable Long userId) {
        List<TransactionResponse> flaggedTransactions = transactionService.getFlaggedTransactions(userId);
        return ResponseEntity.ok(flaggedTransactions);
    }
}
