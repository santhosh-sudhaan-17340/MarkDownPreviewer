import { Router } from 'express';
import Joi from 'joi';
import { db } from '../config/database';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { validate, validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schemas
const createGroupSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().default(false),
});

const updateGroupSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional(),
});

// Get all public groups
router.get(
  '/public',
  validateQuery(Joi.object({
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
  })),
  asyncHandler(async (req, res) => {
    const { limit, offset } = req.query as any;

    const result = await db.query(
      `SELECT
        g.*,
        u.username as creator_username,
        COUNT(DISTINCT gm.user_id) as member_count
       FROM friend_groups g
       INNER JOIN users u ON u.id = g.created_by
       LEFT JOIN group_memberships gm ON gm.group_id = g.id
       WHERE g.is_public = true
       GROUP BY g.id, u.username
       ORDER BY member_count DESC, g.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: { groups: result.rows, count: result.rows.length },
    });
  })
);

// Get user's groups
router.get(
  '/my-groups',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await db.query(
      `SELECT
        g.*,
        gm.role,
        gm.joined_at,
        u.username as creator_username,
        COUNT(DISTINCT gm2.user_id) as member_count
       FROM friend_groups g
       INNER JOIN group_memberships gm ON gm.group_id = g.id
       INNER JOIN users u ON u.id = g.created_by
       LEFT JOIN group_memberships gm2 ON gm2.group_id = g.id
       WHERE gm.user_id = $1
       GROUP BY g.id, gm.role, gm.joined_at, u.username
       ORDER BY gm.joined_at DESC`,
      [req.user!.id]
    );

    res.json({
      success: true,
      data: { groups: result.rows, count: result.rows.length },
    });
  })
);

// Get group details
router.get(
  '/:groupId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
        g.*,
        u.username as creator_username,
        COUNT(DISTINCT gm.user_id) as member_count
       FROM friend_groups g
       INNER JOIN users u ON u.id = g.created_by
       LEFT JOIN group_memberships gm ON gm.group_id = g.id
       WHERE g.id = $1
       GROUP BY g.id, u.username`,
      [req.params.groupId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Group not found', 404);
    }

    res.json({
      success: true,
      data: { group: result.rows[0] },
    });
  })
);

// Get group members
router.get(
  '/:groupId/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await db.query(
      `SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.total_points,
        gm.role,
        gm.joined_at
       FROM group_memberships gm
       INNER JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY
         CASE gm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'member' THEN 3
         END,
         gm.joined_at ASC`,
      [req.params.groupId]
    );

    res.json({
      success: true,
      data: { members: result.rows, count: result.rows.length },
    });
  })
);

// Create group
router.post(
  '/',
  authenticate,
  validate(createGroupSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, description, isPublic } = req.body;

    const result = await db.transaction(async (client) => {
      // Create group
      const groupResult = await client.query(
        `INSERT INTO friend_groups (name, description, is_public, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, description, isPublic, req.user!.id]
      );

      const group = groupResult.rows[0];

      // Add creator as owner
      await client.query(
        `INSERT INTO group_memberships (group_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [group.id, req.user!.id]
      );

      return group;
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: result },
    });
  })
);

// Update group
router.patch(
  '/:groupId',
  authenticate,
  validate(updateGroupSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    // Check if user is owner or admin
    const membershipResult = await db.query(
      `SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
      [req.params.groupId, req.user!.id]
    );

    if (membershipResult.rows.length === 0) {
      throw new AppError('You are not a member of this group', 403);
    }

    const role = membershipResult.rows[0].role;
    if (role !== 'owner' && role !== 'admin') {
      throw new AppError('Only group owners and admins can update the group', 403);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.body.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(req.body.name);
    }

    if (req.body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(req.body.description);
    }

    if (req.body.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(req.body.isPublic);
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updates.push('updated_at = NOW()');
    values.push(req.params.groupId);

    const result = await db.query(
      `UPDATE friend_groups SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: { group: result.rows[0] },
    });
  })
);

// Join group
router.post(
  '/:groupId/join',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    // Check if group exists and is public
    const groupResult = await db.query(
      'SELECT is_public FROM friend_groups WHERE id = $1',
      [req.params.groupId]
    );

    if (groupResult.rows.length === 0) {
      throw new AppError('Group not found', 404);
    }

    if (!groupResult.rows[0].is_public) {
      throw new AppError('This is a private group. You need an invitation to join.', 403);
    }

    // Check if already a member
    const membershipResult = await db.query(
      'SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [req.params.groupId, req.user!.id]
    );

    if (membershipResult.rows.length > 0) {
      throw new AppError('You are already a member of this group', 409);
    }

    // Add membership
    await db.query(
      `INSERT INTO group_memberships (group_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [req.params.groupId, req.user!.id]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully joined the group',
    });
  })
);

// Leave group
router.post(
  '/:groupId/leave',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    // Check membership
    const membershipResult = await db.query(
      'SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [req.params.groupId, req.user!.id]
    );

    if (membershipResult.rows.length === 0) {
      throw new AppError('You are not a member of this group', 404);
    }

    if (membershipResult.rows[0].role === 'owner') {
      throw new AppError('Group owner cannot leave. Transfer ownership or delete the group.', 403);
    }

    // Remove membership
    await db.query(
      'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2',
      [req.params.groupId, req.user!.id]
    );

    res.json({
      success: true,
      message: 'Successfully left the group',
    });
  })
);

// Delete group
router.delete(
  '/:groupId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    // Check if user is owner
    const membershipResult = await db.query(
      `SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
      [req.params.groupId, req.user!.id]
    );

    if (membershipResult.rows.length === 0 || membershipResult.rows[0].role !== 'owner') {
      throw new AppError('Only group owner can delete the group', 403);
    }

    // Delete group (cascade will handle memberships)
    await db.query('DELETE FROM friend_groups WHERE id = $1', [req.params.groupId]);

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  })
);

export default router;
