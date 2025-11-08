import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  fraud: {
    thresholdAmount: parseFloat(process.env.FRAUD_THRESHOLD_AMOUNT || '50000'),
    dailyLimit: parseFloat(process.env.FRAUD_DAILY_LIMIT || '200000'),
    hourlyTransactionLimit: parseInt(process.env.FRAUD_HOURLY_TRANSACTION_LIMIT || '10'),
  },

  transaction: {
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000'),
  },

  bank: {
    apiTimeout: parseInt(process.env.BANK_API_TIMEOUT || '30000'),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};
