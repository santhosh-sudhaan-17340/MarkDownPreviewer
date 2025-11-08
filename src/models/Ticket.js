const { query, transaction } = require('../database/connection');

class Ticket {
  // Generate unique ticket number
  static async generateTicketNumber() {
    const prefix = 'TKT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  // Calculate SLA due date based on priority
  static calculateSLADueDate(priority) {
    const slaMinutes = {
      low: parseInt(process.env.SLA_LOW_PRIORITY) || 4320,
      medium: parseInt(process.env.SLA_MEDIUM_PRIORITY) || 2880,
      high: parseInt(process.env.SLA_HIGH_PRIORITY) || 1440,
      critical: parseInt(process.env.SLA_CRITICAL_PRIORITY) || 480,
    };

    const minutes = slaMinutes[priority] || slaMinutes.medium;
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + minutes);
    return dueDate;
  }

  // Create a new ticket
  static async create(ticketData, userId) {
    return transaction(async (client) => {
      const ticketNumber = await this.generateTicketNumber();
      const slaDueDate = this.calculateSLADueDate(ticketData.priority);

      // Insert ticket
      const ticketQuery = `
        INSERT INTO tickets (
          ticket_number, customer_id, category_id, subject,
          description, priority, status, sla_due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const ticketResult = await client.query(ticketQuery, [
        ticketNumber,
        ticketData.customer_id,
        ticketData.category_id,
        ticketData.subject,
        ticketData.description,
        ticketData.priority,
        'new',
        slaDueDate,
      ]);

      const ticket = ticketResult.rows[0];

      // Create initial status history
      await client.query(
        `INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [ticket.id, null, 'new', userId]
      );

      // Create SLA tracking record
      await client.query(
        `INSERT INTO ticket_sla_tracking (ticket_id) VALUES ($1)`,
        [ticket.id]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        ['ticket', ticket.id, 'CREATE', userId, JSON.stringify(ticket)]
      );

      return ticket;
    });
  }

  // Get ticket by ID with full details
  static async getById(ticketId) {
    const query_text = `
      SELECT
        t.*,
        u_customer.full_name as customer_name,
        u_customer.email as customer_email,
        u_agent.full_name as agent_name,
        u_agent.email as agent_email,
        tc.category_name,
        ts.first_response_at,
        ts.first_response_sla_met,
        ts.resolution_sla_met,
        ts.total_resolution_time_minutes,
        ts.escalation_count
      FROM tickets t
      LEFT JOIN users u_customer ON t.customer_id = u_customer.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN ticket_sla_tracking ts ON t.id = ts.ticket_id
      WHERE t.id = $1
    `;

    const result = await query(query_text, [ticketId]);
    return result.rows[0];
  }

  // Update ticket status
  static async updateStatus(ticketId, newStatus, userId, reason = null) {
    return transaction(async (client) => {
      // Get current status
      const currentTicket = await client.query(
        'SELECT status FROM tickets WHERE id = $1',
        [ticketId]
      );

      if (currentTicket.rows.length === 0) {
        throw new Error('Ticket not found');
      }

      const oldStatus = currentTicket.rows[0].status;

      // Update ticket status
      const updateQuery = `
        UPDATE tickets
        SET status = $1,
            resolved_at = CASE WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            closed_at = CASE WHEN $1 = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [newStatus, ticketId]);

      // Record status change in history
      await client.query(
        `INSERT INTO ticket_status_history
         (ticket_id, old_status, new_status, changed_by_user_id, change_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [ticketId, oldStatus, newStatus, userId, reason]
      );

      // Update SLA tracking if resolved
      if (newStatus === 'resolved') {
        await client.query(
          `UPDATE ticket_sla_tracking
           SET resolution_sla_met = (
             SELECT sla_due_date > CURRENT_TIMESTAMP
             FROM tickets WHERE id = $1
           ),
           total_resolution_time_minutes = (
             SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60
             FROM tickets WHERE id = $1
           )
           WHERE ticket_id = $1`,
          [ticketId]
        );
      }

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'ticket',
          ticketId,
          'UPDATE_STATUS',
          userId,
          JSON.stringify({ status: oldStatus }),
          JSON.stringify({ status: newStatus, reason }),
        ]
      );

      return result.rows[0];
    });
  }

  // Assign ticket to agent
  static async assignToAgent(ticketId, agentId, userId, reason = null) {
    return transaction(async (client) => {
      // Get current assignment
      const currentTicket = await client.query(
        'SELECT assigned_agent_id FROM tickets WHERE id = $1',
        [ticketId]
      );

      if (currentTicket.rows.length === 0) {
        throw new Error('Ticket not found');
      }

      const oldAgentId = currentTicket.rows[0].assigned_agent_id;

      // Update ticket assignment
      const result = await client.query(
        `UPDATE tickets
         SET assigned_agent_id = $1,
             status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END
         WHERE id = $2
         RETURNING *`,
        [agentId, ticketId]
      );

      // Record assignment in history
      await client.query(
        `INSERT INTO ticket_assignment_history
         (ticket_id, assigned_from_agent_id, assigned_to_agent_id, assigned_by_user_id, assignment_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [ticketId, oldAgentId, agentId, userId, reason]
      );

      // Update SLA tracking for first response
      if (!oldAgentId) {
        await client.query(
          `UPDATE ticket_sla_tracking
           SET first_response_at = CURRENT_TIMESTAMP,
               first_response_sla_met = (
                 SELECT sla_due_date > CURRENT_TIMESTAMP
                 FROM tickets WHERE id = $1
               ),
               total_response_time_minutes = (
                 SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60
                 FROM tickets WHERE id = $1
               )
           WHERE ticket_id = $1 AND first_response_at IS NULL`,
          [ticketId]
        );
      }

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'ticket',
          ticketId,
          'ASSIGN',
          userId,
          JSON.stringify({ assigned_agent_id: oldAgentId }),
          JSON.stringify({ assigned_agent_id: agentId, reason }),
        ]
      );

      return result.rows[0];
    });
  }

  // Add comment to ticket
  static async addComment(ticketId, userId, commentText, isInternal = false) {
    return transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO ticket_comments (ticket_id, user_id, comment_text, is_internal)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [ticketId, userId, commentText, isInternal]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, performed_by_user_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        ['ticket_comment', result.rows[0].id, 'CREATE', userId, JSON.stringify(result.rows[0])]
      );

      return result.rows[0];
    });
  }

  // Get ticket timeline (status history, assignments, comments)
  static async getTimeline(ticketId) {
    const timelineQuery = `
      SELECT 'status_change' as event_type,
             id,
             old_status,
             new_status,
             change_reason as details,
             changed_by_user_id as user_id,
             changed_at as event_time
      FROM ticket_status_history
      WHERE ticket_id = $1

      UNION ALL

      SELECT 'assignment' as event_type,
             id,
             assigned_from_agent_id::text as old_status,
             assigned_to_agent_id::text as new_status,
             assignment_reason as details,
             assigned_by_user_id as user_id,
             assigned_at as event_time
      FROM ticket_assignment_history
      WHERE ticket_id = $1

      UNION ALL

      SELECT 'comment' as event_type,
             id,
             NULL as old_status,
             CASE WHEN is_internal THEN 'internal' ELSE 'public' END as new_status,
             comment_text as details,
             user_id,
             created_at as event_time
      FROM ticket_comments
      WHERE ticket_id = $1

      ORDER BY event_time DESC
    `;

    const result = await query(timelineQuery, [ticketId]);
    return result.rows;
  }

  // Get all tickets with filters
  static async getAll(filters = {}) {
    let query_text = `
      SELECT
        t.*,
        u_customer.full_name as customer_name,
        u_agent.full_name as agent_name,
        tc.category_name,
        ts.escalation_count,
        ts.first_response_sla_met,
        ts.resolution_sla_met
      FROM tickets t
      LEFT JOIN users u_customer ON t.customer_id = u_customer.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN ticket_sla_tracking ts ON t.id = ts.ticket_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query_text += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.priority) {
      query_text += ` AND t.priority = $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.assigned_agent_id) {
      query_text += ` AND t.assigned_agent_id = $${paramCount}`;
      params.push(filters.assigned_agent_id);
      paramCount++;
    }

    if (filters.customer_id) {
      query_text += ` AND t.customer_id = $${paramCount}`;
      params.push(filters.customer_id);
      paramCount++;
    }

    if (filters.sla_breached !== undefined) {
      query_text += ` AND t.sla_breached = $${paramCount}`;
      params.push(filters.sla_breached);
      paramCount++;
    }

    query_text += ' ORDER BY t.created_at DESC';

    if (filters.limit) {
      query_text += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    const result = await query(query_text, params);
    return result.rows;
  }

  // Mark ticket as SLA breached
  static async markSLABreached(ticketId) {
    return transaction(async (client) => {
      await client.query(
        `UPDATE tickets
         SET sla_breached = true, sla_breach_time = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [ticketId]
      );

      await client.query(
        `UPDATE ticket_sla_tracking
         SET escalation_count = escalation_count + 1
         WHERE ticket_id = $1`,
        [ticketId]
      );

      await client.query(
        `INSERT INTO audit_logs (entity_type, entity_id, action, new_values)
         VALUES ($1, $2, $3, $4)`,
        ['ticket', ticketId, 'SLA_BREACH', JSON.stringify({ breached_at: new Date() })]
      );
    });
  }
}

module.exports = Ticket;
