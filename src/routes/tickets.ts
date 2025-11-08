import { Router, Request, Response } from 'express';
import { TicketService } from '../services/ticketService';
import { AttachmentService } from '../services/attachmentService';
import { AuditService } from '../services/auditService';
import { upload } from '../middleware/upload';
import { TicketPriority, TicketStatus } from '@prisma/client';

const router = Router();

/**
 * Create a new ticket
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, priority, requiredSkillId, createdById } = req.body;

    if (!title || !description || !createdById) {
      return res.status(400).json({
        error: 'Missing required fields: title, description, createdById',
      });
    }

    const ticket = await TicketService.createTicket({
      title,
      description,
      priority: priority || TicketPriority.MEDIUM,
      requiredSkillId,
      createdById,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/**
 * List tickets with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      priority,
      assignedToId,
      createdById,
      requiredSkillId,
      responseSLAStatus,
      resolutionSLAStatus,
      page = '1',
      limit = '20',
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status as TicketStatus;
    if (priority) filters.priority = priority as TicketPriority;
    if (assignedToId) filters.assignedToId = assignedToId as string;
    if (createdById) filters.createdById = createdById as string;
    if (requiredSkillId) filters.requiredSkillId = requiredSkillId as string;
    if (responseSLAStatus) filters.responseSLAStatus = responseSLAStatus as string;
    if (resolutionSLAStatus) filters.resolutionSLAStatus = resolutionSLAStatus as string;

    const result = await TicketService.listTickets(
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing tickets:', error);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
});

/**
 * Get ticket by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await TicketService.getTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error getting ticket:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

/**
 * Update ticket
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, status, priority, assignedToId } = req.body;
    const userId = req.body.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const ticket = await TicketService.updateTicket(
      req.params.id,
      { title, description, status, priority, assignedToId },
      userId as string
    );

    res.json(ticket);
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: error.message || 'Failed to update ticket' });
  }
});

/**
 * Delete ticket
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const ticket = await TicketService.deleteTicket(req.params.id, userId as string);
    res.json(ticket);
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

/**
 * Add comment to ticket
 */
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { content, userId, isInternal } = req.body;

    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing required fields: content, userId' });
    }

    const comment = await TicketService.addComment({
      ticketId: req.params.id,
      userId,
      content,
      isInternal,
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * Upload attachment to ticket
 */
router.post('/:id/attachments', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};

    const attachment = await AttachmentService.addAttachment(
      req.params.id,
      req.file,
      metadata
    );

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

/**
 * Get ticket attachments
 */
router.get('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const attachments = await AttachmentService.getTicketAttachments(req.params.id);
    res.json(attachments);
  } catch (error) {
    console.error('Error getting attachments:', error);
    res.status(500).json({ error: 'Failed to get attachments' });
  }
});

/**
 * Get ticket audit logs
 */
router.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const logs = await AuditService.getTicketAuditLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;
