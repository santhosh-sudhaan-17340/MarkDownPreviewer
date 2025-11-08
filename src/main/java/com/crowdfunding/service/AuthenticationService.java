package com.crowdfunding.service;

import com.crowdfunding.dao.UserDAO;
import com.crowdfunding.model.User;
import com.crowdfunding.security.JWTUtil;
import com.crowdfunding.security.PasswordHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Service for user authentication and authorization
 */
public class AuthenticationService {
    private static final Logger logger = LoggerFactory.getLogger(AuthenticationService.class);
    private final UserDAO userDAO;

    public AuthenticationService() {
        this.userDAO = new UserDAO();
    }

    /**
     * Register a new user
     */
    public Map<String, Object> register(String username, String email, String password, String fullName)
            throws SQLException {
        // Validate input
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        // Check if user already exists
        if (userDAO.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userDAO.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Hash password and create user
        String passwordHash = PasswordHasher.hashPassword(password);
        User user = new User(username, email, passwordHash, fullName);

        Long userId = userDAO.createUser(user);
        user.setUserId(userId);

        // Generate JWT token
        String token = JWTUtil.generateToken(user);

        logger.info("User registered successfully: {}", email);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("username", username);
        response.put("email", email);
        response.put("role", user.getRole().name());
        response.put("token", token);

        return response;
    }

    /**
     * Login user with email and password
     */
    public Map<String, Object> login(String email, String password) throws SQLException {
        Optional<User> userOpt = userDAO.findByEmail(email);

        if (!userOpt.isPresent()) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        User user = userOpt.get();

        if (!user.isActive()) {
            throw new IllegalArgumentException("Account is deactivated");
        }

        // Verify password
        if (!PasswordHasher.verifyPassword(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        // Update last login
        userDAO.updateLastLogin(user.getUserId());

        // Generate JWT token
        String token = JWTUtil.generateToken(user);

        logger.info("User logged in successfully: {}", email);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getUserId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("role", user.getRole().name());
        response.put("token", token);

        return response;
    }

    /**
     * Validate JWT token and get user
     */
    public User validateToken(String token) throws SQLException {
        try {
            Long userId = JWTUtil.extractUserId(token);
            String email = JWTUtil.extractClaims(token).getSubject();

            if (JWTUtil.isTokenExpired(token)) {
                throw new IllegalArgumentException("Token expired");
            }

            Optional<User> userOpt = userDAO.findById(userId);
            if (!userOpt.isPresent()) {
                throw new IllegalArgumentException("User not found");
            }

            User user = userOpt.get();
            if (!user.getEmail().equals(email)) {
                throw new IllegalArgumentException("Invalid token");
            }

            return user;
        } catch (Exception e) {
            logger.error("Token validation failed", e);
            throw new IllegalArgumentException("Invalid token");
        }
    }

    /**
     * Check if user is admin
     */
    public boolean isAdmin(String token) {
        return JWTUtil.isAdmin(token);
    }

    /**
     * Require admin role
     */
    public void requireAdmin(String token) {
        if (!isAdmin(token)) {
            throw new SecurityException("Admin access required");
        }
    }
}
