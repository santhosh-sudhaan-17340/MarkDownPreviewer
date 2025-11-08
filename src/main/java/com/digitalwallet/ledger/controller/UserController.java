package com.digitalwallet.ledger.controller;

import com.digitalwallet.ledger.dto.UserRegistrationRequest;
import com.digitalwallet.ledger.entity.KYCStatus;
import com.digitalwallet.ledger.entity.User;
import com.digitalwallet.ledger.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "User registration and KYC operations")
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Creates a new user with an associated wallet")
    public ResponseEntity<User> registerUser(@Valid @RequestBody UserRegistrationRequest request) {
        User user = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/username/{username}")
    @Operation(summary = "Get user by username")
    public ResponseEntity<User> getUserByUsername(@PathVariable String username) {
        User user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }

    @GetMapping
    @Operation(summary = "Get all users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/kyc")
    @Operation(summary = "Update KYC status", description = "Updates the KYC verification status of a user")
    public ResponseEntity<User> updateKYCStatus(
            @PathVariable Long id,
            @RequestParam KYCStatus status,
            @RequestParam(required = false) String documentUrl) {
        User user = userService.updateKYCStatus(id, status, documentUrl);
        return ResponseEntity.ok(user);
    }
}
