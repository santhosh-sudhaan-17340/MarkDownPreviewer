import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/config';
import { pool } from './config/database';
import logger from './utils/logger';

// Routes
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import qrRoutes from './routes/qrRoutes';
import disputeRoutes from './routes/disputeRoutes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/disputes', disputeRoutes);

// API Documentation
app.get('/api', (req: Request, res: Response) => {
  res.json({
    name: 'P2P Payment API',
    version: '1.0.0',
    description: 'Secure peer-to-peer payment application',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/verify-pin': 'Verify transaction PIN',
        'GET /api/auth/profile': 'Get user profile'
      },
      payments: {
        'POST /api/payments/transfer': 'Process payment',
        'GET /api/payments/transactions': 'Get transaction history',
        'GET /api/payments/transactions/:id': 'Get transaction details'
      },
      qr: {
        'POST /api/qr/generate': 'Generate QR code',
        'POST /api/qr/validate': 'Validate QR code',
        'POST /api/qr/pay': 'Pay via QR code',
        'GET /api/qr/my-codes': 'Get user QR codes',
        'DELETE /api/qr/:id': 'Deactivate QR code'
      },
      disputes: {
        'POST /api/disputes': 'Create dispute',
        'GET /api/disputes': 'Get user disputes',
        'GET /api/disputes/statistics': 'Get dispute statistics',
        'GET /api/disputes/:id': 'Get dispute details'
      }
    },
    features: [
      'Instant P2P transfers',
      'Fraud monitoring and detection',
      'Transaction retry with exponential backoff',
      'Dispute resolution system',
      'Multi-bank support',
      'QR code payments',
      'Secure authentication with JWT',
      'PIN-based transaction authorization'
    ]
  });
});

// Serve frontend for non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: config.env === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`P2P Payment Server running on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

export default app;
