import Redis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

class RedisClient {
  private client: Redis;
  private static instance: RedisClient;

  private constructor() {
    this.client = new Redis(redisConfig);
    this.setupListeners();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private setupListeners(): void {
    this.client.on('connect', () => {
      logger.info('Redis connection established');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  // Cache helpers with TTL
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Pattern-based deletion
  public async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  // Increment with expiry
  public async increment(key: string, ttl?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (ttl && value === 1) {
      await this.client.expire(key, ttl);
    }
    return value;
  }

  // Hash operations
  public async hset(key: string, field: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.hset(key, field, stringValue);
  }

  public async hget<T = any>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  public async hgetall<T = any>(key: string): Promise<T | null> {
    const value = await this.client.hgetall(key);
    if (!value || Object.keys(value).length === 0) return null;

    const parsed: any = {};
    for (const [k, v] of Object.entries(value)) {
      try {
        parsed[k] = JSON.parse(v);
      } catch {
        parsed[k] = v;
      }
    }
    return parsed as T;
  }

  // Sorted sets for leaderboards
  public async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  public async zrevrank(key: string, member: string): Promise<number | null> {
    return await this.client.zrevrank(key, member);
  }

  public async zrevrange(key: string, start: number, stop: number, withScores = false): Promise<any[]> {
    if (withScores) {
      return await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return await this.client.zrevrange(key, start, stop);
  }

  public async close(): Promise<void> {
    await this.client.quit();
    logger.info('Redis client closed');
  }
}

export const redis = RedisClient.getInstance();
export default redis;
