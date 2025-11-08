const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pool = require('./config/database');
const expiryService = require('./services/expiryService');

// Import routes
const reservationRoutes = require('./routes/reservations');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Parcel Drop-Locker Management System',
    version: '1.0.0',
    description: 'Smart locker management system with atomic reservations, pickup codes, and admin portal',
    endpoints: {
      health: '/health',
      reservations: '/api/reservations',
      tracking: '/api/reservations/track/:trackingNumber',
      pickup: '/api/reservations/pickup',
      admin: '/api/admin',
      adminDashboard: '/api/admin/dashboard',
      reports: '/api/admin/reports/*'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  expiryService.stopScheduledJobs();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  expiryService.stopScheduledJobs();
  await pool.end();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW()');
    console.log('✓ Database connection established');
    console.log(`  Current database time: ${dbTest.rows[0].now}`);

    // Start scheduled jobs
    expiryService.startScheduledJobs();

    // Start Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  🔒 Parcel Drop-Locker Management System');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  Server running on: http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  API Documentation: http://localhost:${PORT}/`);
      console.log('');
      console.log('  Available endpoints:');
      console.log(`    - Health Check:      GET  /health`);
      console.log(`    - Reserve Locker:    POST /api/reservations`);
      console.log(`    - Track Parcel:      GET  /api/reservations/track/:trackingNumber`);
      console.log(`    - Process Pickup:    POST /api/reservations/pickup`);
      console.log(`    - Admin Login:       POST /api/admin/login`);
      console.log(`    - Admin Dashboard:   GET  /api/admin/dashboard`);
      console.log('');
      console.log('  Scheduled jobs running:');
      console.log('    ✓ Expiry check (hourly)');
      console.log('    ✓ Warning notifications (every 6 hours)');
      console.log('    ✓ Cleanup (daily at 2 AM)');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
