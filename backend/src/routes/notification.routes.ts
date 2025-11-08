import { Router } from 'express';
import Joi from 'joi';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../middleware/errorHandler';
import { validateQuery } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user notifications
router.get(
  '/',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
  })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { limit, offset } = req.query as any;
    const notifications = await NotificationService.getUserNotifications(
      req.user!.id,
      limit,
      offset
    );

    res.json({
      success: true,
      data: { notifications, count: notifications.length },
    });
  })
);

// Get unread notifications
router.get(
  '/unread',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const notifications = await NotificationService.getUnreadNotifications(req.user!.id);

    res.json({
      success: true,
      data: { notifications, count: notifications.length },
    });
  })
);

// Get notification stats
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const stats = await NotificationService.getNotificationStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Mark notification as read
router.patch(
  '/:notificationId/read',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const notification = await NotificationService.markAsRead(
      req.params.notificationId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    });
  })
);

// Mark all as read
router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await NotificationService.markAllAsRead(req.user!.id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  })
);

// Delete notification
router.delete(
  '/:notificationId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await NotificationService.deleteNotification(
      req.params.notificationId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Notification deleted',
      data: result,
    });
  })
);

export default router;
