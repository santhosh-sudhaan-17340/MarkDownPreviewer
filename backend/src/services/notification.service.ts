import { db } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  static async createNotification(notificationData: NotificationData) {
    try {
      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          notificationData.userId,
          notificationData.type,
          notificationData.title,
          notificationData.message,
          notificationData.data ? JSON.stringify(notificationData.data) : null,
        ]
      );

      const notification = result.rows[0];

      logger.info('Notification created', {
        notificationId: notification.id,
        userId: notificationData.userId,
        type: notificationData.type,
      });

      // Emit real-time notification via Socket.IO (will be handled by the route)
      return notification;
    } catch (error) {
      logger.error('Error creating notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notificationData.userId,
      });
      throw error;
    }
  }

  static async getUserNotifications(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const result = await db.query(
        `SELECT *
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching user notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async getUnreadNotifications(userId: string) {
    try {
      const result = await db.query(
        `SELECT *
         FROM notifications
         WHERE user_id = $1 AND is_read = false
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching unread notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      const result = await db.query(
        `UPDATE notifications
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Notification not found', 404);
      }

      logger.info('Notification marked as read', { notificationId, userId });

      return result.rows[0];
    } catch (error) {
      logger.error('Error marking notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      const result = await db.query(
        `UPDATE notifications
         SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false
         RETURNING id`,
        [userId]
      );

      logger.info('All notifications marked as read', { userId, count: result.rowCount });

      return { count: result.rowCount };
    } catch (error) {
      logger.error('Error marking all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  static async deleteNotification(notificationId: string, userId: string) {
    try {
      const result = await db.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Notification not found', 404);
      }

      logger.info('Notification deleted', { notificationId, userId });

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      logger.error('Error deleting notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId,
      });
      throw error;
    }
  }

  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const result = await db.query(
        `DELETE FROM notifications
         WHERE created_at < NOW() - INTERVAL '${daysOld} days'
           AND is_read = true
         RETURNING id`,
      );

      logger.info('Old notifications cleaned up', { count: result.rowCount, daysOld });

      return { count: result.rowCount };
    } catch (error) {
      logger.error('Error cleaning up old notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  static async getNotificationStats(userId: string) {
    try {
      const result = await db.query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read,
          COUNT(CASE WHEN type = 'rank_change' THEN 1 END) as rank_changes,
          COUNT(CASE WHEN type = 'achievement' THEN 1 END) as achievements,
          COUNT(CASE WHEN type = 'streak_broken' THEN 1 END) as streak_broken
         FROM notifications
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching notification stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  // Batch notification creation for system-wide announcements
  static async createBulkNotifications(userIds: string[], notificationData: Omit<NotificationData, 'userId'>) {
    try {
      const values = userIds.map((userId, index) => {
        const offset = index * 4;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      }).join(',');

      const params = userIds.flatMap(userId => [
        userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
      ]);

      const result = await db.query(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES ${values}
         RETURNING id`,
        params
      );

      logger.info('Bulk notifications created', {
        count: result.rowCount,
        type: notificationData.type,
      });

      return { count: result.rowCount };
    } catch (error) {
      logger.error('Error creating bulk notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
