const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const Bull = require('bull');
require('dotenv').config();

const { connectPostgres } = require('../../config/database');
const { redis } = require('../../config/redis');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const orderRoutes = require('./routes');

const app = express();
const PORT = process.env.ORDER_SERVICE_PORT || 3003;

// Create job queue for order processing
const orderQueue = new Bull('order-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Make queue available to routes
app.locals.orderQueue = orderQueue;

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Order Service',
    status: 'healthy',
    queueStatus: {
      waiting: orderQueue.getWaitingCount(),
      active: orderQueue.getActiveCount(),
      completed: orderQueue.getCompletedCount(),
      failed: orderQueue.getFailedCount()
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/orders', orderRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Process order queue
orderQueue.process(async (job) => {
  const { orderId, action } = job.data;

  logger.info(`Processing order job: ${action} for order ${orderId}`);

  try {
    switch (action) {
      case 'assign_partner':
        // Assignment logic handled by delivery service
        break;
      case 'send_notification':
        // Notification logic
        break;
      case 'update_status':
        // Status update logic
        break;
      default:
        logger.warn(`Unknown job action: ${action}`);
    }

    return { success: true, orderId, action };
  } catch (error) {
    logger.error(`Order job failed: ${error.message}`);
    throw error;
  }
});

// Queue event handlers
orderQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed:`, result);
});

orderQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

// Start server
const startServer = async () => {
  try {
    await connectPostgres();
    app.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
      logger.info('Order processing queue initialized');
    });
  } catch (error) {
    logger.error('Failed to start Order Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
