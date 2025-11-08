const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectMongoDB } = require('../../config/database');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const restaurantRoutes = require('./routes');

const app = express();
const PORT = process.env.RESTAURANT_SERVICE_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Restaurant Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/restaurants', restaurantRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    app.listen(PORT, () => {
      logger.info(`Restaurant Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Restaurant Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
