import { db } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class RankingService {
  private static readonly GLOBAL_CACHE_TTL = parseInt(process.env.CACHE_GLOBAL_RANKING_TTL || '300');
  private static readonly GROUP_CACHE_TTL = parseInt(process.env.CACHE_GROUP_RANKING_TTL || '180');

  static async getGlobalRankings(limit: number = 100, offset: number = 0) {
    try {
      const cacheKey = `leaderboard:global:${limit}:${offset}`;

      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Global rankings cache hit', { limit, offset });
        return cached;
      }

      // Get from database using optimized function
      const result = await db.query(
        'SELECT * FROM get_global_rankings($1, $2)',
        [limit, offset]
      );

      const rankings = result.rows;

      // Cache the results
      await redis.set(cacheKey, rankings, this.GLOBAL_CACHE_TTL);

      logger.debug('Global rankings fetched from database', { count: rankings.length });

      return rankings;
    } catch (error) {
      logger.error('Error fetching global rankings', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async getGroupRankings(groupId: string, limit: number = 100, offset: number = 0) {
    try {
      const cacheKey = `leaderboard:group:${groupId}:${limit}:${offset}`;

      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Group rankings cache hit', { groupId, limit, offset });
        return cached;
      }

      // Get from database using optimized function
      const result = await db.query(
        'SELECT * FROM get_group_rankings($1, $2, $3)',
        [groupId, limit, offset]
      );

      const rankings = result.rows;

      // Cache the results
      await redis.set(cacheKey, rankings, this.GROUP_CACHE_TTL);

      logger.debug('Group rankings fetched from database', { groupId, count: rankings.length });

      return rankings;
    } catch (error) {
      logger.error('Error fetching group rankings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        groupId,
      });
      throw error;
    }
  }

  static async getUserRank(userId: string, groupId?: string) {
    try {
      const cacheKey = groupId
        ? `user:${userId}:rank:group:${groupId}`
        : `user:${userId}:rank:global`;

      // Try cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return cached;
      }

      let query: string;
      let params: any[];

      if (groupId) {
        // Group rank
        query = `
          WITH group_users AS (
            SELECT u.id, u.total_points
            FROM users u
            INNER JOIN group_memberships gm ON gm.user_id = u.id
            WHERE gm.group_id = $1 AND u.is_active = true AND u.is_banned = false
          )
          SELECT
            (SELECT COUNT(*) + 1 FROM group_users WHERE total_points > (SELECT total_points FROM group_users WHERE id = $2)) AS rank,
            (SELECT total_points FROM group_users WHERE id = $2) AS total_points,
            (SELECT COUNT(*) FROM group_users) AS total_users
        `;
        params = [groupId, userId];
      } else {
        // Global rank
        query = `
          SELECT
            (SELECT COUNT(*) + 1 FROM users WHERE total_points > (SELECT total_points FROM users WHERE id = $1) AND is_active = true AND is_banned = false) AS rank,
            (SELECT total_points FROM users WHERE id = $1) AS total_points,
            (SELECT COUNT(*) FROM users WHERE is_active = true AND is_banned = false) AS total_users
        `;
        params = [userId];
      }

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      const rankData = {
        rank: parseInt(result.rows[0].rank),
        totalPoints: parseInt(result.rows[0].total_points),
        totalUsers: parseInt(result.rows[0].total_users),
        percentile: ((1 - (parseInt(result.rows[0].rank) - 1) / parseInt(result.rows[0].total_users)) * 100).toFixed(2),
      };

      // Cache for 1 minute
      await redis.set(cacheKey, rankData, 60);

      return rankData;
    } catch (error) {
      logger.error('Error fetching user rank', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        groupId,
      });
      throw error;
    }
  }

  static async updateCachedRankings() {
    try {
      logger.info('Starting cached rankings update');

      // Update global rankings cache
      await db.transaction(async (client) => {
        // Calculate and cache global rankings
        const globalResult = await client.query(`
          WITH ranked_users AS (
            SELECT
              u.id,
              DENSE_RANK() OVER (ORDER BY u.total_points DESC, u.created_at ASC) AS rank,
              u.total_points,
              COALESCE(cr.rank, 0) AS old_rank
            FROM users u
            LEFT JOIN cached_rankings cr ON cr.user_id = u.id AND cr.group_id IS NULL
            WHERE u.is_active = true AND u.is_banned = false
          )
          INSERT INTO cached_rankings (user_id, group_id, rank, total_points, rank_change, percentile, last_updated)
          SELECT
            id,
            NULL,
            rank,
            total_points,
            CASE WHEN old_rank > 0 THEN old_rank - rank ELSE 0 END,
            ROUND(((1.0 - (rank - 1)::DECIMAL / NULLIF((SELECT COUNT(*) FROM ranked_users), 0)) * 100)::NUMERIC, 2),
            NOW()
          FROM ranked_users
          ON CONFLICT (user_id, group_id)
          DO UPDATE SET
            rank = EXCLUDED.rank,
            total_points = EXCLUDED.total_points,
            rank_change = EXCLUDED.rank_change,
            percentile = EXCLUDED.percentile,
            last_updated = NOW()
        `);

        logger.info('Global rankings cached', { rows: globalResult.rowCount });

        // Update group rankings
        const groups = await client.query('SELECT id FROM friend_groups');

        for (const group of groups.rows) {
          await client.query(`
            WITH ranked_users AS (
              SELECT
                u.id,
                DENSE_RANK() OVER (ORDER BY u.total_points DESC) AS rank,
                u.total_points,
                COALESCE(cr.rank, 0) AS old_rank
              FROM users u
              INNER JOIN group_memberships gm ON gm.user_id = u.id
              LEFT JOIN cached_rankings cr ON cr.user_id = u.id AND cr.group_id = $1
              WHERE gm.group_id = $1 AND u.is_active = true AND u.is_banned = false
            )
            INSERT INTO cached_rankings (user_id, group_id, rank, total_points, rank_change, percentile, last_updated)
            SELECT
              id,
              $1,
              rank,
              total_points,
              CASE WHEN old_rank > 0 THEN old_rank - rank ELSE 0 END,
              ROUND(((1.0 - (rank - 1)::DECIMAL / NULLIF((SELECT COUNT(*) FROM ranked_users), 0)) * 100)::NUMERIC, 2),
              NOW()
            FROM ranked_users
            ON CONFLICT (user_id, group_id)
            DO UPDATE SET
              rank = EXCLUDED.rank,
              total_points = EXCLUDED.total_points,
              rank_change = EXCLUDED.rank_change,
              percentile = EXCLUDED.percentile,
              last_updated = NOW()
          `, [group.id]);
        }

        logger.info('Group rankings cached', { groupCount: groups.rows.length });
      });

      // Clear Redis cache to force refresh
      await redis.deletePattern('leaderboard:*');

      logger.info('Cached rankings update completed');
    } catch (error) {
      logger.error('Error updating cached rankings', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async getUsersAroundRank(userId: string, range: number = 5, groupId?: string) {
    try {
      // Get user's current rank
      const userRank = await this.getUserRank(userId, groupId);
      const userRankNum = userRank.rank;

      const start = Math.max(0, userRankNum - range - 1);
      const limit = range * 2 + 1;

      let rankings;
      if (groupId) {
        rankings = await this.getGroupRankings(groupId, limit, start);
      } else {
        rankings = await this.getGlobalRankings(limit, start);
      }

      return {
        userRank,
        rankings,
      };
    } catch (error) {
      logger.error('Error fetching users around rank', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        groupId,
      });
      throw error;
    }
  }

  static async getTopPerformers(timeframe: 'day' | 'week' | 'month' = 'week', limit: number = 10) {
    try {
      let interval: string;
      switch (timeframe) {
        case 'day':
          interval = '1 day';
          break;
        case 'week':
          interval = '7 days';
          break;
        case 'month':
          interval = '30 days';
          break;
      }

      const result = await db.query(
        `SELECT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          SUM(su.points_delta) as points_gained,
          COUNT(DISTINCT tc.id) as tasks_completed
         FROM users u
         INNER JOIN score_updates su ON su.user_id = u.id
         LEFT JOIN task_completions tc ON tc.user_id = u.id AND tc.completed_at >= NOW() - INTERVAL '${interval}'
         WHERE su.created_at >= NOW() - INTERVAL '${interval}'
           AND u.is_active = true
           AND u.is_banned = false
         GROUP BY u.id, u.username, u.display_name, u.avatar_url
         ORDER BY points_gained DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching top performers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeframe,
      });
      throw error;
    }
  }
}
