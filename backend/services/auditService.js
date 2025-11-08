const { AuditLog } = require('../models');

class AuditService {

  // Log an action
  static async log({
    ticketId = null,
    userId = null,
    action,
    entityType,
    entityId = null,
    oldValue = null,
    newValue = null,
    ipAddress = null,
    userAgent = null
  }) {
    try {
      await AuditLog.create({
        ticket_id: ticketId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  // Get audit logs for a ticket
  static async getTicketAuditLogs(ticketId, limit = 100) {
    return await AuditLog.findAll({
      where: { ticket_id: ticketId },
      limit,
      order: [['created_at', 'DESC']],
      include: ['User']
    });
  }

  // Get audit logs for a user
  static async getUserAuditLogs(userId, limit = 100) {
    return await AuditLog.findAll({
      where: { user_id: userId },
      limit,
      order: [['created_at', 'DESC']]
    });
  }

  // Get all audit logs with filters
  static async getAuditLogs({
    ticketId = null,
    userId = null,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  }) {
    const where = {};

    if (ticketId) where.ticket_id = ticketId;
    if (userId) where.user_id = userId;
    if (action) where.action = action;
    if (entityType) where.entity_type = entityType;

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.created_at = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.created_at = {
        [Op.lte]: endDate
      };
    }

    return await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: ['User']
    });
  }
}

module.exports = AuditService;
