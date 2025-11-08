import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import cron from 'node-cron';

import { logger } from './utils/logger';
import { db } from './config/database';
import { redis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import taskRoutes from './routes/task.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import groupRoutes from './routes/group.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';

// Import services
import { RankingService } from './services/ranking.service';
import { StreakService } from './services/streak.service';
import { NotificationService } from './services/notification.service';

dotenv.config();

class App {
  public app: Application;
  public io: SocketIOServer;
  private server: any;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
    this.scheduleCronJobs();
  }

  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use('/api/', rateLimiter);

    // Health check endpoint (before other routes)
    this.app.get('/health', async (req: Request, res: Response) => {
      const dbHealthy = await db.testConnection();
      const redisHealthy = await redis.exists('health-check-test');

      res.status(dbHealthy && redisHealthy ? 200 : 503).json({
        status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      });
    });
  }

  private initializeRoutes(): void {
    const apiVersion = process.env.API_VERSION || 'v1';
    const baseRoute = `/api/${apiVersion}`;

    // Mount routes
    this.app.use(`${baseRoute}/auth`, authRoutes);
    this.app.use(`${baseRoute}/users`, userRoutes);
    this.app.use(`${baseRoute}/tasks`, taskRoutes);
    this.app.use(`${baseRoute}/leaderboard`, leaderboardRoutes);
    this.app.use(`${baseRoute}/groups`, groupRoutes);
    this.app.use(`${baseRoute}/notifications`, notificationRoutes);
    this.app.use(`${baseRoute}/analytics`, analyticsRoutes);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Gamified Learning Leaderboard API',
        version: apiVersion,
        endpoints: {
          health: '/health',
          auth: `${baseRoute}/auth`,
          users: `${baseRoute}/users`,
          tasks: `${baseRoute}/tasks`,
          leaderboard: `${baseRoute}/leaderboard`,
          groups: `${baseRoute}/groups`,
          notifications: `${baseRoute}/notifications`,
          analytics: `${baseRoute}/analytics`,
        },
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Resource not found',
        path: req.path,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      socket.on('join-room', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.debug('User joined room', { userId, socketId: socket.id });
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });

    // Make io accessible to other parts of the app
    this.app.set('io', this.io);
  }

  private scheduleCronJobs(): void {
    // Update cached rankings every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running scheduled ranking update');
        await RankingService.updateCachedRankings();
      } catch (error) {
        logger.error('Error updating cached rankings', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Check and update streaks at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('Running scheduled streak check');
        await StreakService.checkAndUpdateStreaks();
      } catch (error) {
        logger.error('Error checking streaks', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Clean up old notifications every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running scheduled notification cleanup');
        await NotificationService.cleanupOldNotifications();
      } catch (error) {
        logger.error('Error cleaning up notifications', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    logger.info('Cron jobs scheduled successfully');
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      const dbConnected = await db.testConnection();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Server started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          apiVersion: process.env.API_VERSION || 'v1',
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');

    // Close server
    this.server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close Socket.IO
    this.io.close(() => {
      logger.info('WebSocket server closed');
    });

    // Close database connections
    await db.close();
    await redis.close();

    logger.info('Shutdown complete');
    process.exit(0);
  }
}

// Start the server
const app = new App();
app.start();

export default app;
