require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const db = require('./config/database');
const lockerService = require('./services/lockerService');

// Import routes
const authRoutes = require('./routes/auth');
const locationsRoutes = require('./routes/locations');
const parcelsRoutes = require('./routes/parcels');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later'
    }
});

app.use('/api/', limiter);

// Serve static files for admin portal and user interface
app.use(express.static('public'));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await db.healthCheck();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbHealth,
            version: '1.0.0'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/parcels', parcelsRoutes);
app.use('/api/admin', adminRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Parcel Drop-Locker Management System API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'User login',
                'GET /api/auth/me': 'Get current user profile',
                'PUT /api/auth/me': 'Update user profile',
                'POST /api/auth/change-password': 'Change password'
            },
            locations: {
                'GET /api/locations': 'Get all locker locations',
                'GET /api/locations/:id': 'Get location details',
                'GET /api/locations/:id/available-slots': 'Get available slots',
                'GET /api/locations/nearby/search': 'Find nearby locations'
            },
            parcels: {
                'POST /api/parcels': 'Create new parcel shipment',
                'POST /api/parcels/:id/reserve': 'Reserve locker slot',
                'POST /api/parcels/:id/confirm-dropoff': 'Confirm parcel drop-off',
                'POST /api/parcels/pickup': 'Pick up parcel with code',
                'GET /api/parcels/track/:trackingNumber': 'Track parcel',
                'GET /api/parcels/my-parcels': 'Get user parcels'
            },
            admin: {
                'GET /api/admin/dashboard': 'Admin dashboard overview',
                'GET /api/admin/health-checks': 'Locker health checks',
                'GET /api/admin/overfill-report': 'Overfill reports',
                'GET /api/admin/logistics-optimization': 'Logistics optimization data',
                'GET /api/admin/expired-parcels': 'Get expired parcels',
                'POST /api/admin/lockers': 'Create new locker',
                'PUT /api/admin/lockers/:id/status': 'Update locker status',
                'POST /api/admin/cleanup-reservations': 'Cleanup expired reservations',
                'GET /api/admin/audit-logs': 'Get audit logs'
            }
        }
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Scheduled tasks
let cleanupInterval;
let healthCheckInterval;

/**
 * Start scheduled background tasks
 */
const startScheduledTasks = () => {
    // Cleanup expired reservations every 2 minutes
    const cleanupMinutes = parseInt(process.env.RESERVATION_CLEANUP_INTERVAL) || 2;
    cleanupInterval = setInterval(async () => {
        try {
            const count = await lockerService.cleanupExpiredReservations();
            if (count > 0) {
                console.log(`[Scheduled] Cleaned up ${count} expired reservations`);
            }
        } catch (error) {
            console.error('[Scheduled] Error cleaning up reservations:', error);
        }
    }, cleanupMinutes * 60 * 1000);

    // Health check metrics collection every 5 minutes
    const healthCheckMinutes = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 5;
    healthCheckInterval = setInterval(async () => {
        try {
            // Collect health metrics from all lockers
            const result = await db.query(`
                INSERT INTO locker_health_metrics (
                    locker_id,
                    temperature_celsius,
                    humidity_percent,
                    power_status,
                    network_status
                )
                SELECT
                    id,
                    temperature_celsius,
                    humidity_percent,
                    TRUE, -- Assume power is on if we're getting data
                    TRUE  -- Assume network is up
                FROM lockers
                WHERE status IN ('ACTIVE', 'MAINTENANCE')
                RETURNING locker_id
            `);

            console.log(`[Scheduled] Collected health metrics for ${result.rowCount} lockers`);
        } catch (error) {
            console.error('[Scheduled] Error collecting health metrics:', error);
        }
    }, healthCheckMinutes * 60 * 1000);

    console.log('✓ Scheduled tasks started');
    console.log(`  - Reservation cleanup: every ${cleanupMinutes} minutes`);
    console.log(`  - Health checks: every ${healthCheckMinutes} minutes`);
};

/**
 * Stop scheduled tasks
 */
const stopScheduledTasks = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    console.log('✓ Scheduled tasks stopped');
};

// Start server
const server = app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Parcel Drop-Locker Management System                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`👨‍💼 Admin Portal: http://localhost:${PORT}/admin`);
    console.log(`📦 User Interface: http://localhost:${PORT}`);
    console.log('');

    // Start scheduled tasks
    startScheduledTasks();
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    stopScheduledTasks();

    server.close(async () => {
        console.log('✓ HTTP server closed');

        try {
            await db.closePool();
            console.log('✓ Database connections closed');
            console.log('Shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
