import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import resourceRoutes from './routes/resourceRoutes';
import bookingRoutes from './routes/bookingRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import customerRoutes from './routes/customerRoutes';
import penaltyRoutes from './routes/penaltyRoutes';
import reminderService from './services/reminderService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/resources', resourceRoutes);
app.use('/api/appointments', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/penalties', penaltyRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Appointment Scheduling System',
    version: '1.0.0',
    description: 'Resource-constrained appointment scheduling with locking, reminders, and penalties',
    endpoints: {
      health: '/health',
      resources: '/api/resources',
      appointments: '/api/appointments',
      availability: '/api/availability',
      customers: '/api/customers',
      penalties: '/api/penalties'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     Appointment Scheduling System                              ║
║     Version: 1.0.0                                             ║
║                                                                ║
║     Server running on http://localhost:${PORT}                    ║
║                                                                ║
║     Features:                                                  ║
║     ✓ Resource management (doctors, barbers, technicians)      ║
║     ✓ Conflict prevention with database locking               ║
║     ✓ Automated reminder system                               ║
║     ✓ Cancellation rules and no-show penalties                ║
║     ✓ Efficient nearest slot search                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  // Start reminder processor
  console.log('Starting reminder processor...');
  reminderService.startReminderProcessor();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  reminderService.stopReminderProcessor();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  reminderService.stopReminderProcessor();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
