/**
 * Subscription & Billing Management Platform - Main Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const db = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const scheduler = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
};
app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
} else {
    app.use(morgan('dev'));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too many requests',
        message: 'Please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Subscription & Billing Management Platform API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            subscriptions: '/api/subscriptions',
            invoices: '/api/invoices',
            payments: '/api/payments',
            coupons: '/api/coupons',
            taxes: '/api/taxes',
            analytics: '/api/analytics',
            admin: '/api/admin',
        },
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
    try {
        // Test database connection
        logger.info('Testing database connection...');
        const dbConnected = await db.testConnection();

        if (!dbConnected) {
            logger.error('Database connection failed. Exiting...');
            process.exit(1);
        }

        // Start the server
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
        });

        // Initialize scheduled jobs
        if (process.env.NODE_ENV !== 'test') {
            logger.info('Starting scheduled jobs...');
            scheduler.init();
        }

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            // Stop accepting new requests
            server.close(async () => {
                logger.info('HTTP server closed');

                // Stop scheduled jobs
                scheduler.stopAll();

                // Close database connections
                await db.close();

                logger.info('Graceful shutdown complete');
                process.exit(0);
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        const server = app.listen(PORT);

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle unhandled errors
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;
