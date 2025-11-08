const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

// Import custom modules
const logger = require('./utils/logger');
const { refreshRankings } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const leaderboardRoutes = require('./routes/leaderboard');
const friendGroupRoutes = require('./routes/friendGroups');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/groups', friendGroupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Server error:', err);

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =====================================================
// SCHEDULED TASKS
// =====================================================

// Refresh global rankings every N minutes
const refreshInterval = parseInt(process.env.RANKING_REFRESH_INTERVAL) || 5;
cron.schedule(`*/${refreshInterval} * * * *`, async () => {
    try {
        logger.info('Running scheduled ranking refresh...');
        await refreshRankings();
        logger.info('Ranking refresh completed successfully');
    } catch (error) {
        logger.error('Error in scheduled ranking refresh:', error);
    }
});

// Clean up expired sessions daily at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        logger.info('Cleaning up expired sessions...');
        const { query } = require('./config/database');
        await query('DELETE FROM user_sessions WHERE expires_at < NOW()');
        logger.info('Session cleanup completed');
    } catch (error) {
        logger.error('Error cleaning up sessions:', error);
    }
});

// =====================================================
// SERVER STARTUP
// =====================================================

app.listen(PORT, () => {
    logger.info(`🚀 Gamified Leaderboard Backend Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔄 Ranking refresh interval: ${refreshInterval} minutes`);
    logger.info(`🔒 Cheat detection: ${process.env.CHEAT_DETECTION_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
