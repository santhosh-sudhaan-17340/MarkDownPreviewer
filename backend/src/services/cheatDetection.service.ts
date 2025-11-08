import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface TaskCompletionAnalysis {
  userId: string;
  taskId: string;
  completionId: string;
  completionTimeSeconds?: number;
  accuracyPercentage?: number;
  pointsEarned: number;
}

export class CheatDetectionService {
  private static readonly ENABLED = process.env.CHEAT_DETECTION_ENABLED === 'true';
  private static readonly SPEED_THRESHOLD = parseFloat(process.env.CHEAT_SPEED_THRESHOLD || '0.3');
  private static readonly ACCURACY_THRESHOLD = parseFloat(process.env.CHEAT_ACCURACY_THRESHOLD || '0.98');
  private static readonly MAX_COMPLETIONS_PER_HOUR = parseInt(process.env.CHEAT_MAX_COMPLETIONS_PER_HOUR || '20');
  private static readonly PATTERN_WINDOW_HOURS = parseInt(process.env.CHEAT_PATTERN_WINDOW_HOURS || '24');

  static async analyzeTaskCompletion(data: TaskCompletionAnalysis) {
    if (!this.ENABLED) {
      return;
    }

    try {
      const detections: Array<{
        type: string;
        severity: string;
        description: string;
        evidence: any;
      }> = [];

      // Check 1: Impossible speed (completing too fast)
      if (data.completionTimeSeconds) {
        const taskResult = await db.query(
          'SELECT time_limit_minutes FROM tasks WHERE id = $1',
          [data.taskId]
        );

        if (taskResult.rows.length > 0 && taskResult.rows[0].time_limit_minutes) {
          const expectedMinTime = taskResult.rows[0].time_limit_minutes * 60 * this.SPEED_THRESHOLD;

          if (data.completionTimeSeconds < expectedMinTime) {
            detections.push({
              type: 'impossible_speed',
              severity: 'high',
              description: `Task completed in ${data.completionTimeSeconds}s, expected minimum ${expectedMinTime}s`,
              evidence: {
                completionTime: data.completionTimeSeconds,
                expectedMinTime,
                threshold: this.SPEED_THRESHOLD,
              },
            });
          }
        }
      }

      // Check 2: Suspiciously high accuracy
      if (data.accuracyPercentage && data.accuracyPercentage >= this.ACCURACY_THRESHOLD * 100) {
        // Check if user has similar high accuracy on multiple tasks
        const accuracyResult = await db.query(
          `SELECT COUNT(*) as high_accuracy_count
           FROM task_completions
           WHERE user_id = $1
             AND accuracy_percentage >= $2
             AND completed_at >= NOW() - INTERVAL '${this.PATTERN_WINDOW_HOURS} hours'`,
          [data.userId, this.ACCURACY_THRESHOLD * 100]
        );

        if (parseInt(accuracyResult.rows[0].high_accuracy_count) >= 5) {
          detections.push({
            type: 'suspicious_accuracy',
            severity: 'medium',
            description: `Consistently high accuracy (>= ${this.ACCURACY_THRESHOLD * 100}%) across multiple tasks`,
            evidence: {
              currentAccuracy: data.accuracyPercentage,
              highAccuracyCount: accuracyResult.rows[0].high_accuracy_count,
              timeWindowHours: this.PATTERN_WINDOW_HOURS,
            },
          });
        }
      }

      // Check 3: Excessive completions in short time
      const rateResult = await db.query(
        `SELECT COUNT(*) as recent_completions
         FROM task_completions
         WHERE user_id = $1
           AND completed_at >= NOW() - INTERVAL '1 hour'`,
        [data.userId]
      );

      const recentCompletions = parseInt(rateResult.rows[0].recent_completions);
      if (recentCompletions > this.MAX_COMPLETIONS_PER_HOUR) {
        detections.push({
          type: 'excessive_completion_rate',
          severity: 'high',
          description: `Completed ${recentCompletions} tasks in the last hour (max: ${this.MAX_COMPLETIONS_PER_HOUR})`,
          evidence: {
            completionsLastHour: recentCompletions,
            threshold: this.MAX_COMPLETIONS_PER_HOUR,
          },
        });
      }

      // Check 4: Pattern of completing tasks at exact same times
      const patternResult = await db.query(
        `SELECT
          DATE_TRUNC('minute', completed_at) as completion_minute,
          COUNT(*) as count
         FROM task_completions
         WHERE user_id = $1
           AND completed_at >= NOW() - INTERVAL '${this.PATTERN_WINDOW_HOURS} hours'
         GROUP BY DATE_TRUNC('minute', completed_at)
         HAVING COUNT(*) >= 3
         ORDER BY count DESC
         LIMIT 1`,
        [data.userId]
      );

      if (patternResult.rows.length > 0) {
        detections.push({
          type: 'suspicious_timing_pattern',
          severity: 'medium',
          description: `Multiple tasks completed at the same minute`,
          evidence: {
            completionsAtSameMinute: patternResult.rows[0].count,
            minute: patternResult.rows[0].completion_minute,
          },
        });
      }

      // Check 5: Sudden spike in performance
      const performanceResult = await db.query(
        `WITH recent_avg AS (
          SELECT AVG(accuracy_percentage) as avg_accuracy
          FROM task_completions
          WHERE user_id = $1
            AND completed_at >= NOW() - INTERVAL '7 days'
            AND completed_at < NOW() - INTERVAL '1 day'
        ),
        today_avg AS (
          SELECT AVG(accuracy_percentage) as avg_accuracy
          FROM task_completions
          WHERE user_id = $1
            AND completed_at >= NOW() - INTERVAL '1 day'
        )
        SELECT
          recent_avg.avg_accuracy as recent,
          today_avg.avg_accuracy as today
        FROM recent_avg, today_avg`,
        [data.userId]
      );

      if (performanceResult.rows.length > 0) {
        const recentAvg = parseFloat(performanceResult.rows[0].recent) || 0;
        const todayAvg = parseFloat(performanceResult.rows[0].today) || 0;

        if (recentAvg > 0 && todayAvg > recentAvg * 1.3) {
          detections.push({
            type: 'performance_spike',
            severity: 'low',
            description: `Sudden 30%+ improvement in accuracy`,
            evidence: {
              recentAverage: recentAvg,
              todayAverage: todayAvg,
              improvement: ((todayAvg - recentAvg) / recentAvg * 100).toFixed(2) + '%',
            },
          });
        }
      }

      // Log all detections
      for (const detection of detections) {
        await db.query(
          `INSERT INTO cheat_detection_logs
           (user_id, task_completion_id, detection_type, severity, description, evidence)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            data.userId,
            data.completionId,
            detection.type,
            detection.severity,
            detection.description,
            JSON.stringify(detection.evidence),
          ]
        );

        logger.warn('Cheat detection triggered', {
          userId: data.userId,
          taskId: data.taskId,
          completionId: data.completionId,
          type: detection.type,
          severity: detection.severity,
        });

        // Flag task completion for review if high severity
        if (detection.severity === 'high' || detection.severity === 'critical') {
          await db.query(
            'UPDATE task_completions SET flagged_for_review = true WHERE id = $1',
            [data.completionId]
          );
        }
      }

      return detections;
    } catch (error) {
      logger.error('Error in cheat detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: data.userId,
        taskId: data.taskId,
      });
      // Don't throw, as this shouldn't block task completion
    }
  }

  static async getUserDetections(userId: string, limit: number = 10) {
    try {
      const result = await db.query(
        `SELECT
          cdl.*,
          tc.task_id,
          t.title as task_title
         FROM cheat_detection_logs cdl
         LEFT JOIN task_completions tc ON tc.id = cdl.task_completion_id
         LEFT JOIN tasks t ON t.id = tc.task_id
         WHERE cdl.user_id = $1
         ORDER BY cdl.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user detections', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async getPendingReviews(limit: number = 50) {
    try {
      const result = await db.query(
        `SELECT
          cdl.*,
          u.username,
          u.display_name,
          tc.task_id,
          t.title as task_title
         FROM cheat_detection_logs cdl
         INNER JOIN users u ON u.id = cdl.user_id
         LEFT JOIN task_completions tc ON tc.id = cdl.task_completion_id
         LEFT JOIN tasks t ON t.id = tc.task_id
         WHERE cdl.status = 'pending'
         ORDER BY cdl.severity DESC, cdl.created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async reviewDetection(
    detectionId: string,
    reviewerId: string,
    status: 'confirmed' | 'dismissed',
    actionTaken?: string
  ) {
    try {
      const result = await db.query(
        `UPDATE cheat_detection_logs
         SET status = $1,
             reviewed_by = $2,
             reviewed_at = NOW(),
             action_taken = $3
         WHERE id = $4
         RETURNING *`,
        [status, reviewerId, actionTaken, detectionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Detection not found');
      }

      logger.info('Detection reviewed', {
        detectionId,
        reviewerId,
        status,
        actionTaken,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error reviewing detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        detectionId,
      });
      throw error;
    }
  }

  static async getDetectionStats(userId?: string) {
    try {
      let query = `
        SELECT
          detection_type,
          severity,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
        FROM cheat_detection_logs
      `;

      const params: any[] = [];
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }

      query += ' GROUP BY detection_type, severity ORDER BY count DESC';

      const result = await db.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching detection stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }
}
