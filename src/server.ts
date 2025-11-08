import express, { Application } from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory & Warehouse Tracking System API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Inventory & Warehouse Tracking System');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(60));
  console.log('\n✅ Features:');
  console.log('  • CRUD operations for Items, Batches, Warehouses');
  console.log('  • Batch tracking with FIFO/FEFO support');
  console.log('  • Transaction logging (Inbound/Outbound/Transfer/Adjustment)');
  console.log('  • Low-stock alerts with auto-detection');
  console.log('  • Optimistic locking for concurrent updates');
  console.log('  • Bulk SQL operations for performance');
  console.log('  • Warehouse capacity utilization tracking');
  console.log('  • Expiry date tracking and alerts');
  console.log('\n📚 Ready to accept requests...\n');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n\n🛑 Shutting down gracefully...');

  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Import and close database pool
  const { closePool } = await import('./database/connection');
  await closePool();
  console.log('✅ Database connections closed');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
