const express = require('express');
const router = express.Router();
const { query, refreshRankings } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateUuidParam } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const unreadOnly = req.query.unreadOnly === 'true';

        let queryText = `
            SELECT
                rn.id,
                rn.notification_type,
                rn.title,
                rn.message,
                rn.old_rank,
                rn.new_rank,
                rn.rank_change,
                rn.is_read,
                rn.created_at,
                fg.name as group_name
            FROM rank_notifications rn
            LEFT JOIN friend_groups fg ON rn.group_id = fg.id
            WHERE rn.user_id = $1
        `;

        const params = [userId];

        if (unreadOnly) {
            queryText += ' AND rn.is_read = false';
        }

        queryText += ' ORDER BY rn.created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM rank_notifications
            WHERE user_id = $1 ${unreadOnly ? 'AND is_read = false' : ''}
        `;
        const countResult = await query(countQuery, [userId]);
        const total = parseInt(countResult.rows[0].total);

        // Get unread count
        const unreadResult = await query(
            'SELECT COUNT(*) as unread FROM rank_notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        const unreadCount = parseInt(unreadResult.rows[0].unread);

        res.json({
            success: true,
            data: {
                notifications: result.rows.map(row => ({
                    id: row.id,
                    type: row.notification_type,
                    title: row.title,
                    message: row.message,
                    oldRank: row.old_rank,
                    newRank: row.new_rank,
                    rankChange: row.rank_change,
                    groupName: row.group_name,
                    isRead: row.is_read,
                    createdAt: row.created_at
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            }
        });
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notifications'
        });
    }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Update notification
        const result = await query(
            `UPDATE rank_notifications
             SET is_read = true
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        logger.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        await query(
            'UPDATE rank_notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [userId]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        logger.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            'DELETE FROM rank_notifications WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        logger.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
});

/**
 * @route   POST /api/notifications/check-rank-changes
 * @desc    Manually trigger rank change check (useful after completing tasks)
 * @access  Private
 */
router.post('/check-rank-changes', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Refresh rankings first
        await refreshRankings();

        // Check for rank changes
        await query('SELECT check_rank_change($1)', [userId]);

        // Get any new notifications
        const notificationResult = await query(
            `SELECT *
             FROM rank_notifications
             WHERE user_id = $1 AND is_read = false
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        const hasNewNotification = notificationResult.rows.length > 0;

        res.json({
            success: true,
            data: {
                hasNewNotification,
                notification: hasNewNotification ? {
                    id: notificationResult.rows[0].id,
                    type: notificationResult.rows[0].notification_type,
                    title: notificationResult.rows[0].title,
                    message: notificationResult.rows[0].message,
                    oldRank: notificationResult.rows[0].old_rank,
                    newRank: notificationResult.rows[0].new_rank,
                    rankChange: notificationResult.rows[0].rank_change,
                    createdAt: notificationResult.rows[0].created_at
                } : null
            }
        });
    } catch (error) {
        logger.error('Check rank changes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check rank changes'
        });
    }
});

module.exports = router;
