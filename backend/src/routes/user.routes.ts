import { Router } from 'express';
import Joi from 'joi';
import { db } from '../config/database';
import { StreakService } from '../services/streak.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get user profile
router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
        id,
        username,
        display_name,
        avatar_url,
        total_points,
        global_rank,
        current_streak,
        longest_streak,
        created_at
       FROM users
       WHERE id = $1 AND is_active = true`,
      [req.params.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  })
);

// Get user stats
router.get(
  '/:userId/stats',
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    const [userResult, tasksResult, streakResult] = await Promise.all([
      db.query(
        `SELECT total_points, global_rank, current_streak, longest_streak
         FROM users WHERE id = $1`,
        [userId]
      ),
      db.query(
        `SELECT
          COUNT(*) as total_completed,
          SUM(points_earned) as total_points_earned,
          AVG(accuracy_percentage) as avg_accuracy,
          AVG(completion_time_seconds) as avg_completion_time
         FROM task_completions
         WHERE user_id = $1 AND is_valid = true`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) as active_days
         FROM streak_history
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      ),
    ]);

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        ...userResult.rows[0],
        ...tasksResult.rows[0],
        activeDays: parseInt(streakResult.rows[0].active_days),
      },
    });
  })
);

// Get user streak
router.get(
  '/:userId/streak',
  asyncHandler(async (req, res) => {
    const streak = await StreakService.getUserStreak(req.params.userId);
    res.json({
      success: true,
      data: streak,
    });
  })
);

// Get user streak history
router.get(
  '/:userId/streak/history',
  validateQuery(Joi.object({ days: Joi.number().min(1).max(365).default(30) })),
  asyncHandler(async (req, res) => {
    const { days } = req.query as any;
    const history = await StreakService.getStreakHistory(req.params.userId, days);
    res.json({
      success: true,
      data: { history, days },
    });
  })
);

// Update user profile
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { displayName, avatarUrl } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (displayName) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(displayName);
    }

    if (avatarUrl) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updates.push('updated_at = NOW()');
    values.push(req.user!.id);

    const result = await db.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, username, display_name, avatar_url`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] },
    });
  })
);

// Search users
router.get(
  '/',
  validateQuery(Joi.object({
    query: Joi.string().min(1).max(50).required(),
    limit: Joi.number().min(1).max(50).default(20),
  })),
  asyncHandler(async (req, res) => {
    const { query, limit } = req.query as any;

    const result = await db.query(
      `SELECT
        id,
        username,
        display_name,
        avatar_url,
        total_points,
        global_rank
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1)
         AND is_active = true
         AND is_banned = false
       ORDER BY total_points DESC
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    res.json({
      success: true,
      data: { users: result.rows, count: result.rows.length },
    });
  })
);

export default router;
