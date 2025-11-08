const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const TicketController = require('../controllers/ticketController');

// Validation rules
const createTicketValidation = [
  body('customer_id').isInt().withMessage('Customer ID must be an integer'),
  body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
];

const updateStatusValidation = [
  body('status').isIn(['new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'escalated'])
    .withMessage('Invalid status'),
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('reason').optional().isString(),
  body('resolution_notes').optional().isString(),
];

const assignTicketValidation = [
  body('agent_id').isInt().withMessage('Agent ID must be an integer'),
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('reason').optional().isString(),
];

const addCommentValidation = [
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('comment_text').trim().notEmpty().withMessage('Comment text is required'),
  body('is_internal').optional().isBoolean(),
];

// Routes
router.post('/', createTicketValidation, TicketController.createTicket);
router.get('/', TicketController.getTickets);
router.get('/:id', TicketController.getTicket);
router.put('/:id/status', updateStatusValidation, TicketController.updateStatus);
router.put('/:id/assign', assignTicketValidation, TicketController.assignTicket);
router.post('/:id/comments', addCommentValidation, TicketController.addComment);
router.get('/:id/timeline', TicketController.getTimeline);

module.exports = router;
