const AuditService = require('../services/auditService');

// Middleware to log API requests
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json;

    // Override json function to capture response
    res.json = function(data) {
      // Log the action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        AuditService.log({
          ticketId: req.params.ticketId || req.body.ticketId || null,
          userId: req.userId || null,
          action,
          entityType,
          entityId: req.params.id || data?.id || null,
          oldValue: req.oldValue || null,
          newValue: data || null,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        }).catch(err => console.error('Audit logging error:', err));
      }

      // Call original json function
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = auditMiddleware;
