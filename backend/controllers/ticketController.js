const {
  Ticket,
  User,
  Skill,
  SlaPolicy,
  TicketStatusHistory,
  TicketAssignment,
  TicketEscalation,
  TicketComment,
  Attachment
} = require('../models');
const SlaService = require('../services/slaService');
const RoutingService = require('../services/routingService');
const AuditService = require('../services/auditService');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

class TicketController {

  // Create a new ticket
  static async createTicket(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { subject, description, priority, category, skill_id } = req.body;
      const customer_id = req.userRole === 'customer' ? req.userId : req.body.customer_id;

      // Create ticket
      const ticket = await Ticket.create({
        subject,
        description,
        priority: priority || 'medium',
        category,
        customer_id,
        skill_id,
        status: 'open'
      }, { transaction });

      // Apply SLA policy
      await SlaService.applySlaPolicy(ticket);

      // Record status history
      await TicketStatusHistory.create({
        ticket_id: ticket.id,
        to_status: 'open',
        changed_by: customer_id,
        comment: 'Ticket created'
      }, { transaction });

      // Auto-assign if requested
      if (req.body.auto_assign) {
        try {
          const agent = await RoutingService.autoAssignTicket(ticket.id);
          await TicketAssignment.create({
            ticket_id: ticket.id,
            assigned_to: agent.id,
            assignment_reason: 'Auto-assigned based on skill and workload'
          }, { transaction });
        } catch (assignError) {
          console.log('Auto-assignment failed:', assignError.message);
        }
      }

      await transaction.commit();

      // Fetch complete ticket data
      const completeTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' },
          { model: Skill },
          { model: SlaPolicy }
        ]
      });

      res.status(201).json(completeTicket);
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ error: error.message });
    }
  }

  // Get all tickets with filters
  static async getTickets(req, res) {
    try {
      const {
        status,
        priority,
        customer_id,
        assigned_agent_id,
        skill_id,
        is_sla_breached,
        page = 1,
        limit = 20,
        sort = 'created_at',
        order = 'DESC'
      } = req.query;

      const where = {};

      // Apply filters based on user role
      if (req.userRole === 'customer') {
        where.customer_id = req.userId;
      } else if (req.userRole === 'agent' && !req.query.all) {
        where.assigned_agent_id = req.userId;
      }

      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (customer_id) where.customer_id = customer_id;
      if (assigned_agent_id) where.assigned_agent_id = assigned_agent_id;
      if (skill_id) where.skill_id = skill_id;
      if (is_sla_breached !== undefined) where.is_sla_breached = is_sla_breached === 'true';

      const offset = (page - 1) * limit;

      const { rows: tickets, count } = await Ticket.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [[sort, order]],
        include: [
          { model: User, as: 'customer', attributes: ['id', 'full_name', 'email'] },
          { model: User, as: 'assignedAgent', attributes: ['id', 'full_name', 'email'] },
          { model: Skill, attributes: ['id', 'name'] },
          { model: SlaPolicy }
        ]
      });

      res.json({
        tickets,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get ticket by ID
  static async getTicketById(req, res) {
    try {
      const ticket = await Ticket.findByPk(req.params.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' },
          { model: Skill },
          { model: SlaPolicy },
          {
            model: TicketStatusHistory,
            include: [{ model: User, as: 'changedBy', attributes: ['id', 'full_name'] }],
            order: [['created_at', 'DESC']]
          },
          {
            model: TicketComment,
            include: [{ model: User, attributes: ['id', 'full_name', 'role'] }],
            order: [['created_at', 'ASC']]
          },
          {
            model: Attachment,
            include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'full_name'] }]
          },
          {
            model: TicketEscalation,
            include: [
              { model: User, as: 'escalatedFromUser', attributes: ['id', 'full_name'] },
              { model: User, as: 'escalatedToUser', attributes: ['id', 'full_name'] }
            ]
          }
        ]
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check permissions
      if (req.userRole === 'customer' && ticket.customer_id !== req.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update ticket status
  static async updateTicketStatus(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { status, comment } = req.body;
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const oldStatus = ticket.status;

      // Update timestamps based on status
      const updates = { status };
      if (status === 'in_progress' && !ticket.first_response_at) {
        updates.first_response_at = new Date();
      }
      if (status === 'resolved' && !ticket.resolved_at) {
        updates.resolved_at = new Date();
      }
      if (status === 'closed' && !ticket.closed_at) {
        updates.closed_at = new Date();
      }

      await ticket.update(updates, { transaction });

      // Record status history
      await TicketStatusHistory.create({
        ticket_id: ticket.id,
        from_status: oldStatus,
        to_status: status,
        changed_by: req.userId,
        comment
      }, { transaction });

      await transaction.commit();

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' },
          { model: SlaPolicy }
        ]
      });

      res.json(updatedTicket);
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ error: error.message });
    }
  }

  // Assign ticket to agent
  static async assignTicket(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { agent_id, reason } = req.body;
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const oldAgentId = ticket.assigned_agent_id;

      await ticket.update({
        assigned_agent_id: agent_id,
        status: ticket.status === 'open' ? 'assigned' : ticket.status
      }, { transaction });

      // Record assignment
      await TicketAssignment.create({
        ticket_id: ticket.id,
        assigned_to: agent_id,
        assigned_by: req.userId,
        assignment_reason: reason || 'Manual assignment'
      }, { transaction });

      // Record status change if status changed
      if (ticket.status === 'open') {
        await TicketStatusHistory.create({
          ticket_id: ticket.id,
          from_status: 'open',
          to_status: 'assigned',
          changed_by: req.userId,
          comment: 'Ticket assigned to agent'
        }, { transaction });
      }

      await transaction.commit();

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' }
        ]
      });

      res.json(updatedTicket);
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ error: error.message });
    }
  }

  // Escalate ticket
  static async escalateTicket(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { escalate_to, reason } = req.body;
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Get current escalation level
      const currentEscalations = await TicketEscalation.count({
        where: { ticket_id: ticket.id }
      });

      await ticket.update({
        status: 'escalated',
        escalated_at: new Date(),
        assigned_agent_id: escalate_to || ticket.assigned_agent_id
      }, { transaction });

      // Create escalation record
      await TicketEscalation.create({
        ticket_id: ticket.id,
        escalated_from: ticket.assigned_agent_id,
        escalated_to: escalate_to,
        escalation_reason: reason,
        escalation_level: currentEscalations + 1,
        is_auto_escalated: false
      }, { transaction });

      // Record status change
      await TicketStatusHistory.create({
        ticket_id: ticket.id,
        from_status: ticket.status,
        to_status: 'escalated',
        changed_by: req.userId,
        comment: `Escalated: ${reason}`
      }, { transaction });

      await transaction.commit();

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' },
          { model: TicketEscalation, include: [
            { model: User, as: 'escalatedFromUser' },
            { model: User, as: 'escalatedToUser' }
          ]}
        ]
      });

      res.json(updatedTicket);
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ error: error.message });
    }
  }

  // Add comment to ticket
  static async addComment(req, res) {
    try {
      const { comment, is_internal } = req.body;

      const ticket = await Ticket.findByPk(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticketComment = await TicketComment.create({
        ticket_id: ticket.id,
        user_id: req.userId,
        comment,
        is_internal: is_internal || false
      });

      const commentWithUser = await TicketComment.findByPk(ticketComment.id, {
        include: [{ model: User, attributes: ['id', 'full_name', 'role'] }]
      });

      res.status(201).json(commentWithUser);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get ticket timeline (status history)
  static async getTicketTimeline(req, res) {
    try {
      const timeline = await TicketStatusHistory.findAll({
        where: { ticket_id: req.params.id },
        include: [{ model: User, as: 'changedBy', attributes: ['id', 'full_name'] }],
        order: [['created_at', 'ASC']]
      });

      res.json(timeline);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Update ticket
  static async updateTicket(req, res) {
    try {
      const ticket = await Ticket.findByPk(req.params.id);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const { subject, description, priority, category, skill_id } = req.body;
      const updates = {};

      if (subject) updates.subject = subject;
      if (description) updates.description = description;
      if (priority) updates.priority = priority;
      if (category) updates.category = category;
      if (skill_id) updates.skill_id = skill_id;

      await ticket.update(updates);

      // Reapply SLA if priority changed
      if (priority && priority !== ticket.priority) {
        await SlaService.applySlaPolicy(ticket);
      }

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: User, as: 'customer' },
          { model: User, as: 'assignedAgent' },
          { model: Skill },
          { model: SlaPolicy }
        ]
      });

      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TicketController;
