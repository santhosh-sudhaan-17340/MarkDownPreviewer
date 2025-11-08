const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateDateRange } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get user's performance analytics dashboard
 * @access  Private
 */
router.get('/dashboard', authenticate, validateDateRange, async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;

        // Get overall stats
        const overallStatsResult = await query(
            `SELECT
                u.total_points,
                u.current_streak,
                u.longest_streak,
                gr.global_rank,
                COUNT(DISTINCT utc.id) as total_tasks_completed,
                COUNT(DISTINCT utc.task_id) as unique_tasks_completed,
                COUNT(DISTINCT DATE(utc.completion_date)) as active_days,
                AVG(utc.points_earned) as avg_points_per_task
             FROM users u
             LEFT JOIN global_rankings gr ON u.id = gr.id
             LEFT JOIN user_task_completions utc ON u.id = utc.user_id AND utc.is_valid = true
             WHERE u.id = $1
             GROUP BY u.id, u.total_points, u.current_streak, u.longest_streak, gr.global_rank`,
            [userId]
        );

        const overallStats = overallStatsResult.rows[0];

        // Get daily performance trends
        const dailyTrendsResult = await query(
            `SELECT
                DATE(completion_date) as date,
                COUNT(*) as tasks_completed,
                SUM(points_earned) as points_earned,
                AVG(time_taken_seconds) as avg_time_taken
             FROM user_task_completions
             WHERE user_id = $1 AND completion_date >= NOW() - INTERVAL '${days} days' AND is_valid = true
             GROUP BY DATE(completion_date)
             ORDER BY DATE(completion_date) DESC`,
            [userId]
        );

        // Get category breakdown
        const categoryBreakdownResult = await query(
            `SELECT
                t.category,
                COUNT(utc.id) as tasks_completed,
                SUM(utc.points_earned) as total_points,
                AVG(utc.points_earned) as avg_points
             FROM user_task_completions utc
             JOIN tasks t ON utc.task_id = t.id
             WHERE utc.user_id = $1 AND utc.is_valid = true AND utc.completion_date >= NOW() - INTERVAL '${days} days'
             GROUP BY t.category
             ORDER BY total_points DESC`,
            [userId]
        );

        // Get difficulty breakdown
        const difficultyBreakdownResult = await query(
            `SELECT
                t.difficulty,
                COUNT(utc.id) as tasks_completed,
                SUM(utc.points_earned) as total_points,
                AVG(utc.time_taken_seconds) as avg_time_taken
             FROM user_task_completions utc
             JOIN tasks t ON utc.task_id = t.id
             WHERE utc.user_id = $1 AND utc.is_valid = true AND utc.completion_date >= NOW() - INTERVAL '${days} days'
             GROUP BY t.difficulty
             ORDER BY CASE t.difficulty
                 WHEN 'easy' THEN 1
                 WHEN 'medium' THEN 2
                 WHEN 'hard' THEN 3
                 WHEN 'expert' THEN 4
             END`,
            [userId]
        );

        // Get rank history
        const rankHistoryResult = await query(
            `SELECT
                DATE(created_at) as date,
                MIN(old_rank) as rank
             FROM rank_notifications
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC`,
            [userId]
        );

        // Get recent achievements/milestones
        const achievementsResult = await query(
            `SELECT
                CASE
                    WHEN points_after >= 1000 AND points_after - points_change < 1000 THEN '1000 Points Milestone'
                    WHEN points_after >= 5000 AND points_after - points_change < 5000 THEN '5000 Points Milestone'
                    WHEN points_after >= 10000 AND points_after - points_change < 10000 THEN '10000 Points Milestone'
                    ELSE NULL
                END as achievement,
                created_at
             FROM score_history
             WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
             AND (
                 (points_after >= 1000 AND points_after - points_change < 1000) OR
                 (points_after >= 5000 AND points_after - points_change < 5000) OR
                 (points_after >= 10000 AND points_after - points_change < 10000)
             )
             ORDER BY created_at DESC
             LIMIT 5`,
            [userId]
        );

        // Get comparison with similar users
        const comparisonResult = await query(
            `WITH user_rank AS (
                SELECT global_rank FROM global_rankings WHERE id = $1
             ),
             similar_users AS (
                 SELECT id, global_rank, total_points, current_streak
                 FROM global_rankings
                 WHERE global_rank BETWEEN (SELECT global_rank FROM user_rank) - 5
                     AND (SELECT global_rank FROM user_rank) + 5
                 AND id != $1
             )
             SELECT
                 AVG(total_points) as avg_points,
                 AVG(current_streak) as avg_streak,
                 COUNT(*) as user_count
             FROM similar_users`,
            [userId]
        );

        const comparison = comparisonResult.rows[0];

        res.json({
            success: true,
            data: {
                overallStats: {
                    totalPoints: parseInt(overallStats.total_points),
                    currentStreak: overallStats.current_streak,
                    longestStreak: overallStats.longest_streak,
                    globalRank: overallStats.global_rank,
                    totalTasksCompleted: parseInt(overallStats.total_tasks_completed),
                    uniqueTasksCompleted: parseInt(overallStats.unique_tasks_completed),
                    activeDays: parseInt(overallStats.active_days),
                    avgPointsPerTask: parseFloat(overallStats.avg_points_per_task).toFixed(2)
                },
                dailyTrends: dailyTrendsResult.rows.map(row => ({
                    date: row.date,
                    tasksCompleted: parseInt(row.tasks_completed),
                    pointsEarned: parseInt(row.points_earned),
                    avgTimeTaken: row.avg_time_taken ? parseFloat(row.avg_time_taken).toFixed(2) : null
                })),
                categoryBreakdown: categoryBreakdownResult.rows.map(row => ({
                    category: row.category,
                    tasksCompleted: parseInt(row.tasks_completed),
                    totalPoints: parseInt(row.total_points),
                    avgPoints: parseFloat(row.avg_points).toFixed(2)
                })),
                difficultyBreakdown: difficultyBreakdownResult.rows.map(row => ({
                    difficulty: row.difficulty,
                    tasksCompleted: parseInt(row.tasks_completed),
                    totalPoints: parseInt(row.total_points),
                    avgTimeTaken: row.avg_time_taken ? parseFloat(row.avg_time_taken).toFixed(2) : null
                })),
                rankHistory: rankHistoryResult.rows.map(row => ({
                    date: row.date,
                    rank: parseInt(row.rank)
                })),
                recentAchievements: achievementsResult.rows
                    .filter(row => row.achievement)
                    .map(row => ({
                        achievement: row.achievement,
                        date: row.created_at
                    })),
                comparison: {
                    avgPointsOfSimilarUsers: comparison.avg_points ? parseFloat(comparison.avg_points).toFixed(2) : null,
                    avgStreakOfSimilarUsers: comparison.avg_streak ? parseFloat(comparison.avg_streak).toFixed(2) : null,
                    similarUserCount: parseInt(comparison.user_count)
                },
                timeframe: `${days} days`
            }
        });
    } catch (error) {
        logger.error('Get analytics dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics dashboard'
        });
    }
});

/**
 * @route   GET /api/analytics/performance-trends
 * @desc    Get detailed performance trends over time
 * @access  Private
 */
router.get('/performance-trends', authenticate, validateDateRange, async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;

        const result = await query(
            `SELECT
                metric_date as date,
                tasks_completed,
                points_earned,
                average_time_per_task,
                accuracy_rate
             FROM performance_metrics
             WHERE user_id = $1 AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
             ORDER BY metric_date ASC`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                trends: result.rows.map(row => ({
                    date: row.date,
                    tasksCompleted: row.tasks_completed,
                    pointsEarned: row.points_earned,
                    avgTimePerTask: row.average_time_per_task ? parseFloat(row.average_time_per_task).toFixed(2) : null,
                    accuracyRate: row.accuracy_rate ? parseFloat(row.accuracy_rate).toFixed(2) : null
                })),
                timeframe: `${days} days`
            }
        });
    } catch (error) {
        logger.error('Get performance trends error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get performance trends'
        });
    }
});

/**
 * @route   GET /api/analytics/cheat-detection
 * @desc    Get cheat detection logs (for admin review)
 * @access  Private
 */
router.get('/cheat-detection', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's cheat detection logs
        const result = await query(
            `SELECT
                cdl.id,
                cdl.detection_type,
                cdl.severity,
                cdl.description,
                cdl.confidence_score,
                cdl.is_resolved,
                cdl.created_at,
                t.title as task_title
             FROM cheat_detection_logs cdl
             LEFT JOIN user_task_completions utc ON cdl.task_completion_id = utc.id
             LEFT JOIN tasks t ON utc.task_id = t.id
             WHERE cdl.user_id = $1
             ORDER BY cdl.created_at DESC
             LIMIT 50`,
            [userId]
        );

        // Get summary stats
        const summaryResult = await query(
            `SELECT
                COUNT(*) as total_flags,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
                COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
                COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count,
                COUNT(CASE WHEN is_resolved = false THEN 1 END) as unresolved_count
             FROM cheat_detection_logs
             WHERE user_id = $1`,
            [userId]
        );

        const summary = summaryResult.rows[0];

        res.json({
            success: true,
            data: {
                logs: result.rows.map(row => ({
                    id: row.id,
                    detectionType: row.detection_type,
                    severity: row.severity,
                    description: row.description,
                    confidenceScore: row.confidence_score,
                    isResolved: row.is_resolved,
                    taskTitle: row.task_title,
                    createdAt: row.created_at
                })),
                summary: {
                    totalFlags: parseInt(summary.total_flags),
                    criticalCount: parseInt(summary.critical_count),
                    highCount: parseInt(summary.high_count),
                    mediumCount: parseInt(summary.medium_count),
                    lowCount: parseInt(summary.low_count),
                    unresolvedCount: parseInt(summary.unresolved_count)
                }
            }
        });
    } catch (error) {
        logger.error('Get cheat detection logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cheat detection logs'
        });
    }
});

module.exports = router;
