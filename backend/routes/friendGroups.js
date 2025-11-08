const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validateCreateGroup, validateUuidParam, validatePagination } = require('../middleware/validators');
const logger = require('../utils/logger');

/**
 * Generate a random invite code
 */
function generateInviteCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * @route   POST /api/groups
 * @desc    Create a new friend group
 * @access  Private
 */
router.post('/', authenticate, validateCreateGroup, async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const userId = req.user.id;
        const inviteCode = generateInviteCode();

        const result = await transaction(async (client) => {
            // Create group
            const groupResult = await client.query(
                `INSERT INTO friend_groups (name, description, created_by, is_public, invite_code)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [name, description, userId, isPublic || false, inviteCode]
            );

            const group = groupResult.rows[0];

            // Add creator as owner
            await client.query(
                `INSERT INTO group_memberships (group_id, user_id, role)
                 VALUES ($1, $2, 'owner')`,
                [group.id, userId]
            );

            return group;
        });

        logger.info(`New friend group created: ${name} by user ${req.user.username}`);

        res.status(201).json({
            success: true,
            message: 'Friend group created successfully',
            data: {
                group: {
                    id: result.id,
                    name: result.name,
                    description: result.description,
                    isPublic: result.is_public,
                    inviteCode: result.invite_code,
                    createdBy: result.created_by,
                    createdAt: result.created_at
                }
            }
        });
    } catch (error) {
        logger.error('Create group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create friend group'
        });
    }
});

/**
 * @route   GET /api/groups
 * @desc    Get user's friend groups
 * @access  Private
 */
router.get('/', authenticate, validatePagination, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await query(
            `SELECT fg.id, fg.name, fg.description, fg.is_public, fg.created_by, fg.created_at,
                    gm.role, gm.joined_at,
                    COUNT(DISTINCT gm2.user_id) as member_count,
                    u.username as creator_username
             FROM friend_groups fg
             JOIN group_memberships gm ON fg.id = gm.group_id
             LEFT JOIN group_memberships gm2 ON fg.id = gm2.group_id
             LEFT JOIN users u ON fg.created_by = u.id
             WHERE gm.user_id = $1
             GROUP BY fg.id, fg.name, fg.description, fg.is_public, fg.created_by, fg.created_at,
                      gm.role, gm.joined_at, u.username
             ORDER BY gm.joined_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await query(
            `SELECT COUNT(DISTINCT fg.id) as total
             FROM friend_groups fg
             JOIN group_memberships gm ON fg.id = gm.group_id
             WHERE gm.user_id = $1`,
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                groups: result.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    isPublic: row.is_public,
                    createdBy: row.created_by,
                    creatorUsername: row.creator_username,
                    memberCount: parseInt(row.member_count),
                    userRole: row.role,
                    joinedAt: row.joined_at,
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
        logger.error('Get groups error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get friend groups'
        });
    }
});

/**
 * @route   GET /api/groups/:id
 * @desc    Get friend group details
 * @access  Private
 */
router.get('/:id', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get group details
        const groupResult = await query(
            `SELECT fg.*, u.username as creator_username, gm.role as user_role
             FROM friend_groups fg
             LEFT JOIN users u ON fg.created_by = u.id
             LEFT JOIN group_memberships gm ON fg.id = gm.group_id AND gm.user_id = $1
             WHERE fg.id = $2`,
            [userId, id]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friend group not found'
            });
        }

        const group = groupResult.rows[0];

        // Check if user is member or group is public
        if (!group.user_role && !group.is_public) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Get members
        const membersResult = await query(
            `SELECT u.id, u.username, u.display_name, u.avatar_url, u.total_points,
                    gm.role, gm.joined_at
             FROM group_memberships gm
             JOIN users u ON gm.user_id = u.id
             WHERE gm.group_id = $1
             ORDER BY gm.joined_at ASC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                group: {
                    id: group.id,
                    name: group.name,
                    description: group.description,
                    isPublic: group.is_public,
                    inviteCode: group.user_role ? group.invite_code : null, // Only show to members
                    createdBy: group.created_by,
                    creatorUsername: group.creator_username,
                    createdAt: group.created_at,
                    userRole: group.user_role,
                    isMember: !!group.user_role
                },
                members: membersResult.rows.map(row => ({
                    id: row.id,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                    totalPoints: row.total_points,
                    role: row.role,
                    joinedAt: row.joined_at
                }))
            }
        });
    } catch (error) {
        logger.error('Get group details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get group details'
        });
    }
});

/**
 * @route   POST /api/groups/join
 * @desc    Join a friend group using invite code
 * @access  Private
 */
router.post('/join', authenticate, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.user.id;

        if (!inviteCode) {
            return res.status(400).json({
                success: false,
                error: 'Invite code is required'
            });
        }

        // Find group by invite code
        const groupResult = await query(
            'SELECT id, name FROM friend_groups WHERE invite_code = $1',
            [inviteCode.toUpperCase()]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid invite code'
            });
        }

        const group = groupResult.rows[0];

        // Check if already a member
        const membershipCheck = await query(
            'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [group.id, userId]
        );

        if (membershipCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You are already a member of this group'
            });
        }

        // Add user to group
        await query(
            `INSERT INTO group_memberships (group_id, user_id, role)
             VALUES ($1, $2, 'member')`,
            [group.id, userId]
        );

        logger.info(`User ${req.user.username} joined group ${group.name}`);

        res.json({
            success: true,
            message: 'Successfully joined friend group',
            data: {
                groupId: group.id,
                groupName: group.name
            }
        });
    } catch (error) {
        logger.error('Join group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join friend group'
        });
    }
});

/**
 * @route   DELETE /api/groups/:id/leave
 * @desc    Leave a friend group
 * @access  Private
 */
router.delete('/:id/leave', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is owner
        const membershipResult = await query(
            'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (membershipResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'You are not a member of this group'
            });
        }

        if (membershipResult.rows[0].role === 'owner') {
            return res.status(400).json({
                success: false,
                error: 'Owners cannot leave the group. Please transfer ownership or delete the group.'
            });
        }

        // Remove membership
        await query(
            'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [id, userId]
        );

        logger.info(`User ${req.user.username} left group ${id}`);

        res.json({
            success: true,
            message: 'Successfully left friend group'
        });
    } catch (error) {
        logger.error('Leave group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to leave friend group'
        });
    }
});

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete a friend group (owner only)
 * @access  Private
 */
router.delete('/:id', authenticate, validateUuidParam('id'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if user is owner
        const membershipResult = await query(
            'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (membershipResult.rows.length === 0 || membershipResult.rows[0].role !== 'owner') {
            return res.status(403).json({
                success: false,
                error: 'Only the group owner can delete the group'
            });
        }

        // Delete group (cascades to memberships)
        await query('DELETE FROM friend_groups WHERE id = $1', [id]);

        logger.info(`Group ${id} deleted by user ${req.user.username}`);

        res.json({
            success: true,
            message: 'Friend group deleted successfully'
        });
    } catch (error) {
        logger.error('Delete group error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete friend group'
        });
    }
});

module.exports = router;
