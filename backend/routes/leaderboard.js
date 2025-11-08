const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateUuidParam } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * @route   GET /api/leaderboard/global
 * @desc    Get global leaderboard with optimized SQL ranking
 * @access  Private
 */
router.get('/global', authenticate, validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const timeframe = req.query.timeframe || 'all'; // all, week, month

        let queryText;
        let params = [limit, offset];

        if (timeframe === 'week' || timeframe === 'month') {
            // Dynamic ranking for specific timeframe
            const interval = timeframe === 'week' ? '7 days' : '30 days';

            queryText = `
                WITH ranked_users AS (
                    SELECT
                        u.id,
                        u.username,
                        u.display_name,
                        u.avatar_url,
                        u.current_streak,
                        COALESCE(SUM(sh.points_change), 0) as timeframe_points,
                        RANK() OVER (ORDER BY COALESCE(SUM(sh.points_change), 0) DESC, u.current_streak DESC) as rank,
                        DENSE_RANK() OVER (ORDER BY COALESCE(SUM(sh.points_change), 0) DESC, u.current_streak DESC) as dense_rank,
                        COUNT(*) OVER () as total_users
                    FROM users u
                    LEFT JOIN score_history sh ON u.id = sh.user_id
                        AND sh.created_at >= NOW() - INTERVAL '${interval}'
                    WHERE u.is_active = true AND u.is_banned = false
                    GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.current_streak
                )
                SELECT * FROM ranked_users
                ORDER BY rank
                LIMIT $1 OFFSET $2
            `;
        } else {
            // Use materialized view for all-time rankings (optimized)
            queryText = `
                SELECT
                    id,
                    username,
                    display_name,
                    avatar_url,
                    total_points as timeframe_points,
                    current_streak,
                    global_rank as rank,
                    dense_rank,
                    total_users
                FROM global_rankings
                ORDER BY global_rank
                LIMIT $1 OFFSET $2
            `;
        }

        const result = await query(queryText, params);

        // Get current user's rank
        const userRankQuery = timeframe === 'all'
            ? `SELECT global_rank as rank FROM global_rankings WHERE id = $1`
            : `
                WITH ranked_users AS (
                    SELECT
                        u.id,
                        RANK() OVER (ORDER BY COALESCE(SUM(sh.points_change), 0) DESC, u.current_streak DESC) as rank
                    FROM users u
                    LEFT JOIN score_history sh ON u.id = sh.user_id
                        AND sh.created_at >= NOW() - INTERVAL '${timeframe === 'week' ? '7 days' : '30 days'}'
                    WHERE u.is_active = true AND u.is_banned = false
                    GROUP BY u.id
                )
                SELECT rank FROM ranked_users WHERE id = $1
            `;

        const userRankResult = await query(userRankQuery, [req.user.id]);
        const userRank = userRankResult.rows.length > 0 ? userRankResult.rows[0].rank : null;

        const totalUsers = result.rows.length > 0 ? parseInt(result.rows[0].total_users) : 0;

        res.json({
            success: true,
            data: {
                leaderboard: result.rows.map(row => ({
                    rank: parseInt(row.rank),
                    userId: row.id,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                    points: parseInt(row.timeframe_points),
                    currentStreak: row.current_streak,
                    isCurrentUser: row.id === req.user.id
                })),
                currentUser: {
                    rank: userRank,
                    userId: req.user.id
                },
                pagination: {
                    page,
                    limit,
                    total: totalUsers,
                    pages: Math.ceil(totalUsers / limit)
                },
                timeframe
            }
        });
    } catch (error) {
        logger.error('Get global leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get global leaderboard'
        });
    }
});

/**
 * @route   GET /api/leaderboard/group/:groupId
 * @desc    Get friend group leaderboard with optimized SQL ranking
 * @access  Private
 */
router.get('/group/:groupId', authenticate, validateUuidParam('groupId'), validatePagination, async (req, res) => {
    try {
        const { groupId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const timeframe = req.query.timeframe || 'all';

        // Verify user is member of the group
        const membershipCheck = await query(
            'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [groupId, req.user.id]
        );

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You are not a member of this group'
            });
        }

        let queryText;
        let params;

        if (timeframe === 'week' || timeframe === 'month') {
            const interval = timeframe === 'week' ? '7 days' : '30 days';

            queryText = `
                WITH group_members AS (
                    SELECT u.id, u.username, u.display_name, u.avatar_url, u.current_streak
                    FROM users u
                    JOIN group_memberships gm ON u.id = gm.user_id
                    WHERE gm.group_id = $1 AND u.is_active = true AND u.is_banned = false
                ),
                ranked_members AS (
                    SELECT
                        gm.id,
                        gm.username,
                        gm.display_name,
                        gm.avatar_url,
                        gm.current_streak,
                        COALESCE(SUM(sh.points_change), 0) as timeframe_points,
                        RANK() OVER (ORDER BY COALESCE(SUM(sh.points_change), 0) DESC, gm.current_streak DESC) as rank,
                        COUNT(*) OVER () as total_members
                    FROM group_members gm
                    LEFT JOIN score_history sh ON gm.id = sh.user_id
                        AND sh.created_at >= NOW() - INTERVAL '${interval}'
                    GROUP BY gm.id, gm.username, gm.display_name, gm.avatar_url, gm.current_streak
                )
                SELECT * FROM ranked_members
                ORDER BY rank
                LIMIT $2 OFFSET $3
            `;
            params = [groupId, limit, offset];
        } else {
            queryText = `
                WITH group_members AS (
                    SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points, u.current_streak
                    FROM users u
                    JOIN group_memberships gm ON u.id = gm.user_id
                    WHERE gm.group_id = $1 AND u.is_active = true AND u.is_banned = false
                ),
                ranked_members AS (
                    SELECT
                        gm.id,
                        gm.username,
                        gm.display_name,
                        gm.avatar_url,
                        gm.total_points as timeframe_points,
                        gm.current_streak,
                        RANK() OVER (ORDER BY gm.total_points DESC, gm.current_streak DESC) as rank,
                        COUNT(*) OVER () as total_members
                    FROM group_members gm
                )
                SELECT * FROM ranked_members
                ORDER BY rank
                LIMIT $2 OFFSET $3
            `;
            params = [groupId, limit, offset];
        }

        const result = await query(queryText, params);

        // Get current user's rank in group
        const userRankQuery = `
            WITH group_members AS (
                SELECT u.id, u.username, u.total_points, u.current_streak
                FROM users u
                JOIN group_memberships gm ON u.id = gm.user_id
                WHERE gm.group_id = $1 AND u.is_active = true
            ),
            ranked_members AS (
                SELECT
                    gm.id,
                    RANK() OVER (ORDER BY gm.total_points DESC, gm.current_streak DESC) as rank
                FROM group_members gm
            )
            SELECT rank FROM ranked_members WHERE id = $2
        `;

        const userRankResult = await query(userRankQuery, [groupId, req.user.id]);
        const userRank = userRankResult.rows.length > 0 ? parseInt(userRankResult.rows[0].rank) : null;

        const totalMembers = result.rows.length > 0 ? parseInt(result.rows[0].total_members) : 0;

        res.json({
            success: true,
            data: {
                groupId,
                leaderboard: result.rows.map(row => ({
                    rank: parseInt(row.rank),
                    userId: row.id,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                    points: parseInt(row.timeframe_points),
                    currentStreak: row.current_streak,
                    isCurrentUser: row.id === req.user.id
                })),
                currentUser: {
                    rank: userRank,
                    userId: req.user.id
                },
                pagination: {
                    page,
                    limit,
                    total: totalMembers,
                    pages: Math.ceil(totalMembers / limit)
                },
                timeframe
            }
        });
    } catch (error) {
        logger.error('Get group leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get group leaderboard'
        });
    }
});

/**
 * @route   GET /api/leaderboard/category/:category
 * @desc    Get category-specific leaderboard
 * @access  Private
 */
router.get('/category/:category', authenticate, validatePagination, async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const queryText = `
            WITH category_scores AS (
                SELECT
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    u.current_streak,
                    SUM(utc.points_earned) as category_points,
                    COUNT(utc.id) as tasks_completed
                FROM users u
                LEFT JOIN user_task_completions utc ON u.id = utc.user_id AND utc.is_valid = true
                LEFT JOIN tasks t ON utc.task_id = t.id
                WHERE (t.category = $1 OR t.category IS NULL)
                    AND u.is_active = true AND u.is_banned = false
                GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.current_streak
            ),
            ranked_users AS (
                SELECT
                    *,
                    RANK() OVER (ORDER BY category_points DESC, tasks_completed DESC) as rank,
                    COUNT(*) OVER () as total_users
                FROM category_scores
                WHERE category_points > 0
            )
            SELECT * FROM ranked_users
            ORDER BY rank
            LIMIT $2 OFFSET $3
        `;

        const result = await query(queryText, [category, limit, offset]);

        const totalUsers = result.rows.length > 0 ? parseInt(result.rows[0].total_users) : 0;

        res.json({
            success: true,
            data: {
                category,
                leaderboard: result.rows.map(row => ({
                    rank: parseInt(row.rank),
                    userId: row.id,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                    categoryPoints: parseInt(row.category_points),
                    tasksCompleted: parseInt(row.tasks_completed),
                    currentStreak: row.current_streak,
                    isCurrentUser: row.id === req.user.id
                })),
                pagination: {
                    page,
                    limit,
                    total: totalUsers,
                    pages: Math.ceil(totalUsers / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get category leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get category leaderboard'
        });
    }
});

module.exports = router;
