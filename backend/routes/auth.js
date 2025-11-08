const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { validateRegistration, validateLogin } = require('../middleware/validators');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username or email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            `INSERT INTO users (username, email, password_hash, display_name)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, display_name, total_points, current_streak, join_date`,
            [username, email, passwordHash, displayName || username]
        );

        const user = result.rows[0];

        logger.info(`New user registered: ${username}`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    totalPoints: user.total_points,
                    currentStreak: user.current_streak,
                    joinDate: user.join_date
                }
            }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register user'
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and create session
 * @access  Public
 */
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;
        const userAgent = req.get('user-agent');
        const ipAddress = req.ip;

        // Find user
        const userResult = await query(
            `SELECT id, username, email, password_hash, display_name, is_active, is_banned, ban_reason
             FROM users
             WHERE username = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const user = userResult.rows[0];

        // Check if user is banned
        if (user.is_banned) {
            return res.status(403).json({
                success: false,
                error: `Account is banned. Reason: ${user.ban_reason || 'N/A'}`
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is inactive'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Create session
        await query(
            `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, token, ipAddress, userAgent, expiresAt]
        );

        logger.info(`User logged in: ${username}`);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name
                }
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Delete current session
        await query(
            'DELETE FROM user_sessions WHERE id = $1',
            [req.user.sessionId]
        );

        logger.info(`User logged out: ${req.user.username}`);

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.username, u.email, u.display_name, u.avatar_url,
                    u.total_points, u.current_streak, u.longest_streak,
                    u.last_activity_date, u.join_date,
                    gr.global_rank
             FROM users u
             LEFT JOIN global_rankings gr ON u.id = gr.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    avatarUrl: user.avatar_url,
                    totalPoints: user.total_points,
                    currentStreak: user.current_streak,
                    longestStreak: user.longest_streak,
                    lastActivityDate: user.last_activity_date,
                    joinDate: user.join_date,
                    globalRank: user.global_rank
                }
            }
        });
    } catch (error) {
        logger.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});

module.exports = router;
