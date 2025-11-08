/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Verify JWT token middleware
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No token provided',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        logger.debug('User authenticated', { userId: decoded.userId });
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Your session has expired. Please login again.',
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Authentication failed',
            });
        }

        logger.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication',
        });
    }
}

/**
 * Generate JWT token
 */
function generateToken(userId, email) {
    return jwt.sign(
        {
            userId,
            email,
        },
        JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        }
    );
}

/**
 * Verify token without middleware
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    authenticate,
    generateToken,
    verifyToken,
};
