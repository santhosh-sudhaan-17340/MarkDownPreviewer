import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/users';
import skillRoutes from './routes/skills';
import analyticsRoutes from './routes/analytics';
import { startSLAMonitoring } from './jobs/slaMonitor';
import prisma from './config/database';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Complaint Ticketing System API',
    version: '1.0.0',
    description: 'Comprehensive ticketing system with SLA tracking and skill-based routing',
    endpoints: {
      health: '/health',
      tickets: '/api/tickets',
      users: '/api/users',
      skills: '/api/skills',
      analytics: '/api/analytics',
    },
    features: [
      'Ticket creation and management',
      'SLA tracking with automatic escalation',
      'Skill-based ticket routing',
      'Comprehensive audit logging',
      'Attachment handling with metadata',
      'Real-time analytics and reporting',
    ],
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
app.listen(port, () => {
  console.log('='.repeat(60));
  console.log('🎫 Complaint Ticketing System with SLA Tracking');
  console.log('='.repeat(60));
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('API Endpoints:');
  console.log(`  - Health Check:   http://localhost:${port}/health`);
  console.log(`  - Tickets:        http://localhost:${port}/api/tickets`);
  console.log(`  - Users:          http://localhost:${port}/api/users`);
  console.log(`  - Skills:         http://localhost:${port}/api/skills`);
  console.log(`  - Analytics:      http://localhost:${port}/api/analytics`);
  console.log('');

  // Start SLA monitoring background job
  startSLAMonitoring();
  console.log('');
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
