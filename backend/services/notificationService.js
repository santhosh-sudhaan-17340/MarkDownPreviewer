const { Notification, User } = require('../models');
const emailService = require('./emailService');
const { Op } = require('sequelize');

class NotificationService {

  // Create in-app notification
  static async createNotification({ userId, ticketId, type, title, message }) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        ticket_id: ticketId,
        type,
        title,
        message
      });

      // Emit real-time notification via WebSocket (if connected)
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification', notification);
      }

      // Check if user wants email notifications
      const user = await User.findByPk(userId);
      if (user && user.email) {
        await emailService.sendNotificationEmail(user.email, title, message, ticketId);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Bulk create notifications
  static async createBulkNotifications(notifications) {
    try {
      const created = await Notification.bulkCreate(notifications);

      // Emit to all affected users
      if (global.io) {
        notifications.forEach(notif => {
          global.io.to(`user_${notif.user_id}`).emit('notification', notif);
        });
      }

      return created;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, { limit = 20, offset = 0, unreadOnly = false }) {
    const where = { user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }

    return await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: ['Ticket']
    });
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (notification) {
      await notification.update({
        is_read: true,
        read_at: new Date()
      });
    }

    return notification;
  }

  // Mark all as read for user
  static async markAllAsRead(userId) {
    return await Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } }
    );
  }

  // Delete old read notifications
  static async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await Notification.destroy({
      where: {
        is_read: true,
        read_at: {
          [Op.lt]: cutoffDate
        }
      }
    });
  }

  // Get unread count
  static async getUnreadCount(userId) {
    return await Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  }

  // Notify on ticket assignment
  static async notifyTicketAssigned(ticket, agent) {
    return await this.createNotification({
      userId: agent.id,
      ticketId: ticket.id,
      type: 'assignment',
      title: 'New Ticket Assigned',
      message: `Ticket #${ticket.ticket_number} has been assigned to you: ${ticket.subject}`
    });
  }

  // Notify on ticket escalation
  static async notifyTicketEscalated(ticket, users) {
    const notifications = users.map(user => ({
      user_id: user.id,
      ticket_id: ticket.id,
      type: 'escalation',
      title: 'Ticket Escalated',
      message: `Ticket #${ticket.ticket_number} has been escalated: ${ticket.subject}`
    }));

    return await this.createBulkNotifications(notifications);
  }

  // Notify on SLA breach
  static async notifySLABreach(ticket, users) {
    const notifications = users.map(user => ({
      user_id: user.id,
      ticket_id: ticket.id,
      type: 'sla_breach',
      title: 'SLA Breach Alert',
      message: `URGENT: Ticket #${ticket.ticket_number} has breached SLA`
    }));

    return await this.createBulkNotifications(notifications);
  }

  // Notify on new comment
  static async notifyNewComment(ticket, comment, excludeUserId) {
    const watchers = await ticket.getWatchers();
    const notifications = watchers
      .filter(user => user.id !== excludeUserId)
      .map(user => ({
        user_id: user.id,
        ticket_id: ticket.id,
        type: 'comment',
        title: 'New Comment',
        message: `New comment on ticket #${ticket.ticket_number}`
      }));

    return await this.createBulkNotifications(notifications);
  }

  // Notify on status change
  static async notifyStatusChange(ticket, oldStatus, newStatus) {
    const watchers = await ticket.getWatchers();
    const notifications = watchers.map(user => ({
      user_id: user.id,
      ticket_id: ticket.id,
      type: 'status_change',
      title: 'Ticket Status Updated',
      message: `Ticket #${ticket.ticket_number} status changed from ${oldStatus} to ${newStatus}`
    }));

    return await this.createBulkNotifications(notifications);
  }
}

module.exports = NotificationService;
