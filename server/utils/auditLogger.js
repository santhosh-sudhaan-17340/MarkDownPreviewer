/**
 * Audit logging utilities for tracking system actions
 */

/**
 * Create an audit log entry
 * @param {object} client - Database client (for transaction support)
 * @param {object} logData - Audit log data
 * @returns {Promise<object>} Created audit log
 */
async function createAuditLog(client, logData) {
  const {
    entityType,
    entityId,
    action,
    performedBy,
    performedByType = 'system',
    changes = {},
    ipAddress = null,
    userAgent = null
  } = logData;

  try {
    const result = await client.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, performed_by, performed_by_type,
        changes, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      entityType,
      entityId,
      action,
      performedBy,
      performedByType,
      JSON.stringify(changes),
      ipAddress,
      userAgent
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't block main operation
    return null;
  }
}

/**
 * Get audit logs for an entity
 * @param {object} pool - Database pool
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of entity
 * @returns {Promise<Array>} Audit logs
 */
async function getAuditLogs(pool, entityType, entityId) {
  const result = await pool.query(`
    SELECT
      id, entity_type, entity_id, action, performed_by,
      performed_by_type, changes, ip_address, created_at
    FROM audit_logs
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
  `, [entityType, entityId]);

  return result.rows;
}

/**
 * Get recent audit logs with pagination
 * @param {object} pool - Database pool
 * @param {number} limit - Number of records
 * @param {number} offset - Offset for pagination
 * @param {object} filters - Optional filters
 * @returns {Promise<object>} Audit logs with pagination info
 */
async function getRecentAuditLogs(pool, limit = 50, offset = 0, filters = {}) {
  let query = `
    SELECT
      id, entity_type, entity_id, action, performed_by,
      performed_by_type, changes, ip_address, created_at
    FROM audit_logs
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (filters.entityType) {
    paramCount++;
    query += ` AND entity_type = $${paramCount}`;
    params.push(filters.entityType);
  }

  if (filters.action) {
    paramCount++;
    query += ` AND action = $${paramCount}`;
    params.push(filters.action);
  }

  if (filters.performedByType) {
    paramCount++;
    query += ` AND performed_by_type = $${paramCount}`;
    params.push(filters.performedByType);
  }

  if (filters.startDate) {
    paramCount++;
    query += ` AND created_at >= $${paramCount}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    paramCount++;
    query += ` AND created_at <= $${paramCount}`;
    params.push(filters.endDate);
  }

  query += ` ORDER BY created_at DESC`;

  // Add pagination
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
  const countParams = [];
  let countParamCount = 0;

  if (filters.entityType) {
    countParamCount++;
    countQuery += ` AND entity_type = $${countParamCount}`;
    countParams.push(filters.entityType);
  }

  if (filters.action) {
    countParamCount++;
    countQuery += ` AND action = $${countParamCount}`;
    countParams.push(filters.action);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  return {
    logs: result.rows,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  createAuditLog,
  getAuditLogs,
  getRecentAuditLogs
};
