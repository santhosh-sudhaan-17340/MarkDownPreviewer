const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ticketRoutes = require('./routes/ticketRoutes');
const reportRoutes = require('./routes/reportRoutes');
const SLAMonitor = require('./services/SLAMonitor');
const AttachmentHandler = require('./services/AttachmentHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Complaint Ticketing System with SLA Tracking',
        version: '1.0.0',
        description: 'Complete ticketing system with SLA tracking, skill-based routing, and comprehensive audit logs',
        endpoints: {
            tickets: '/api/tickets',
            reports: '/api/reports',
            health: '/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Initialize services and start server
async function start() {
    try {
        // Initialize attachment handler (create upload directory)
        await AttachmentHandler.initialize();

        // Start SLA monitor
        SLAMonitor.start();

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('  Complaint Ticketing System with SLA Tracking');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`  Server running on port ${PORT}`);
            console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('');
            console.log('  API Endpoints:');
            console.log(`    - Tickets: http://localhost:${PORT}/api/tickets`);
            console.log(`    - Reports: http://localhost:${PORT}/api/reports`);
            console.log(`    - Health:  http://localhost:${PORT}/health`);
            console.log('');
            console.log('  Features:');
            console.log('    ✓ Ticket Management');
            console.log('    ✓ SLA Tracking & Escalation');
            console.log('    ✓ Skill-based Routing');
            console.log('    ✓ Audit Logging');
            console.log('    ✓ Attachment Handling');
            console.log('    ✓ Status Timeline Tracking');
            console.log('    ✓ Comprehensive Reporting');
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully...');
            SLAMonitor.stop();
            process.exit(0);
        });

        process.on('SIGINT', () => {
            console.log('\nSIGINT received, shutting down gracefully...');
            SLAMonitor.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    start();
}

module.exports = app;
