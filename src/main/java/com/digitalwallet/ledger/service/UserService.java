package com.digitalwallet.ledger.service;

import com.digitalwallet.ledger.dto.UserRegistrationRequest;
import com.digitalwallet.ledger.entity.KYCStatus;
import com.digitalwallet.ledger.entity.User;
import com.digitalwallet.ledger.entity.Wallet;
import com.digitalwallet.ledger.exception.ResourceNotFoundException;
import com.digitalwallet.ledger.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public User registerUser(UserRegistrationRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        // Check for existing username or email
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + request.getEmail());
        }

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setKycStatus(KYCStatus.NOT_STARTED);
        user.setActive(true);

        // Create wallet for user
        Wallet wallet = new Wallet();
        wallet.setUser(user);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setDailyWithdrawalLimit(new BigDecimal("10000.00"));
        wallet.setWithdrawnToday(BigDecimal.ZERO);
        wallet.setFrozen(false);
        wallet.setLastWithdrawalReset(LocalDateTime.now());

        user.setWallet(wallet);

        User savedUser = userRepository.save(user);
        log.info("User registered successfully: {} with wallet ID: {}",
                savedUser.getUsername(), savedUser.getWallet().getId());

        return savedUser;
    }

    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User updateKYCStatus(Long userId, KYCStatus status, String documentUrl) {
        User user = getUserById(userId);
        user.setKycStatus(status);
        user.setKycDocumentUrl(documentUrl);

        if (status == KYCStatus.VERIFIED) {
            user.setKycVerifiedAt(LocalDateTime.now());
        }

        log.info("Updated KYC status for user {} to {}", userId, status);
        return userRepository.save(user);
    }
}
