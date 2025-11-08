const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateUuidParam } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID
 * @access  Private
 */
router.get('/:id', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url,
                    u.total_points, u.current_streak, u.longest_streak,
                    u.last_activity_date, u.join_date,
                    gr.global_rank,
                    COUNT(DISTINCT utc.id) as tasks_completed,
                    COUNT(DISTINCT gm.group_id) as groups_joined
             FROM users u
             LEFT JOIN global_rankings gr ON u.id = gr.id
             LEFT JOIN user_task_completions utc ON u.id = utc.user_id AND utc.is_valid = true
             LEFT JOIN group_memberships gm ON u.id = gm.user_id
             WHERE u.id = $1 AND u.is_active = true
             GROUP BY u.id, gr.global_rank`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    displayName: user.display_name,
                    avatarUrl: user.avatar_url,
                    totalPoints: user.total_points,
                    currentStreak: user.current_streak,
                    longestStreak: user.longest_streak,
                    lastActivityDate: user.last_activity_date,
                    joinDate: user.join_date,
                    globalRank: user.global_rank,
                    tasksCompleted: parseInt(user.tasks_completed),
                    groupsJoined: parseInt(user.groups_joined)
                }
            }
        });
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});

/**
 * @route   GET /api/users/:id/history
 * @desc    Get user's score history
 * @access  Private
 */
router.get('/:id/history', authenticate, validateUuidParam('id'), validatePagination, async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Verify user exists and is accessible
        if (id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const result = await query(
            `SELECT sh.id, sh.points_change, sh.points_after, sh.reason, sh.created_at,
                    t.title as task_title
             FROM score_history sh
             LEFT JOIN user_task_completions utc ON sh.task_completion_id = utc.id
             LEFT JOIN tasks t ON utc.task_id = t.id
             WHERE sh.user_id = $1
             ORDER BY sh.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        const countResult = await query(
            'SELECT COUNT(*) as total FROM score_history WHERE user_id = $1',
            [id]
        );

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                history: result.rows.map(row => ({
                    id: row.id,
                    pointsChange: row.points_change,
                    pointsAfter: row.points_after,
                    reason: row.reason,
                    taskTitle: row.task_title,
                    createdAt: row.created_at
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error('Get user history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user history'
        });
    }
});

/**
 * @route   GET /api/users/:id/streaks
 * @desc    Get user's streak history
 * @access  Private
 */
router.get('/:id/streaks', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const days = parseInt(req.query.days) || 30;

        const result = await query(
            `SELECT streak_date, tasks_completed, points_earned
             FROM streaks
             WHERE user_id = $1 AND streak_date >= CURRENT_DATE - INTERVAL '${days} days'
             ORDER BY streak_date DESC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                streaks: result.rows.map(row => ({
                    date: row.streak_date,
                    tasksCompleted: row.tasks_completed,
                    pointsEarned: row.points_earned
                }))
            }
        });
    } catch (error) {
        logger.error('Get streaks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get streak history'
        });
    }
});

module.exports = router;
