const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectMongoDB, connectPostgres } = require('../../config/database');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const fraudRoutes = require('./routes');
const fraudDetector = require('./fraudDetector');

const app = express();
const PORT = process.env.FRAUD_SERVICE_PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Fraud Detection Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/fraud', fraudRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    await connectPostgres();

    // Initialize fraud detection patterns
    await fraudDetector.initialize();

    app.listen(PORT, () => {
      logger.info(`Fraud Detection Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Fraud Detection Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
