import { db } from '../config/database';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';

export class StreakService {
  static async updateStreak(userId: string, client?: any) {
    try {
      const dbClient = client || db.getPool();

      // Use the database function to update streak
      const result = await dbClient.query(
        'SELECT * FROM update_user_streak($1)',
        [userId]
      );

      const { current_streak, longest_streak, streak_maintained } = result.rows[0];

      // Award bonus points for maintaining streak
      if (streak_maintained && current_streak > 0 && current_streak % 7 === 0) {
        const bonusPoints = parseInt(process.env.STREAK_BONUS_POINTS || '10') * (current_streak / 7);
        await dbClient.query(
          `SELECT * FROM update_user_points($1, $2, $3, $4, $5)`,
          [
            userId,
            bonusPoints,
            'streak_bonus',
            null,
            JSON.stringify({ streakDays: current_streak }),
          ]
        );

        // Send notification for milestone
        await NotificationService.createNotification({
          userId,
          type: 'achievement',
          title: 'Streak Milestone!',
          message: `You've maintained a ${current_streak}-day streak! Earned ${bonusPoints} bonus points.`,
          data: { streak: current_streak, bonusPoints },
        });
      }

      // Send notification for new longest streak
      if (current_streak === longest_streak && longest_streak > 1) {
        await NotificationService.createNotification({
          userId,
          type: 'achievement',
          title: 'New Personal Best!',
          message: `You've achieved your longest streak: ${longest_streak} days!`,
          data: { longestStreak: longest_streak },
        });
      }

      logger.info('Streak updated', { userId, currentStreak: current_streak, longestStreak: longest_streak });

      return {
        currentStreak: current_streak,
        longestStreak: longest_streak,
        streakMaintained: streak_maintained,
      };
    } catch (error) {
      logger.error('Error updating streak', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async getUserStreak(userId: string) {
    try {
      const result = await db.query(
        'SELECT current_streak, longest_streak, last_activity_date FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        currentStreak: result.rows[0].current_streak,
        longestStreak: result.rows[0].longest_streak,
        lastActivityDate: result.rows[0].last_activity_date,
      };
    } catch (error) {
      logger.error('Error fetching user streak', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async getStreakHistory(userId: string, days: number = 30) {
    try {
      const result = await db.query(
        `SELECT
          streak_date,
          tasks_completed,
          points_earned,
          is_active
         FROM streak_history
         WHERE user_id = $1
           AND streak_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY streak_date DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching streak history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async checkAndUpdateStreaks() {
    try {
      logger.info('Starting streak check for all users');

      // Get all users who were active yesterday but not today
      const result = await db.query(`
        SELECT id
        FROM users
        WHERE last_activity_date < CURRENT_DATE
          AND current_streak > 0
          AND is_active = true
      `);

      const gracePeriodHours = parseInt(process.env.STREAK_GRACE_PERIOD_HOURS || '4');

      for (const user of result.rows) {
        try {
          // Check if within grace period
          const lastActivityResult = await db.query(
            `SELECT last_activity_date,
                    EXTRACT(EPOCH FROM (NOW() - (last_activity_date::timestamp + INTERVAL '1 day'))) / 3600 AS hours_since
             FROM users
             WHERE id = $1`,
            [user.id]
          );

          const hoursSince = parseFloat(lastActivityResult.rows[0].hours_since);

          if (hoursSince > gracePeriodHours) {
            // Streak is broken, reset to 0
            await db.query(
              'UPDATE users SET current_streak = 0, updated_at = NOW() WHERE id = $1',
              [user.id]
            );

            // Mark streak history as inactive
            await db.query(
              `UPDATE streak_history
               SET is_active = false
               WHERE user_id = $1 AND is_active = true`,
              [user.id]
            );

            // Send notification
            await NotificationService.createNotification({
              userId: user.id,
              type: 'streak_broken',
              title: 'Streak Broken',
              message: `Your activity streak has ended. Start a new one by completing tasks today!`,
              data: {},
            });

            logger.info('User streak reset', { userId: user.id });
          }
        } catch (error) {
          logger.error('Error checking individual user streak', {
            userId: user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Streak check completed', { usersChecked: result.rows.length });
    } catch (error) {
      logger.error('Error in streak check process', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async getStreakLeaderboard(limit: number = 10) {
    try {
      const result = await db.query(
        `SELECT
          id,
          username,
          display_name,
          avatar_url,
          current_streak,
          longest_streak
         FROM users
         WHERE is_active = true AND is_banned = false
         ORDER BY current_streak DESC, longest_streak DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching streak leaderboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
