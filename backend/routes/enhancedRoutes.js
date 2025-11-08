const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { upload, processUpload } = require('../middleware/upload');
const NotificationService = require('../services/notificationService');
const SearchService = require('../services/searchService');
const ExportService = require('../services/exportService');
const WorkflowService = require('../services/workflowService');
const {
  CannedResponse,
  TimeEntry,
  Team,
  Workflow,
  Webhook,
  Notification,
  Ticket,
  Attachment
} = require('../models');

// All routes require authentication
router.use(authenticate);

// ============================================
// NOTIFICATIONS
// ============================================

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const { limit, offset, unread_only } = req.query;
    const notifications = await NotificationService.getUserNotifications(req.userId, {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      unreadOnly: unread_only === 'true'
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.userId);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/notifications/unread/count', async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.userId);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CANNED RESPONSES
// ============================================

// Get all canned responses
router.get('/canned-responses', authorize('agent', 'admin'), async (req, res) => {
  try {
    const responses = await CannedResponse.findAll({
      where: { is_public: true },
      order: [['category', 'ASC'], ['title', 'ASC']]
    });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create canned response
router.post('/canned-responses', authorize('agent', 'admin'), async (req, res) => {
  try {
    const response = await CannedResponse.create({
      ...req.body,
      created_by: req.userId
    });
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update canned response
router.put('/canned-responses/:id', authorize('agent', 'admin'), async (req, res) => {
  try {
    const response = await CannedResponse.findByPk(req.params.id);
    if (!response) {
      return res.status(404).json({ error: 'Canned response not found' });
    }
    await response.update(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete canned response
router.delete('/canned-responses/:id', authorize('admin'), async (req, res) => {
  try {
    await CannedResponse.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Canned response deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TIME TRACKING
// ============================================

// Get time entries for ticket
router.get('/tickets/:ticketId/time-entries', async (req, res) => {
  try {
    const entries = await TimeEntry.findAll({
      where: { ticket_id: req.params.ticketId },
      include: ['User'],
      order: [['created_at', 'DESC']]
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add time entry
router.post('/tickets/:ticketId/time-entries', authorize('agent', 'admin'), async (req, res) => {
  try {
    const entry = await TimeEntry.create({
      ticket_id: req.params.ticketId,
      user_id: req.userId,
      ...req.body
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FILE UPLOADS
// ============================================

// Upload attachment
router.post('/tickets/:ticketId/attachments', upload.array('files', 5), processUpload, async (req, res) => {
  try {
    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = await Promise.all(
      req.uploadedFiles.map(file =>
        Attachment.create({
          ticket_id: req.params.ticketId,
          uploaded_by: req.userId,
          file_name: file.originalName,
          file_path: file.path,
          file_size: file.size,
          file_type: file.originalName.split('.').pop(),
          mime_type: file.mimetype,
          checksum: file.checksum
        })
      )
    );

    res.status(201).json(attachments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket attachments
router.get('/tickets/:ticketId/attachments', async (req, res) => {
  try {
    const attachments = await Attachment.findAll({
      where: { ticket_id: req.params.ticketId },
      include: [{ model: 'User', as: 'uploadedBy', attributes: ['id', 'full_name'] }]
    });
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEARCH
// ============================================

// Full-text search
router.get('/search', async (req, res) => {
  try {
    const results = await SearchService.fullTextSearch(req.query.q, req.query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Advanced search
router.post('/search/advanced', async (req, res) => {
  try {
    const results = await SearchService.advancedSearch(req.body);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-suggest
router.get('/search/suggest', async (req, res) => {
  try {
    const suggestions = await SearchService.autoSuggest(req.query.q, req.query.field);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXPORTS
// ============================================

// Export tickets to Excel
router.get('/export/tickets/excel', authorize('agent', 'admin'), async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: 'User', as: 'customer' },
        { model: 'User', as: 'assignedAgent' }
      ]
    });

    const buffer = await ExportService.exportTicketsToExcel(tickets);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tickets-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export tickets to PDF
router.get('/export/tickets/pdf', authorize('agent', 'admin'), async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: 'User', as: 'customer' },
        { model: 'User', as: 'assignedAgent' }
      ]
    });

    const buffer = await ExportService.exportTicketsToPDF(tickets);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tickets-${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export single ticket to PDF
router.get('/export/tickets/:id/pdf', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: 'User', as: 'customer' },
        { model: 'User', as: 'assignedAgent' },
        { model: 'TicketComment', include: ['User'] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const buffer = await ExportService.exportTicketDetailToPDF(ticket);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ticket-${ticket.ticket_number}.pdf`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEAMS
// ============================================

// Get all teams
router.get('/teams', authorize('agent', 'admin'), async (req, res) => {
  try {
    const teams = await Team.findAll({
      where: { is_active: true },
      include: ['Members']
    });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create team
router.post('/teams', authorize('admin'), async (req, res) => {
  try {
    const team = await Team.create(req.body);
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WORKFLOWS
// ============================================

// Get all workflows
router.get('/workflows', authorize('admin'), async (req, res) => {
  try {
    const workflows = await Workflow.findAll({
      order: [['execution_order', 'ASC']]
    });
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workflow
router.post('/workflows', authorize('admin'), async (req, res) => {
  try {
    const workflow = await Workflow.create(req.body);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle workflow
router.patch('/workflows/:id/toggle', authorize('admin'), async (req, res) => {
  try {
    const workflow = await Workflow.findByPk(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    await workflow.update({ is_active: !workflow.is_active });
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEBHOOKS
// ============================================

// Get all webhooks
router.get('/webhooks', authorize('admin'), async (req, res) => {
  try {
    const webhooks = await Webhook.findAll();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create webhook
router.post('/webhooks', authorize('admin'), async (req, res) => {
  try {
    const webhook = await Webhook.create(req.body);
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle webhook
router.patch('/webhooks/:id/toggle', authorize('admin'), async (req, res) => {
  try {
    const webhook = await Webhook.findByPk(req.params.id);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    await webhook.update({ is_active: !webhook.is_active });
    res.json(webhook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
