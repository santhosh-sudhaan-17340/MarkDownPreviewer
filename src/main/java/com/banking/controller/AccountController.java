package com.banking.controller;

import com.banking.dto.*;
import com.banking.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for banking operations.
 * Provides endpoints for account management and transactions.
 */
@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Banking Operations", description = "APIs for managing bank accounts and transactions")
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    @Operation(summary = "Create a new bank account",
               description = "Creates a new bank account with the specified details")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Account created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "409", description = "Account already exists")
    })
    public ResponseEntity<AccountResponse> createAccount(
            @Valid @RequestBody CreateAccountRequest request) {
        log.info("REST: Creating account with number: {}", request.accountNumber());
        AccountResponse response = accountService.createAccount(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{accountNumber}")
    @Operation(summary = "Get account details",
               description = "Retrieves account information by account number")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Account found"),
            @ApiResponse(responseCode = "404", description = "Account not found")
    })
    public ResponseEntity<AccountResponse> getAccount(
            @Parameter(description = "Account number", required = true)
            @PathVariable String accountNumber) {
        log.info("REST: Fetching account: {}", accountNumber);
        AccountResponse response = accountService.getAccount(accountNumber);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Get all accounts",
               description = "Retrieves all bank accounts in the system")
    @ApiResponse(responseCode = "200", description = "List of all accounts")
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        log.info("REST: Fetching all accounts");
        List<AccountResponse> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    @PostMapping("/deposit")
    @Operation(summary = "Deposit money",
               description = "Deposits money into the specified account")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Deposit successful"),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "404", description = "Account not found"),
            @ApiResponse(responseCode = "409", description = "Concurrent modification detected - retry")
    })
    public ResponseEntity<TransactionResponse> deposit(
            @Valid @RequestBody TransactionRequest request) {
        log.info("REST: Processing deposit for account: {}", request.accountNumber());
        TransactionResponse response = accountService.deposit(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdraw")
    @Operation(summary = "Withdraw money",
               description = "Withdraws money from the specified account")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Withdrawal successful"),
            @ApiResponse(responseCode = "400", description = "Invalid input data or insufficient balance"),
            @ApiResponse(responseCode = "404", description = "Account not found"),
            @ApiResponse(responseCode = "409", description = "Concurrent modification detected - retry")
    })
    public ResponseEntity<TransactionResponse> withdraw(
            @Valid @RequestBody TransactionRequest request) {
        log.info("REST: Processing withdrawal for account: {}", request.accountNumber());
        TransactionResponse response = accountService.withdraw(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/transfer")
    @Operation(summary = "Transfer money between accounts",
               description = "Transfers money from one account to another")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transfer successful"),
            @ApiResponse(responseCode = "400", description = "Invalid input data or insufficient balance"),
            @ApiResponse(responseCode = "404", description = "Account not found"),
            @ApiResponse(responseCode = "409", description = "Concurrent modification detected - retry")
    })
    public ResponseEntity<List<TransactionResponse>> transfer(
            @Valid @RequestBody TransferRequest request) {
        log.info("REST: Processing transfer from {} to {}",
                request.fromAccountNumber(), request.toAccountNumber());
        List<TransactionResponse> responses = accountService.transfer(request);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{accountNumber}/transactions")
    @Operation(summary = "Get transaction history",
               description = "Retrieves all transactions for the specified account")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transaction history retrieved"),
            @ApiResponse(responseCode = "404", description = "Account not found")
    })
    public ResponseEntity<List<TransactionResponse>> getTransactionHistory(
            @Parameter(description = "Account number", required = true)
            @PathVariable String accountNumber) {
        log.info("REST: Fetching transaction history for account: {}", accountNumber);
        List<TransactionResponse> transactions = accountService.getTransactionHistory(accountNumber);
        return ResponseEntity.ok(transactions);
    }
}
