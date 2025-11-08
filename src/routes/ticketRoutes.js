const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/TicketController');
const multer = require('multer');
const AttachmentHandler = require('../services/AttachmentHandler');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
    }
});

// Ticket CRUD operations
router.post('/', TicketController.createTicket);
router.get('/', TicketController.getTickets);
router.get('/:identifier', TicketController.getTicket);
router.patch('/:id', TicketController.updateTicket);

// Ticket actions
router.post('/:id/assign', TicketController.assignTicket);
router.post('/:id/resolve', TicketController.resolveTicket);
router.post('/:id/close', TicketController.closeTicket);
router.post('/:id/escalate', TicketController.escalateTicket);

// Comments
router.post('/:id/comments', TicketController.addComment);
router.get('/:id/comments', TicketController.getComments);

// Status history
router.get('/:id/history', TicketController.getStatusHistory);

// Routing suggestions
router.get('/:id/routing-suggestions', TicketController.getRoutingSuggestions);

// Audit trail
router.get('/:id/audit', TicketController.getAuditTrail);

// Attachments
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const attachment = await AttachmentHandler.saveAttachment({
            ticketId: req.params.id,
            file: req.file,
            uploadedByAgentId: req.body.agentId || null,
            uploadedByUserId: req.body.userId || null
        });

        res.status(201).json({
            success: true,
            data: attachment
        });

    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/:id/attachments', async (req, res) => {
    try {
        const attachments = await AttachmentHandler.getTicketAttachments(req.params.id);

        res.json({
            success: true,
            data: attachments
        });

    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
