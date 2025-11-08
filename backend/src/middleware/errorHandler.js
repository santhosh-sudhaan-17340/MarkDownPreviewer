/**
 * Global Error Handler Middleware
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        user: req.user?.userId,
    });

    // Default error
    let status = err.status || 500;
    let message = err.message || 'Internal server error';

    // Database errors
    if (err.code === '23505') {
        // Unique violation
        status = 409;
        message = 'Resource already exists';
    } else if (err.code === '23503') {
        // Foreign key violation
        status = 400;
        message = 'Referenced resource not found';
    } else if (err.code === '23502') {
        // Not null violation
        status = 400;
        message = 'Required field missing';
    }

    // Send error response
    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            details: err.message,
            stack: err.stack,
        }),
    });
}

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not found',
        message: `Cannot ${req.method} ${req.url}`,
    });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
};
