const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validateCreateTask, validateTaskCompletion, validatePagination, validateUuidParam } = require('../middleware/validators');
const { detectCheating, CHEAT_TYPES } = require('../utils/cheatDetection');
const logger = require('../utils/logger');

/**
 * @route   GET /api/tasks
 * @desc    Get all active tasks with optional filtering
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { category, difficulty } = req.query;

        let queryText = `
            SELECT t.id, t.title, t.description, t.category, t.difficulty,
                   t.base_points, t.time_limit_minutes, t.created_at,
                   CASE WHEN utc.id IS NOT NULL THEN true ELSE false END as completed_by_user
            FROM tasks t
            LEFT JOIN user_task_completions utc ON t.id = utc.task_id AND utc.user_id = $1
            WHERE t.is_active = true
        `;
        const params = [req.user.id];
        let paramCount = 1;

        if (category) {
            paramCount++;
            queryText += ` AND t.category = $${paramCount}`;
            params.push(category);
        }

        if (difficulty) {
            paramCount++;
            queryText += ` AND t.difficulty = $${paramCount}`;
            params.push(difficulty);
        }

        queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        const countQuery = `
            SELECT COUNT(*) as total
            FROM tasks t
            WHERE t.is_active = true
            ${category ? `AND t.category = '${category}'` : ''}
            ${difficulty ? `AND t.difficulty = '${difficulty}'` : ''}
        `;
        const countResult = await query(countQuery);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                tasks: result.rows.map(row => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    category: row.category,
                    difficulty: row.difficulty,
                    basePoints: row.base_points,
                    timeLimitMinutes: row.time_limit_minutes,
                    createdAt: row.created_at,
                    completedByUser: row.completed_by_user
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
        logger.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tasks'
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task (Admin only)
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, validateCreateTask, async (req, res) => {
    try {
        const { title, description, category, difficulty, basePoints, timeLimitMinutes } = req.body;

        const result = await query(
            `INSERT INTO tasks (title, description, category, difficulty, base_points, time_limit_minutes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, description, category, difficulty, basePoints, timeLimitMinutes]
        );

        const task = result.rows[0];

        logger.info(`New task created: ${title} by admin ${req.user.username}`);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: {
                task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    category: task.category,
                    difficulty: task.difficulty,
                    basePoints: task.base_points,
                    timeLimitMinutes: task.time_limit_minutes
                }
            }
        });
    } catch (error) {
        logger.error('Create task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create task'
        });
    }
});

/**
 * @route   POST /api/tasks/:id/complete
 * @desc    Complete a task and award points (with cheat detection and concurrent handling)
 * @access  Private
 */
router.post('/:id/complete', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id;
        const { timeTaken } = req.body; // Time taken in seconds
        const completionDate = new Date();

        // Use transaction for concurrent score update handling
        const result = await transaction(async (client) => {
            // Lock the user row to prevent concurrent updates
            await client.query(
                'SELECT id FROM users WHERE id = $1 FOR UPDATE',
                [userId]
            );

            // Check if task exists and is active
            const taskResult = await client.query(
                'SELECT * FROM tasks WHERE id = $1 AND is_active = true',
                [taskId]
            );

            if (taskResult.rows.length === 0) {
                throw new Error('Task not found or inactive');
            }

            const task = taskResult.rows[0];

            // Check if user already completed this task today
            const existingCompletion = await client.query(
                `SELECT id FROM user_task_completions
                 WHERE user_id = $1 AND task_id = $2 AND DATE(completion_date) = CURRENT_DATE`,
                [userId, taskId]
            );

            if (existingCompletion.rows.length > 0) {
                throw new Error('Task already completed today');
            }

            // Calculate points (base points with potential bonuses)
            let pointsEarned = task.base_points;

            // Time bonus: if completed faster than time limit, award bonus
            if (task.time_limit_minutes && timeTaken) {
                const timeLimit = task.time_limit_minutes * 60; // Convert to seconds
                if (timeTaken < timeLimit * 0.5) {
                    // Completed in less than 50% of time limit
                    pointsEarned = Math.floor(pointsEarned * 1.5);
                } else if (timeTaken < timeLimit * 0.75) {
                    // Completed in less than 75% of time limit
                    pointsEarned = Math.floor(pointsEarned * 1.25);
                }
            }

            // Perform cheat detection
            const cheatDetectionResult = await detectCheating(client, userId, taskId, timeTaken, pointsEarned);

            // Insert task completion
            const completionResult = await client.query(
                `INSERT INTO user_task_completions (user_id, task_id, points_earned, time_taken_seconds, is_valid, flagged_for_review)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [userId, taskId, pointsEarned, timeTaken, !cheatDetectionResult.isSuspicious, cheatDetectionResult.isSuspicious]
            );

            const completion = completionResult.rows[0];

            // Log cheat detection if suspicious
            if (cheatDetectionResult.isSuspicious) {
                await client.query(
                    `INSERT INTO cheat_detection_logs (user_id, task_completion_id, detection_type, severity, description, confidence_score)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [userId, completion.id, cheatDetectionResult.type, cheatDetectionResult.severity, cheatDetectionResult.description, cheatDetectionResult.confidence]
                );

                logger.warn(`Suspicious activity detected: User ${userId}, Task ${taskId}, Type: ${cheatDetectionResult.type}`);
            }

            // Update streak (only if not suspicious)
            if (!cheatDetectionResult.isSuspicious) {
                await client.query(
                    'SELECT update_user_streak($1, $2)',
                    [userId, completionDate.toISOString().split('T')[0]]
                );

                // Update performance metrics
                await client.query(
                    `INSERT INTO performance_metrics (user_id, metric_date, tasks_completed, points_earned, average_time_per_task)
                     VALUES ($1, CURRENT_DATE, 1, $2, $3)
                     ON CONFLICT (user_id, metric_date)
                     DO UPDATE SET
                         tasks_completed = performance_metrics.tasks_completed + 1,
                         points_earned = performance_metrics.points_earned + $2,
                         average_time_per_task = (performance_metrics.average_time_per_task * performance_metrics.tasks_completed + $3) / (performance_metrics.tasks_completed + 1)`,
                    [userId, pointsEarned, timeTaken || 0]
                );
            }

            return {
                completion,
                task,
                pointsEarned,
                cheatDetectionResult
            };
        });

        // Get updated user stats
        const userStatsResult = await query(
            `SELECT total_points, current_streak, gr.global_rank
             FROM users u
             LEFT JOIN global_rankings gr ON u.id = gr.id
             WHERE u.id = $1`,
            [userId]
        );

        const userStats = userStatsResult.rows[0];

        res.status(201).json({
            success: true,
            message: result.cheatDetectionResult.isSuspicious
                ? 'Task completed but flagged for review'
                : 'Task completed successfully',
            data: {
                completion: {
                    id: result.completion.id,
                    taskId: taskId,
                    taskTitle: result.task.title,
                    pointsEarned: result.pointsEarned,
                    timeTaken: timeTaken,
                    completionDate: result.completion.completion_date,
                    flaggedForReview: result.cheatDetectionResult.isSuspicious
                },
                userStats: {
                    totalPoints: userStats.total_points,
                    currentStreak: userStats.current_streak,
                    globalRank: userStats.global_rank
                }
            }
        });
    } catch (error) {
        logger.error('Complete task error:', error);

        if (error.message === 'Task not found or inactive') {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        if (error.message === 'Task already completed today') {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to complete task'
        });
    }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task details
 * @access  Private
 */
router.get('/:id', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT t.*,
                    CASE WHEN utc.id IS NOT NULL THEN true ELSE false END as completed_by_user,
                    utc.completion_date, utc.points_earned, utc.time_taken_seconds
             FROM tasks t
             LEFT JOIN user_task_completions utc ON t.id = utc.task_id AND utc.user_id = $1
             WHERE t.id = $2`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        const task = result.rows[0];

        res.json({
            success: true,
            data: {
                task: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    category: task.category,
                    difficulty: task.difficulty,
                    basePoints: task.base_points,
                    timeLimitMinutes: task.time_limit_minutes,
                    isActive: task.is_active,
                    createdAt: task.created_at,
                    completedByUser: task.completed_by_user,
                    ...(task.completed_by_user && {
                        completion: {
                            completionDate: task.completion_date,
                            pointsEarned: task.points_earned,
                            timeTaken: task.time_taken_seconds
                        }
                    })
                }
            }
        });
    } catch (error) {
        logger.error('Get task error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get task'
        });
    }
});

module.exports = router;
