const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided. Please authenticate.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session exists and is valid
        const sessionResult = await query(
            `SELECT us.*, u.is_active, u.is_banned
             FROM user_sessions us
             JOIN users u ON us.user_id = u.id
             WHERE us.session_token = $1 AND us.expires_at > NOW()`,
            [token]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session. Please login again.'
            });
        }

        const session = sessionResult.rows[0];

        // Check if user is active and not banned
        if (!session.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Account is inactive.'
            });
        }

        if (session.is_banned) {
            return res.status(403).json({
                success: false,
                error: 'Account has been banned.'
            });
        }

        // Update last activity
        await query(
            'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
            [session.id]
        );

        // Attach user info to request
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            sessionId: session.id
        };

        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Authentication failed.'
        });
    }
};

/**
 * Middleware to check if user is admin (for admin-only routes)
 */
const requireAdmin = async (req, res, next) => {
    try {
        const result = await query(
            'SELECT role FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required.'
            });
        }

        next();
    } catch (error) {
        logger.error('Admin check error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authorization failed.'
        });
    }
};

module.exports = {
    authenticate,
    requireAdmin
};
