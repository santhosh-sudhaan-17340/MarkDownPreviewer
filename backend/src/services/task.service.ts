import { db } from '../config/database';
import { redis } from '../config/redis';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { CheatDetectionService } from './cheatDetection.service';
import { NotificationService } from './notification.service';
import { StreakService } from './streak.service';

export interface TaskCompletionData {
  userId: string;
  taskId: string;
  completionTimeSeconds?: number;
  accuracyPercentage?: number;
}

export class TaskService {
  static async getAllTasks(filters?: { category?: string; difficulty?: string; isActive?: boolean }) {
    try {
      let query = 'SELECT * FROM tasks WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }

      if (filters?.difficulty) {
        query += ` AND difficulty = $${paramIndex++}`;
        params.push(filters.difficulty);
      }

      if (filters?.isActive !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(filters.isActive);
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching tasks', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  static async getTaskById(taskId: string) {
    try {
      const result = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);

      if (result.rows.length === 0) {
        throw new AppError('Task not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching task', { error: error instanceof Error ? error.message : 'Unknown error', taskId });
      throw error;
    }
  }

  static async getUserTaskProgress(userId: string) {
    try {
      const result = await db.query(
        `SELECT
          t.id as task_id,
          t.title,
          t.category,
          t.difficulty,
          t.base_points,
          tc.points_earned,
          tc.completion_time_seconds,
          tc.accuracy_percentage,
          tc.completed_at,
          tc.is_valid
         FROM tasks t
         LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = $1
         WHERE t.is_active = true
         ORDER BY t.category, t.difficulty, t.title`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user task progress', { error: error instanceof Error ? error.message : 'Unknown error', userId });
      throw error;
    }
  }

  static async completeTask(data: TaskCompletionData) {
    return await db.transaction(async (client) => {
      try {
        // Lock mechanism using Redis to prevent concurrent completions
        const lockKey = `task:lock:${data.userId}:${data.taskId}`;
        const lockAcquired = await redis.getClient().set(lockKey, '1', 'NX', 'EX', 30);

        if (!lockAcquired) {
          throw new AppError('Task completion already in progress', 409);
        }

        try {
          // Check if task exists and is active
          const taskResult = await client.query(
            'SELECT * FROM tasks WHERE id = $1 AND is_active = true FOR UPDATE',
            [data.taskId]
          );

          if (taskResult.rows.length === 0) {
            throw new AppError('Task not found or inactive', 404);
          }

          const task = taskResult.rows[0];

          // Check if user already completed this task
          const existingCompletion = await client.query(
            'SELECT id, version FROM task_completions WHERE user_id = $1 AND task_id = $2',
            [data.userId, data.taskId]
          );

          if (existingCompletion.rows.length > 0) {
            throw new AppError('Task already completed', 409);
          }

          // Calculate points
          let pointsEarned = task.base_points;

          // Add bonus for high accuracy
          if (data.accuracyPercentage && data.accuracyPercentage >= 95) {
            pointsEarned += task.bonus_points;
          }

          // Add time bonus if completed quickly
          if (task.time_limit_minutes && data.completionTimeSeconds) {
            const timeLimitSeconds = task.time_limit_minutes * 60;
            const timeUsedPercentage = data.completionTimeSeconds / timeLimitSeconds;
            if (timeUsedPercentage < 0.5) {
              pointsEarned += Math.floor(task.base_points * 0.2); // 20% bonus
            }
          }

          // Insert task completion
          const completionResult = await client.query(
            `INSERT INTO task_completions
             (user_id, task_id, points_earned, completion_time_seconds, accuracy_percentage, version)
             VALUES ($1, $2, $3, $4, $5, 1)
             RETURNING *`,
            [data.userId, data.taskId, pointsEarned, data.completionTimeSeconds, data.accuracyPercentage]
          );

          const completion = completionResult.rows[0];

          // Update user points using the database function
          const pointsUpdateResult = await client.query(
            `SELECT * FROM update_user_points($1, $2, $3, $4, $5)`,
            [
              data.userId,
              pointsEarned,
              'task_completion',
              completion.id,
              JSON.stringify({ taskId: data.taskId, taskTitle: task.title }),
            ]
          );

          const { new_total_points, old_rank, new_rank } = pointsUpdateResult.rows[0];

          // Update streak
          const streakResult = await StreakService.updateStreak(data.userId, client);

          // Check for cheat detection
          await CheatDetectionService.analyzeTaskCompletion({
            userId: data.userId,
            taskId: data.taskId,
            completionId: completion.id,
            completionTimeSeconds: data.completionTimeSeconds,
            accuracyPercentage: data.accuracyPercentage,
            pointsEarned,
          });

          // Invalidate cache
          await redis.deletePattern(`user:${data.userId}:*`);
          await redis.deletePattern('leaderboard:*');

          // Send notification if rank changed significantly
          if (old_rank && new_rank && Math.abs(old_rank - new_rank) >= 10) {
            await NotificationService.createNotification({
              userId: data.userId,
              type: 'rank_change',
              title: 'Rank Update',
              message: `You ${new_rank < old_rank ? 'climbed' : 'dropped'} from rank ${old_rank} to ${new_rank}!`,
              data: { oldRank: old_rank, newRank: new_rank },
            });
          }

          logger.info('Task completed successfully', {
            userId: data.userId,
            taskId: data.taskId,
            pointsEarned,
            newTotalPoints: new_total_points,
            newRank: new_rank,
          });

          return {
            completion,
            pointsEarned,
            totalPoints: new_total_points,
            oldRank: old_rank,
            newRank: new_rank,
            streak: streakResult,
          };
        } finally {
          // Release lock
          await redis.del(lockKey);
        }
      } catch (error) {
        logger.error('Error completing task', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: data.userId,
          taskId: data.taskId,
        });
        throw error;
      }
    });
  }

  static async createTask(taskData: {
    title: string;
    description?: string;
    category: string;
    difficulty: string;
    basePoints: number;
    bonusPoints?: number;
    timeLimitMinutes?: number;
  }) {
    try {
      const result = await db.query(
        `INSERT INTO tasks (title, description, category, difficulty, base_points, bonus_points, time_limit_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          taskData.title,
          taskData.description,
          taskData.category,
          taskData.difficulty,
          taskData.basePoints,
          taskData.bonusPoints || 0,
          taskData.timeLimitMinutes,
        ]
      );

      logger.info('Task created successfully', { taskId: result.rows[0].id, title: taskData.title });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating task', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  static async updateTask(taskId: string, updates: Partial<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    basePoints: number;
    bonusPoints: number;
    timeLimitMinutes: number;
    isActive: boolean;
  }>) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      fields.push(`updated_at = NOW()`);
      values.push(taskId);

      const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Task not found', 404);
      }

      logger.info('Task updated successfully', { taskId });

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating task', { error: error instanceof Error ? error.message : 'Unknown error', taskId });
      throw error;
    }
  }
}
