package com.crowdfunding.security;

import com.crowdfunding.config.DatabaseConfig;
import com.crowdfunding.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT token utility for authentication
 */
public class JWTUtil {
    private static final String SECRET_KEY = DatabaseConfig.getProperty("jwt.secret");
    private static final long EXPIRATION_TIME = Long.parseLong(
        DatabaseConfig.getProperty("jwt.expiration", "86400000")); // 24 hours

    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));

    /**
     * Generate JWT token for user
     */
    public static String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("username", user.getUsername());
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(user.getEmail())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extract all claims from token
     */
    public static Claims extractClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Extract user ID from token
     */
    public static Long extractUserId(String token) {
        Claims claims = extractClaims(token);
        return claims.get("userId", Long.class);
    }

    /**
     * Extract username from token
     */
    public static String extractUsername(String token) {
        return extractClaims(token).get("username", String.class);
    }

    /**
     * Extract user role from token
     */
    public static String extractRole(String token) {
        return extractClaims(token).get("role", String.class);
    }

    /**
     * Check if token is expired
     */
    public static boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    /**
     * Validate token
     */
    public static boolean validateToken(String token, String email) {
        try {
            String tokenEmail = extractClaims(token).getSubject();
            return tokenEmail.equals(email) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if user is admin from token
     */
    public static boolean isAdmin(String token) {
        try {
            String role = extractRole(token);
            return "ADMIN".equals(role);
        } catch (Exception e) {
            return false;
        }
    }
}
