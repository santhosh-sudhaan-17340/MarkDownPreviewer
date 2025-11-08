const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
require('dotenv').config();

const { pool } = require('./database/connection');
const SLAMonitor = require('./services/slaMonitor');

// Import routes
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const attachmentRoutes = require('./routes/attachments');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', attachmentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Complaint Ticketing System API',
    version: '1.0.0',
    endpoints: {
      tickets: '/api/tickets',
      users: '/api/users',
      reports: '/api/reports',
      attachments: '/api/attachments',
      health: '/health',
      docs: '/api-docs',
    },
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    title: 'Complaint Ticketing System API Documentation',
    version: '1.0.0',
    endpoints: {
      tickets: {
        'POST /api/tickets': 'Create a new ticket',
        'GET /api/tickets': 'Get all tickets (with optional filters)',
        'GET /api/tickets/:id': 'Get ticket by ID',
        'PUT /api/tickets/:id/status': 'Update ticket status',
        'PUT /api/tickets/:id/assign': 'Assign ticket to agent',
        'POST /api/tickets/:id/comments': 'Add comment to ticket',
        'GET /api/tickets/:id/timeline': 'Get ticket timeline',
      },
      users: {
        'POST /api/users': 'Create a new user',
        'GET /api/users': 'Get all users',
        'GET /api/users/agents': 'Get all agents',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user',
        'GET /api/users/:id/agent-details': 'Get agent with skills',
        'PUT /api/users/:id/skills': 'Assign skills to agent',
        'GET /api/users/:id/statistics': 'Get agent statistics',
        'GET /api/users/skills/:skillId/agents': 'Find agents by skill',
      },
      reports: {
        'GET /api/reports/backlog/counts': 'Get backlog counts',
        'GET /api/reports/backlog/summary': 'Get backlog summary',
        'GET /api/reports/sla/breaches': 'Get SLA breaches',
        'GET /api/reports/sla/breach-stats': 'Get SLA breach statistics',
        'GET /api/reports/sla/metrics': 'Get SLA metrics',
        'GET /api/reports/sla/upcoming-deadlines': 'Get upcoming SLA deadlines',
        'GET /api/reports/agents/productivity': 'Get agent productivity',
        'GET /api/reports/agents/workload': 'Get agent workload',
        'GET /api/reports/categories/tickets': 'Get tickets by category',
        'GET /api/reports/trending-issues': 'Get trending issues',
        'GET /api/reports/daily-volume': 'Get daily ticket volume',
        'GET /api/reports/resolution-time-distribution': 'Get resolution time distribution',
      },
      attachments: {
        'POST /api/tickets/:ticketId/attachments': 'Upload attachment',
        'GET /api/tickets/:ticketId/attachments': 'Get ticket attachments',
        'GET /api/attachments/:id': 'Get attachment metadata',
        'GET /api/attachments/:id/download': 'Download attachment',
        'DELETE /api/attachments/:id': 'Delete attachment',
        'GET /api/attachments/stats/storage': 'Get storage statistics',
      },
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Schedule SLA monitoring (runs every 15 minutes by default)
const escalationInterval = process.env.ESCALATION_CHECK_INTERVAL || 15;
cron.schedule(`*/${escalationInterval} * * * *`, () => {
  console.log('Running scheduled SLA check...');
  SLAMonitor.checkAndEscalate();
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Complaint Ticketing System API');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`SLA Check Interval: Every ${escalationInterval} minutes`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

module.exports = app;
