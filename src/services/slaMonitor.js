const { query, transaction } = require('../database/connection');
const Ticket = require('../models/Ticket');

class SLAMonitor {
  // Check for SLA breaches and escalate tickets
  static async checkAndEscalate() {
    try {
      console.log('Running SLA breach check...');

      // Find tickets that have breached SLA but not yet marked
      const breachedTickets = await query(`
        SELECT
          t.id,
          t.ticket_number,
          t.priority,
          t.status,
          t.sla_due_date,
          t.assigned_agent_id,
          t.escalation_level,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_due_date)) / 60 as minutes_overdue
        FROM tickets t
        WHERE t.sla_due_date < CURRENT_TIMESTAMP
          AND t.status NOT IN ('resolved', 'closed')
          AND t.sla_breached = false
      `);

      console.log(`Found ${breachedTickets.rows.length} tickets with SLA breaches`);

      for (const ticket of breachedTickets.rows) {
        await this.handleSLABreach(ticket);
      }

      // Check for tickets needing escalation
      await this.checkEscalations();

      console.log('SLA breach check completed');
    } catch (error) {
      console.error('Error in SLA monitoring:', error);
    }
  }

  // Handle individual SLA breach
  static async handleSLABreach(ticket) {
    try {
      console.log(`SLA breached for ticket ${ticket.ticket_number}`);

      await Ticket.markSLABreached(ticket.id);

      // Add internal comment about SLA breach
      await Ticket.addComment(
        ticket.id,
        null, // System action
        `⚠️ SLA BREACH: This ticket has exceeded its SLA deadline by ${Math.round(ticket.minutes_overdue)} minutes. Priority: ${ticket.priority.toUpperCase()}`,
        true
      );

      // Trigger escalation if configured
      await this.escalateTicket(ticket);
    } catch (error) {
      console.error(`Error handling SLA breach for ticket ${ticket.id}:`, error);
    }
  }

  // Escalate ticket based on SLA rules
  static async escalateTicket(ticket) {
    return transaction(async (client) => {
      // Get escalation rules for priority
      const rulesResult = await client.query(
        `SELECT * FROM sla_escalation_rules WHERE priority = $1`,
        [ticket.priority]
      );

      if (rulesResult.rows.length === 0) {
        return;
      }

      const rules = rulesResult.rows[0];
      const minutesOverdue = ticket.minutes_overdue;

      let newEscalationLevel = ticket.escalation_level;

      // Determine escalation level based on time overdue
      if (minutesOverdue >= rules.escalation_level_3_minutes && rules.escalation_level_3_minutes) {
        newEscalationLevel = 3;
      } else if (minutesOverdue >= rules.escalation_level_2_minutes && rules.escalation_level_2_minutes) {
        newEscalationLevel = 2;
      } else if (minutesOverdue >= rules.escalation_level_1_minutes) {
        newEscalationLevel = 1;
      }

      if (newEscalationLevel > ticket.escalation_level) {
        await client.query(
          `UPDATE tickets
           SET escalation_level = $1, status = 'escalated'
           WHERE id = $2`,
          [newEscalationLevel, ticket.id]
        );

        // Add status history
        await client.query(
          `INSERT INTO ticket_status_history (ticket_id, old_status, new_status, change_reason)
           VALUES ($1, $2, $3, $4)`,
          [
            ticket.id,
            ticket.status,
            'escalated',
            `Escalated to level ${newEscalationLevel} due to SLA breach`,
          ]
        );

        // Add escalation comment
        await client.query(
          `INSERT INTO ticket_comments (ticket_id, comment_text, is_internal)
           VALUES ($1, $2, $3)`,
          [
            ticket.id,
            `🚨 ESCALATION LEVEL ${newEscalationLevel}: Ticket escalated due to extended SLA breach (${Math.round(minutesOverdue)} minutes overdue)`,
            true,
          ]
        );

        // Update SLA tracking
        await client.query(
          `UPDATE ticket_sla_tracking
           SET escalation_count = escalation_count + 1
           WHERE ticket_id = $1`,
          [ticket.id]
        );

        // Create audit log
        await client.query(
          `INSERT INTO audit_logs (entity_type, entity_id, action, new_values)
           VALUES ($1, $2, $3, $4)`,
          [
            'ticket',
            ticket.id,
            'ESCALATE',
            JSON.stringify({
              escalation_level: newEscalationLevel,
              minutes_overdue: minutesOverdue,
            }),
          ]
        );

        console.log(`Ticket ${ticket.ticket_number} escalated to level ${newEscalationLevel}`);
      }
    });
  }

  // Check all tickets for escalation needs
  static async checkEscalations() {
    const escalationCandidates = await query(`
      SELECT
        t.id,
        t.ticket_number,
        t.priority,
        t.status,
        t.sla_due_date,
        t.escalation_level,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_due_date)) / 60 as minutes_overdue
      FROM tickets t
      WHERE t.sla_breached = true
        AND t.status NOT IN ('resolved', 'closed')
        AND CURRENT_TIMESTAMP > t.sla_due_date
    `);

    for (const ticket of escalationCandidates.rows) {
      await this.escalateTicket(ticket);
    }
  }

  // Get upcoming SLA deadlines (tickets at risk)
  static async getUpcomingSLADeadlines(hoursAhead = 4) {
    const result = await query(`
      SELECT
        t.id,
        t.ticket_number,
        t.subject,
        t.priority,
        t.status,
        t.sla_due_date,
        t.assigned_agent_id,
        u_customer.full_name as customer_name,
        u_agent.full_name as agent_name,
        EXTRACT(EPOCH FROM (t.sla_due_date - CURRENT_TIMESTAMP)) / 60 as minutes_until_due
      FROM tickets t
      LEFT JOIN users u_customer ON t.customer_id = u_customer.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.sla_breached = false
        AND t.sla_due_date BETWEEN CURRENT_TIMESTAMP AND (CURRENT_TIMESTAMP + INTERVAL '1 hour' * $1)
      ORDER BY t.sla_due_date ASC
    `, [hoursAhead]);

    return result.rows;
  }

  // Get SLA compliance metrics
  static async getSLAMetrics(days = 30) {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1) as total_tickets,
        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
          AND status IN ('resolved', 'closed')
          AND sla_breached = false
        ) as tickets_within_sla,
        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
          AND sla_breached = true
        ) as tickets_breached_sla,
        ROUND(
          (COUNT(*) FILTER (
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
            AND status IN ('resolved', 'closed')
            AND sla_breached = false
          )::numeric /
          NULLIF(COUNT(*) FILTER (
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
            AND status IN ('resolved', 'closed')
          ), 0)) * 100,
          2
        ) as sla_compliance_percentage,
        COUNT(*) FILTER (
          WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
          AND escalation_level > 0
        ) as escalated_tickets,
        AVG(
          CASE WHEN status IN ('resolved', 'closed')
            AND created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
          END
        ) as avg_resolution_time_minutes
      FROM tickets
    `, [days]);

    return result.rows[0];
  }
}

module.exports = SLAMonitor;
