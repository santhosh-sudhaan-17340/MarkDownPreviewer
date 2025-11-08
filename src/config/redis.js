const Redis = require('ioredis');
const NodeCache = require('node-cache');
require('dotenv').config();

// Redis client for caching and pub/sub
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// In-memory cache fallback
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60
});

// Cache helper functions
const cacheService = {
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return memoryCache.get(key);
    }
  },

  async set(key, value, ttl = 300) {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      memoryCache.set(key, value, ttl);
    } catch (error) {
      console.error('Redis set error:', error);
      memoryCache.set(key, value, ttl);
    }
  },

  async delete(key) {
    try {
      await redis.del(key);
      memoryCache.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
      memoryCache.del(key);
    }
  },

  async deletePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis delete pattern error:', error);
    }
  }
};

// Pub/Sub clients
const publisher = redis.duplicate();
const subscriber = redis.duplicate();

module.exports = {
  redis,
  cacheService,
  publisher,
  subscriber,
  memoryCache
};
