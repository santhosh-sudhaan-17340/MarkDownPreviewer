package com.crowdfunding.security;

import org.mindrot.jbcrypt.BCrypt;

/**
 * Utility class for password hashing using BCrypt
 */
public class PasswordHasher {
    private static final int BCRYPT_ROUNDS = 12;

    /**
     * Hash a password using BCrypt
     */
    public static String hashPassword(String plainPassword) {
        return BCrypt.hashpw(plainPassword, BCrypt.gensalt(BCRYPT_ROUNDS));
    }

    /**
     * Verify a password against a hash
     */
    public static boolean verifyPassword(String plainPassword, String hashedPassword) {
        return BCrypt.checkpw(plainPassword, hashedPassword);
    }
}
