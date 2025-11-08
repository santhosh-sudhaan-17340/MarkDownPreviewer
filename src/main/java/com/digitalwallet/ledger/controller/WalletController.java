package com.digitalwallet.ledger.controller;

import com.digitalwallet.ledger.dto.*;
import com.digitalwallet.ledger.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallet Operations", description = "Wallet balance and transaction operations")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get wallet details", description = "Gets wallet balance and limits for a user")
    public ResponseEntity<WalletResponse> getWalletByUserId(@PathVariable Long userId) {
        WalletResponse wallet = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(wallet);
    }

    @PostMapping("/deposit")
    @Operation(summary = "Deposit money", description = "Deposits money into a user's wallet")
    public ResponseEntity<TransactionResponse> deposit(@Valid @RequestBody DepositRequest request) {
        TransactionResponse response = walletService.deposit(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/withdraw")
    @Operation(summary = "Withdraw money", description = "Withdraws money from a user's wallet with limit checks and fraud detection")
    public ResponseEntity<TransactionResponse> withdraw(@Valid @RequestBody WithdrawalRequest request) {
        TransactionResponse response = walletService.withdraw(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/transfer")
    @Operation(summary = "Transfer money", description = "Transfers money between two wallets atomically")
    public ResponseEntity<WalletService.TransferResult> transfer(@Valid @RequestBody TransferRequest request) {
        WalletService.TransferResult result = walletService.transfer(request);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/user/{userId}/freeze")
    @Operation(summary = "Freeze wallet", description = "Freezes a wallet to prevent transactions")
    public ResponseEntity<String> freezeWallet(
            @PathVariable Long userId,
            @RequestParam String reason) {
        walletService.freezeWallet(userId, reason);
        return ResponseEntity.ok("Wallet frozen successfully");
    }

    @PutMapping("/user/{userId}/unfreeze")
    @Operation(summary = "Unfreeze wallet", description = "Unfreezes a wallet to allow transactions")
    public ResponseEntity<String> unfreezeWallet(@PathVariable Long userId) {
        walletService.unfreezeWallet(userId);
        return ResponseEntity.ok("Wallet unfrozen successfully");
    }
}
