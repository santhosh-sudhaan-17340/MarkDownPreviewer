const Ticket = require('../models/Ticket');
const TicketRouter = require('../services/ticketRouter');
const { validationResult } = require('express-validator');

class TicketController {
  // Create new ticket
  static async createTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticketData = {
        customer_id: req.body.customer_id,
        category_id: req.body.category_id,
        subject: req.body.subject,
        description: req.body.description,
        priority: req.body.priority,
      };

      const ticket = await Ticket.create(ticketData, req.body.customer_id);

      // Auto-assign if enabled
      if (req.body.auto_assign !== false) {
        try {
          await TicketRouter.autoAssignTicket(
            ticket.id,
            ticketData.category_id,
            ticketData.priority
          );
        } catch (error) {
          console.error('Auto-assignment failed:', error);
          // Continue even if auto-assignment fails
        }
      }

      // Fetch full ticket details
      const fullTicket = await Ticket.getById(ticket.id);

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: fullTicket,
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create ticket',
        error: error.message,
      });
    }
  }

  // Get ticket by ID
  static async getTicket(req, res) {
    try {
      const ticketId = parseInt(req.params.id);
      const ticket = await Ticket.getById(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found',
        });
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket',
        error: error.message,
      });
    }
  }

  // Get all tickets with filters
  static async getTickets(req, res) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        assigned_agent_id: req.query.assigned_agent_id ? parseInt(req.query.assigned_agent_id) : undefined,
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id) : undefined,
        sla_breached: req.query.sla_breached === 'true' ? true : req.query.sla_breached === 'false' ? false : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
      };

      const tickets = await Ticket.getAll(filters);

      res.json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets',
        error: error.message,
      });
    }
  }

  // Update ticket status
  static async updateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticketId = parseInt(req.params.id);
      const { status, reason, user_id, resolution_notes } = req.body;

      const ticket = await Ticket.updateStatus(ticketId, status, user_id, reason);

      // If resolving, add resolution notes
      if (status === 'resolved' && resolution_notes) {
        await Ticket.addComment(ticketId, user_id, `Resolution: ${resolution_notes}`, false);
      }

      const updatedTicket = await Ticket.getById(ticketId);

      res.json({
        success: true,
        message: 'Ticket status updated successfully',
        data: updatedTicket,
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket status',
        error: error.message,
      });
    }
  }

  // Assign ticket to agent
  static async assignTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticketId = parseInt(req.params.id);
      const { agent_id, user_id, reason } = req.body;

      await Ticket.assignToAgent(ticketId, agent_id, user_id, reason);
      const updatedTicket = await Ticket.getById(ticketId);

      res.json({
        success: true,
        message: 'Ticket assigned successfully',
        data: updatedTicket,
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign ticket',
        error: error.message,
      });
    }
  }

  // Add comment to ticket
  static async addComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticketId = parseInt(req.params.id);
      const { user_id, comment_text, is_internal } = req.body;

      const comment = await Ticket.addComment(
        ticketId,
        user_id,
        comment_text,
        is_internal || false
      );

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment,
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: error.message,
      });
    }
  }

  // Get ticket timeline
  static async getTimeline(req, res) {
    try {
      const ticketId = parseInt(req.params.id);
      const timeline = await Ticket.getTimeline(ticketId);

      res.json({
        success: true,
        count: timeline.length,
        data: timeline,
      });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch timeline',
        error: error.message,
      });
    }
  }
}

module.exports = TicketController;
