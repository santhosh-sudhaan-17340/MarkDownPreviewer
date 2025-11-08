const { Ticket, SlaPolicy, TicketEscalation, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class SlaService {

  // Calculate due date based on SLA policy
  static async calculateDueDate(ticket, slaPolicy) {
    const createdAt = ticket.created_at || new Date();
    const resolutionHours = slaPolicy.resolution_time_hours;
    const dueDate = new Date(createdAt.getTime() + (resolutionHours * 60 * 60 * 1000));
    return dueDate;
  }

  // Apply SLA policy to ticket
  static async applySlaPolicy(ticket) {
    const slaPolicy = await SlaPolicy.findOne({
      where: {
        priority: ticket.priority,
        is_active: true
      }
    });

    if (slaPolicy) {
      const dueDate = await this.calculateDueDate(ticket, slaPolicy);
      await ticket.update({
        sla_policy_id: slaPolicy.id,
        due_date: dueDate
      });
    }

    return slaPolicy;
  }

  // Check for SLA breaches
  static async checkSlaBreaches() {
    const now = new Date();

    // Find tickets that have breached SLA
    const breachedTickets = await Ticket.findAll({
      where: {
        status: {
          [Op.notIn]: ['closed', 'resolved']
        },
        due_date: {
          [Op.lt]: now
        },
        is_sla_breached: false
      },
      include: [
        { model: SlaPolicy },
        { model: User, as: 'assignedAgent' }
      ]
    });

    for (const ticket of breachedTickets) {
      await this.markAsBreach(ticket, 'Resolution time exceeded');
    }

    return breachedTickets.length;
  }

  // Mark ticket as SLA breach
  static async markAsBreach(ticket, reason) {
    await ticket.update({
      is_sla_breached: true,
      sla_breach_reason: reason
    });

    // Log the breach
    await AuditLog.create({
      ticket_id: ticket.id,
      action: 'SLA_BREACH',
      entity_type: 'ticket',
      entity_id: ticket.id,
      new_value: JSON.stringify({ reason })
    });

    console.log(`SLA breach marked for ticket ${ticket.ticket_number}: ${reason}`);
  }

  // Check tickets for auto-escalation
  static async checkAutoEscalations() {
    const now = new Date();

    // Find tickets that need escalation
    const ticketsForEscalation = await Ticket.findAll({
      where: {
        status: {
          [Op.notIn]: ['closed', 'resolved', 'escalated']
        },
        escalated_at: null
      },
      include: [
        { model: SlaPolicy },
        { model: User, as: 'assignedAgent' }
      ]
    });

    let escalatedCount = 0;

    for (const ticket of ticketsForEscalation) {
      if (ticket.SlaPolicy) {
        const escalationTime = new Date(
          ticket.created_at.getTime() +
          (ticket.SlaPolicy.escalation_time_hours * 60 * 60 * 1000)
        );

        if (now >= escalationTime) {
          await this.autoEscalateTicket(ticket);
          escalatedCount++;
        }
      }
    }

    return escalatedCount;
  }

  // Auto-escalate a ticket
  static async autoEscalateTicket(ticket) {
    const transaction = await sequelize.transaction();

    try {
      // Find an available supervisor/admin
      const supervisor = await User.findOne({
        where: {
          role: 'admin',
          is_active: true
        }
      });

      // Update ticket status
      await ticket.update({
        status: 'escalated',
        escalated_at: new Date()
      }, { transaction });

      // Create escalation record
      await TicketEscalation.create({
        ticket_id: ticket.id,
        escalated_from: ticket.assigned_agent_id,
        escalated_to: supervisor ? supervisor.id : null,
        escalation_reason: 'Auto-escalated due to SLA time limit',
        escalation_level: 1,
        is_auto_escalated: true
      }, { transaction });

      // Log the escalation
      await AuditLog.create({
        ticket_id: ticket.id,
        action: 'AUTO_ESCALATE',
        entity_type: 'ticket',
        entity_id: ticket.id,
        old_value: ticket.status,
        new_value: 'escalated'
      }, { transaction });

      await transaction.commit();
      console.log(`Auto-escalated ticket ${ticket.ticket_number}`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error auto-escalating ticket:', error);
      throw error;
    }
  }

  // Get SLA statistics
  static async getSlaStatistics(startDate, endDate) {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    const totalTickets = await Ticket.count({ where: whereClause });
    const breachedTickets = await Ticket.count({
      where: {
        ...whereClause,
        is_sla_breached: true
      }
    });

    const resolvedWithinSla = await Ticket.count({
      where: {
        ...whereClause,
        status: { [Op.in]: ['resolved', 'closed'] },
        is_sla_breached: false
      }
    });

    const breachRate = totalTickets > 0 ? (breachedTickets / totalTickets * 100).toFixed(2) : 0;
    const complianceRate = totalTickets > 0 ? (resolvedWithinSla / totalTickets * 100).toFixed(2) : 0;

    return {
      totalTickets,
      breachedTickets,
      resolvedWithinSla,
      breachRate: parseFloat(breachRate),
      complianceRate: parseFloat(complianceRate)
    };
  }
}

module.exports = SlaService;
