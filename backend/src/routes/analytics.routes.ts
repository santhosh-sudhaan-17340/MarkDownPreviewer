import { Router } from 'express';
import Joi from 'joi';
import { db } from '../config/database';
import { CheatDetectionService } from '../services/cheatDetection.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user performance metrics
router.get(
  '/performance/:userId',
  authenticate,
  validateQuery(Joi.object({
    days: Joi.number().min(1).max(365).default(30),
  })),
  asyncHandler(async (req, res) => {
    const { days } = req.query as any;

    const result = await db.query(
      `SELECT
        metric_date,
        tasks_completed,
        points_earned,
        avg_accuracy,
        avg_completion_time_seconds,
        categories_attempted,
        streak_maintained
       FROM performance_metrics
       WHERE user_id = $1
         AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY metric_date DESC`,
      [req.params.userId]
    );

    res.json({
      success: true,
      data: { metrics: result.rows, days },
    });
  })
);

// Get user category breakdown
router.get(
  '/categories/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
        t.category,
        COUNT(*) as tasks_completed,
        SUM(tc.points_earned) as total_points,
        AVG(tc.accuracy_percentage) as avg_accuracy,
        AVG(tc.completion_time_seconds) as avg_completion_time
       FROM task_completions tc
       INNER JOIN tasks t ON t.id = tc.task_id
       WHERE tc.user_id = $1 AND tc.is_valid = true
       GROUP BY t.category
       ORDER BY total_points DESC`,
      [req.params.userId]
    );

    res.json({
      success: true,
      data: { categories: result.rows },
    });
  })
);

// Get user difficulty breakdown
router.get(
  '/difficulty/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
        t.difficulty,
        COUNT(*) as tasks_completed,
        SUM(tc.points_earned) as total_points,
        AVG(tc.accuracy_percentage) as avg_accuracy,
        AVG(tc.completion_time_seconds) as avg_completion_time
       FROM task_completions tc
       INNER JOIN tasks t ON t.id = tc.task_id
       WHERE tc.user_id = $1 AND tc.is_valid = true
       GROUP BY t.difficulty
       ORDER BY
         CASE t.difficulty
           WHEN 'beginner' THEN 1
           WHEN 'intermediate' THEN 2
           WHEN 'advanced' THEN 3
           WHEN 'expert' THEN 4
         END`,
      [req.params.userId]
    );

    res.json({
      success: true,
      data: { difficulties: result.rows },
    });
  })
);

// Get user progress over time
router.get(
  '/progress/:userId',
  authenticate,
  validateQuery(Joi.object({
    interval: Joi.string().valid('day', 'week', 'month').default('day'),
    limit: Joi.number().min(1).max(100).default(30),
  })),
  asyncHandler(async (req, res) => {
    const { interval, limit } = req.query as any;

    let dateFormat: string;
    let intervalString: string;

    switch (interval) {
      case 'week':
        dateFormat = 'YYYY-IW';
        intervalString = '1 week';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        intervalString = '1 month';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        intervalString = '1 day';
    }

    const result = await db.query(
      `SELECT
        TO_CHAR(completed_at, '${dateFormat}') as period,
        COUNT(*) as tasks_completed,
        SUM(points_earned) as points_earned,
        AVG(accuracy_percentage) as avg_accuracy
       FROM task_completions
       WHERE user_id = $1
         AND is_valid = true
         AND completed_at >= NOW() - INTERVAL '${limit} ${interval}s'
       GROUP BY period
       ORDER BY period DESC
       LIMIT $2`,
      [req.params.userId, limit]
    );

    res.json({
      success: true,
      data: { progress: result.rows, interval },
    });
  })
);

// Get cheat detection logs for user
router.get(
  '/cheat-detection/:userId',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().min(1).max(50).default(10),
  })),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as any;
    const detections = await CheatDetectionService.getUserDetections(req.params.userId, limit);

    res.json({
      success: true,
      data: { detections, count: detections.length },
    });
  })
);

// Get cheat detection stats
router.get(
  '/cheat-detection/stats/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await CheatDetectionService.getDetectionStats(req.params.userId);

    res.json({
      success: true,
      data: { stats },
    });
  })
);

// Get global analytics (admin only - simplified for now)
router.get(
  '/global',
  authenticate,
  asyncHandler(async (req, res) => {
    const [usersResult, tasksResult, completionsResult] = await Promise.all([
      db.query('SELECT COUNT(*) as total_users FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) as total_tasks FROM tasks WHERE is_active = true'),
      db.query(`
        SELECT
          COUNT(*) as total_completions,
          SUM(points_earned) as total_points_awarded,
          AVG(accuracy_percentage) as avg_accuracy
        FROM task_completions
        WHERE is_valid = true
      `),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0].total_users),
        totalTasks: parseInt(tasksResult.rows[0].total_tasks),
        totalCompletions: parseInt(completionsResult.rows[0].total_completions),
        totalPointsAwarded: parseInt(completionsResult.rows[0].total_points_awarded || 0),
        avgAccuracy: parseFloat(completionsResult.rows[0].avg_accuracy || 0),
      },
    });
  })
);

// Get recent activity feed
router.get(
  '/activity/:userId',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().min(1).max(50).default(20),
  })),
  asyncHandler(async (req, res) => {
    const { limit } = req.query as any;

    const result = await db.query(
      `SELECT
        tc.id,
        tc.completed_at,
        tc.points_earned,
        tc.accuracy_percentage,
        t.title as task_title,
        t.category,
        t.difficulty
       FROM task_completions tc
       INNER JOIN tasks t ON t.id = tc.task_id
       WHERE tc.user_id = $1 AND tc.is_valid = true
       ORDER BY tc.completed_at DESC
       LIMIT $2`,
      [req.params.userId, limit]
    );

    res.json({
      success: true,
      data: { activity: result.rows, count: result.rows.length },
    });
  })
);

export default router;
