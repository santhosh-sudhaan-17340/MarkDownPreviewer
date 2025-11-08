const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const logger = require('../utils/logger');
const { errorHandler, notFound } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  restaurant: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  delivery: process.env.DELIVERY_SERVICE_URL || 'http://localhost:3004',
  tracking: process.env.TRACKING_SERVICE_URL || 'http://localhost:3005',
  fraud: process.env.FRAUD_SERVICE_URL || 'http://localhost:3006',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

// Health check
app.get('/health', async (req, res) => {
  const healthChecks = {};

  // Check all services
  for (const [name, url] of Object.entries(services)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      healthChecks[name] = 'healthy';
    } catch (error) {
      healthChecks[name] = 'unhealthy';
    }
  }

  const allHealthy = Object.values(healthChecks).every(status => status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    service: 'API Gateway',
    status: allHealthy ? 'healthy' : 'degraded',
    services: healthChecks,
    timestamp: new Date().toISOString()
  });
});

// Proxy helper function
const proxyRequest = async (serviceUrl, req) => {
  try {
    const response = await axios({
      method: req.method,
      url: serviceUrl + req.path,
      data: req.body,
      params: req.query,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
      },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(error.response.data.message || 'Service error');
      err.statusCode = error.response.status;
      throw err;
    }
    throw new Error('Service unavailable');
  }
};

// User service routes
app.post('/api/users/register', authLimiter, async (req, res, next) => {
  try {
    const data = await proxyRequest(services.user, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/users/login', authLimiter, async (req, res, next) => {
  try {
    const data = await proxyRequest(services.user, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.use('/api/users', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.user, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Restaurant service routes
app.use('/api/restaurants', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.restaurant, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Order service routes
app.use('/api/orders', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.order, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Delivery service routes
app.use('/api/delivery', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.delivery, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.use('/api/partners', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.delivery, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Payment service routes
app.use('/api/payments', async (req, res, next) => {
  try {
    const data = await proxyRequest(services.payment, req);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-Restaurant Delivery Platform API',
    version: '1.0.0',
    endpoints: {
      users: {
        register: 'POST /api/users/register',
        login: 'POST /api/users/login',
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile'
      },
      restaurants: {
        search: 'GET /api/restaurants',
        nearby: 'GET /api/restaurants/nearby',
        details: 'GET /api/restaurants/:id',
        menu: 'GET /api/restaurants/:id/menu'
      },
      orders: {
        create: 'POST /api/orders',
        list: 'GET /api/orders/my-orders',
        details: 'GET /api/orders/:id',
        track: 'GET /api/orders/:id/track',
        cancel: 'PUT /api/orders/:id/cancel'
      },
      delivery: {
        availability: 'GET /api/delivery/availability',
        route: 'POST /api/delivery/route/calculate',
        feasibility: 'POST /api/delivery/feasibility'
      },
      partners: {
        register: 'POST /api/partners/register',
        login: 'POST /api/partners/login',
        updateLocation: 'PUT /api/partners/location',
        updateStatus: 'PUT /api/partners/status'
      }
    },
    websocket: {
      tracking: 'ws://localhost:3005/tracking'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Service mesh:');
  Object.entries(services).forEach(([name, url]) => {
    logger.info(`  ${name}: ${url}`);
  });
});

module.exports = app;
