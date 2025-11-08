const logger = require('./logger');

// Cheat detection types
const CHEAT_TYPES = {
    RAPID_COMPLETION: 'rapid_completion',
    IMPOSSIBLE_TIME: 'impossible_time',
    EXCESSIVE_RATE: 'excessive_rate',
    PATTERN_ANOMALY: 'pattern_anomaly',
    POINT_FARMING: 'point_farming'
};

// Severity levels
const SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Detect potential cheating based on various rules
 * @param {Object} client - Database client (for transaction)
 * @param {String} userId - User ID
 * @param {String} taskId - Task ID
 * @param {Number} timeTaken - Time taken to complete task (in seconds)
 * @param {Number} pointsEarned - Points earned
 * @returns {Object} Detection result with isSuspicious flag
 */
async function detectCheating(client, userId, taskId, timeTaken, pointsEarned) {
    const detectionResult = {
        isSuspicious: false,
        type: null,
        severity: null,
        description: '',
        confidence: 0
    };

    // Skip if cheat detection is disabled
    if (process.env.CHEAT_DETECTION_ENABLED !== 'true') {
        return detectionResult;
    }

    try {
        // Rule 1: Check for impossible completion time
        if (timeTaken) {
            const minTime = parseInt(process.env.MIN_TASK_TIME_SECONDS) || 10;
            const maxTime = parseInt(process.env.MAX_TASK_TIME_SECONDS) || 3600;

            if (timeTaken < minTime) {
                detectionResult.isSuspicious = true;
                detectionResult.type = CHEAT_TYPES.IMPOSSIBLE_TIME;
                detectionResult.severity = SEVERITY.HIGH;
                detectionResult.description = `Task completed in ${timeTaken}s, which is below minimum time of ${minTime}s`;
                detectionResult.confidence = 0.95;
                return detectionResult;
            }

            if (timeTaken > maxTime) {
                // Not really cheating, but suspicious
                detectionResult.isSuspicious = true;
                detectionResult.type = CHEAT_TYPES.PATTERN_ANOMALY;
                detectionResult.severity = SEVERITY.LOW;
                detectionResult.description = `Task completed in ${timeTaken}s, which exceeds maximum time of ${maxTime}s`;
                detectionResult.confidence = 0.5;
                return detectionResult;
            }
        }

        // Rule 2: Check for excessive completion rate (too many tasks in short time)
        const maxTasksPerHour = parseInt(process.env.MAX_TASKS_PER_HOUR) || 50;
        const recentCompletionsResult = await client.query(
            `SELECT COUNT(*) as count
             FROM user_task_completions
             WHERE user_id = $1 AND completion_date >= NOW() - INTERVAL '1 hour'`,
            [userId]
        );

        const recentCompletions = parseInt(recentCompletionsResult.rows[0].count);

        if (recentCompletions >= maxTasksPerHour) {
            detectionResult.isSuspicious = true;
            detectionResult.type = CHEAT_TYPES.EXCESSIVE_RATE;
            detectionResult.severity = SEVERITY.CRITICAL;
            detectionResult.description = `User completed ${recentCompletions} tasks in the last hour, exceeding limit of ${maxTasksPerHour}`;
            detectionResult.confidence = 0.9;
            return detectionResult;
        }

        // Rule 3: Check for rapid succession (multiple tasks in very short time)
        const lastCompletionResult = await client.query(
            `SELECT completion_date
             FROM user_task_completions
             WHERE user_id = $1
             ORDER BY completion_date DESC
             LIMIT 1`,
            [userId]
        );

        if (lastCompletionResult.rows.length > 0) {
            const lastCompletion = new Date(lastCompletionResult.rows[0].completion_date);
            const now = new Date();
            const secondsSinceLastCompletion = (now - lastCompletion) / 1000;

            // If completing tasks within 5 seconds of each other
            if (secondsSinceLastCompletion < 5) {
                detectionResult.isSuspicious = true;
                detectionResult.type = CHEAT_TYPES.RAPID_COMPLETION;
                detectionResult.severity = SEVERITY.HIGH;
                detectionResult.description = `Task completed ${secondsSinceLastCompletion.toFixed(1)}s after previous task`;
                detectionResult.confidence = 0.85;
                return detectionResult;
            }
        }

        // Rule 4: Check for point farming (same easy tasks repeatedly)
        const taskDifficultyResult = await client.query(
            'SELECT difficulty FROM tasks WHERE id = $1',
            [taskId]
        );

        if (taskDifficultyResult.rows.length > 0 && taskDifficultyResult.rows[0].difficulty === 'easy') {
            const easyTaskCountResult = await client.query(
                `SELECT COUNT(*) as count
                 FROM user_task_completions utc
                 JOIN tasks t ON utc.task_id = t.id
                 WHERE utc.user_id = $1 AND t.difficulty = 'easy'
                 AND utc.completion_date >= NOW() - INTERVAL '1 day'`,
                [userId]
            );

            const easyTaskCount = parseInt(easyTaskCountResult.rows[0].count);

            // If user completed more than 30 easy tasks in a day
            if (easyTaskCount >= 30) {
                detectionResult.isSuspicious = true;
                detectionResult.type = CHEAT_TYPES.POINT_FARMING;
                detectionResult.severity = SEVERITY.MEDIUM;
                detectionResult.description = `User completed ${easyTaskCount} easy tasks in the last 24 hours`;
                detectionResult.confidence = 0.7;
                return detectionResult;
            }
        }

        // Rule 5: Check for statistical anomalies in completion time vs average
        if (timeTaken) {
            const avgTimeResult = await client.query(
                `SELECT AVG(time_taken_seconds) as avg_time, STDDEV(time_taken_seconds) as stddev
                 FROM user_task_completions
                 WHERE task_id = $1 AND time_taken_seconds IS NOT NULL AND is_valid = true`,
                [taskId]
            );

            if (avgTimeResult.rows[0].avg_time && avgTimeResult.rows[0].stddev) {
                const avgTime = parseFloat(avgTimeResult.rows[0].avg_time);
                const stddev = parseFloat(avgTimeResult.rows[0].stddev);

                // If completion time is more than 3 standard deviations below average
                if (timeTaken < avgTime - (3 * stddev)) {
                    detectionResult.isSuspicious = true;
                    detectionResult.type = CHEAT_TYPES.PATTERN_ANOMALY;
                    detectionResult.severity = SEVERITY.MEDIUM;
                    detectionResult.description = `Completion time (${timeTaken}s) is significantly faster than average (${avgTime.toFixed(1)}s ± ${stddev.toFixed(1)}s)`;
                    detectionResult.confidence = 0.75;
                    return detectionResult;
                }
            }
        }

        // No suspicious activity detected
        return detectionResult;

    } catch (error) {
        logger.error('Cheat detection error:', error);
        // Return non-suspicious result on error to not block legitimate users
        return detectionResult;
    }
}

/**
 * Get cheat detection statistics for a user
 */
async function getUserCheatStats(client, userId) {
    try {
        const result = await client.query(
            `SELECT
                COUNT(*) as total_flags,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_flags,
                COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_flags,
                COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_flags,
                COUNT(CASE WHEN is_resolved = false THEN 1 END) as unresolved_flags
             FROM cheat_detection_logs
             WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    } catch (error) {
        logger.error('Get cheat stats error:', error);
        return null;
    }
}

module.exports = {
    detectCheating,
    getUserCheatStats,
    CHEAT_TYPES,
    SEVERITY
};
