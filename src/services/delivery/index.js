const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectMongoDB } = require('../../config/database');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const deliveryRoutes = require('./routes');
const partnerRoutes = require('./partnerRoutes');

const app = express();
const PORT = process.env.DELIVERY_SERVICE_PORT || 3004;

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
    service: 'Delivery Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/delivery', deliveryRoutes);
app.use('/api/partners', partnerRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    app.listen(PORT, () => {
      logger.info(`Delivery Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Delivery Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
