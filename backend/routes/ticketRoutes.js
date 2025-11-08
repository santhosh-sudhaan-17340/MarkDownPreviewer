const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const auditMiddleware = require('../middleware/auditMiddleware');

// All routes require authentication
router.use(authenticate);

// Create ticket (customers and admins)
router.post(
  '/',
  authorize('customer', 'admin'),
  auditMiddleware('CREATE_TICKET', 'ticket'),
  TicketController.createTicket
);

// Get all tickets
router.get(
  '/',
  TicketController.getTickets
);

// Get specific ticket
router.get(
  '/:id',
  TicketController.getTicketById
);

// Update ticket
router.put(
  '/:id',
  authorize('agent', 'admin'),
  auditMiddleware('UPDATE_TICKET', 'ticket'),
  TicketController.updateTicket
);

// Update ticket status
router.patch(
  '/:id/status',
  authorize('agent', 'admin'),
  auditMiddleware('UPDATE_STATUS', 'ticket'),
  TicketController.updateTicketStatus
);

// Assign ticket
router.post(
  '/:id/assign',
  authorize('agent', 'admin'),
  auditMiddleware('ASSIGN_TICKET', 'ticket'),
  TicketController.assignTicket
);

// Escalate ticket
router.post(
  '/:id/escalate',
  authorize('agent', 'admin'),
  auditMiddleware('ESCALATE_TICKET', 'ticket'),
  TicketController.escalateTicket
);

// Add comment
router.post(
  '/:id/comments',
  auditMiddleware('ADD_COMMENT', 'ticket'),
  TicketController.addComment
);

// Get ticket timeline
router.get(
  '/:id/timeline',
  TicketController.getTicketTimeline
);

module.exports = router;
