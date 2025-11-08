const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectMongoDB } = require('../../config/database');
const logger = require('../../utils/logger');
const { errorHandler, notFound } = require('../../middleware/errorHandler');
const userRoutes = require('./routes');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'User Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/users', userRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    app.listen(PORT, () => {
      logger.info(`User Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start User Service:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
