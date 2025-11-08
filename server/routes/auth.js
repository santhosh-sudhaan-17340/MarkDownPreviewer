const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

/**
 * POST /api/auth/register - Register new user
 */
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('fullName').trim().notEmpty(),
        body('phone').optional().matches(/^[0-9+\-() ]+$/)
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password, fullName, phone } = req.body;

            // Check if user already exists
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create user
            const result = await db.query(
                `INSERT INTO users (email, password_hash, full_name, phone, role)
                 VALUES ($1, $2, $3, $4, 'CUSTOMER')
                 RETURNING id, email, full_name, phone, role, created_at`,
                [email, passwordHash, fullName, phone]
            );

            const user = result.rows[0];

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        phone: user.phone,
                        role: user.role
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Error registering user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to register user'
            });
        }
    }
);

/**
 * POST /api/auth/login - User login
 */
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty()
    ],
    validate,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            const user = result.rows[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            // Update last login
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.full_name,
                        phone: user.phone,
                        role: user.role
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Error logging in:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to login'
            });
        }
    }
);

/**
 * GET /api/auth/me - Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, full_name, phone, role, created_at, last_login FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile'
        });
    }
});

/**
 * PUT /api/auth/me - Update user profile
 */
router.put('/me',
    authenticateToken,
    [
        body('fullName').optional().trim().notEmpty(),
        body('phone').optional().matches(/^[0-9+\-() ]+$/)
    ],
    validate,
    async (req, res) => {
        try {
            const { fullName, phone } = req.body;
            const updates = [];
            const values = [];
            let paramCount = 0;

            if (fullName) {
                paramCount++;
                updates.push(`full_name = $${paramCount}`);
                values.push(fullName);
            }

            if (phone) {
                paramCount++;
                updates.push(`phone = $${paramCount}`);
                values.push(phone);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No updates provided'
                });
            }

            paramCount++;
            values.push(req.user.id);

            const result = await db.query(
                `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, full_name, phone, role`,
                values
            );

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile'
            });
        }
    }
);

/**
 * POST /api/auth/change-password - Change password
 */
router.post('/change-password',
    authenticateToken,
    [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 8 })
    ],
    validate,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // Get user
            const userResult = await db.query(
                'SELECT password_hash FROM users WHERE id = $1',
                [req.user.id]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }

            // Hash new password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            await db.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                [newPasswordHash, req.user.id]
            );

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change password'
            });
        }
    }
);

module.exports = router;
