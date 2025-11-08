const TicketRepository = require('../models/TicketRepository');
const AuditLogger = require('../services/AuditLogger');
const SkillBasedRouter = require('../services/SkillBasedRouter');
const db = require('../config/database');

class TicketController {
    /**
     * Create a new ticket
     */
    async createTicket(req, res) {
        try {
            const {
                userId,
                categoryId,
                subject,
                description,
                priority = 'medium',
                source = 'web',
                tags = []
            } = req.body;

            // Validation
            if (!userId || !categoryId || !subject || !description) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, categoryId, subject, description'
                });
            }

            // Create ticket
            const ticket = await TicketRepository.create({
                userId,
                categoryId,
                subject,
                description,
                priority,
                source,
                tags
            });

            // Log creation
            await AuditLogger.logTicketCreated(ticket, userId, {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });

            // Auto-assign if enabled
            if (req.body.autoAssign !== false) {
                try {
                    const assignment = await SkillBasedRouter.autoAssign(ticket.id);
                    if (assignment) {
                        ticket.assigned_agent_id = assignment.agent.id;
                        await AuditLogger.logTicketAssignment(
                            ticket,
                            assignment.agent.id,
                            { agentId: null },
                            { ipAddress: req.ip, userAgent: req.get('user-agent') }
                        );
                    }
                } catch (error) {
                    console.error('Auto-assignment failed:', error);
                    // Don't fail ticket creation if auto-assignment fails
                }
            }

            res.status(201).json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get ticket by ID or ticket number
     */
    async getTicket(req, res) {
        try {
            const { identifier } = req.params;

            let ticket;
            if (identifier.startsWith('TKT-')) {
                ticket = await TicketRepository.getByTicketNumber(identifier);
            } else {
                ticket = await TicketRepository.getById(identifier);
            }

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error fetching ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get tickets with filters
     */
    async getTickets(req, res) {
        try {
            const filters = {
                status: req.query.status,
                priority: req.query.priority,
                assignedAgentId: req.query.assignedAgentId === 'null' ? null : req.query.assignedAgentId,
                userId: req.query.userId,
                categoryId: req.query.categoryId,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
                orderBy: req.query.orderBy || 'created_at',
                orderDir: req.query.orderDir || 'DESC'
            };

            const tickets = await TicketRepository.getTickets(filters);

            res.json({
                success: true,
                data: tickets,
                count: tickets.length
            });

        } catch (error) {
            console.error('Error fetching tickets:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update ticket
     */
    async updateTicket(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const oldTicket = await TicketRepository.getById(id);
            if (!oldTicket) {
                return res.status(404).json({
                    success: false,
                    error: 'Ticket not found'
                });
            }

            const ticket = await TicketRepository.update(id, updates);

            // Log status change if status was updated
            if (updates.status && updates.status !== oldTicket.status) {
                await AuditLogger.logStatusChange(
                    ticket,
                    oldTicket.status,
                    updates.status,
                    { agentId: req.body.changedByAgentId, userId: req.body.changedByUserId },
                    { ipAddress: req.ip, userAgent: req.get('user-agent') }
                );

                // Add to status history
                await db.query(`
                    INSERT INTO ticket_status_history
                    (ticket_id, old_status, new_status, changed_by_agent_id, changed_by_user_id, comment)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    id,
                    oldTicket.status,
                    updates.status,
                    req.body.changedByAgentId || null,
                    req.body.changedByUserId || null,
                    req.body.statusComment || null
                ]);
            }

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error updating ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Assign ticket to agent
     */
    async assignTicket(req, res) {
        try {
            const { id } = req.params;
            const { agentId, assignedBy } = req.body;

            if (!agentId) {
                return res.status(400).json({
                    success: false,
                    error: 'agentId is required'
                });
            }

            const ticket = await TicketRepository.assignToAgent(id, agentId, assignedBy);

            await AuditLogger.logTicketAssignment(
                ticket,
                agentId,
                { agentId: assignedBy },
                { ipAddress: req.ip, userAgent: req.get('user-agent') }
            );

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error assigning ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Add comment to ticket
     */
    async addComment(req, res) {
        try {
            const { id } = req.params;
            const { comment, agentId, userId, isInternal = false } = req.body;

            if (!comment) {
                return res.status(400).json({
                    success: false,
                    error: 'Comment text is required'
                });
            }

            const result = await db.query(`
                INSERT INTO ticket_comments (ticket_id, agent_id, user_id, comment, is_internal)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *;
            `, [id, agentId || null, userId || null, comment, isInternal]);

            const commentRecord = result.rows[0];

            // Mark first response if this is from an agent
            if (agentId) {
                await TicketRepository.markFirstResponse(id, agentId);
            }

            await AuditLogger.logCommentAdded(commentRecord, {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });

            res.status(201).json({
                success: true,
                data: commentRecord
            });

        } catch (error) {
            console.error('Error adding comment:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get ticket comments
     */
    async getComments(req, res) {
        try {
            const { id } = req.params;

            const result = await db.query(`
                SELECT
                    tc.*,
                    a.full_name as agent_name,
                    u.full_name as user_name
                FROM ticket_comments tc
                LEFT JOIN agents a ON tc.agent_id = a.id
                LEFT JOIN users u ON tc.user_id = u.id
                WHERE tc.ticket_id = $1
                ORDER BY tc.created_at ASC;
            `, [id]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Error fetching comments:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get ticket status history (timeline)
     */
    async getStatusHistory(req, res) {
        try {
            const { id } = req.params;

            const result = await db.query(`
                SELECT
                    tsh.*,
                    a.full_name as changed_by_agent_name,
                    u.full_name as changed_by_user_name
                FROM ticket_status_history tsh
                LEFT JOIN agents a ON tsh.changed_by_agent_id = a.id
                LEFT JOIN users u ON tsh.changed_by_user_id = u.id
                WHERE tsh.ticket_id = $1
                ORDER BY tsh.created_at DESC;
            `, [id]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Error fetching status history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Resolve ticket
     */
    async resolveTicket(req, res) {
        try {
            const { id } = req.params;
            const { resolvedBy, resolution } = req.body;

            const ticket = await TicketRepository.resolve(id, resolvedBy, resolution);

            if (resolution) {
                await db.query(`
                    INSERT INTO ticket_comments (ticket_id, agent_id, comment, is_internal)
                    VALUES ($1, $2, $3, false)
                `, [id, resolvedBy, `Resolution: ${resolution}`]);
            }

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error resolving ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Close ticket
     */
    async closeTicket(req, res) {
        try {
            const { id } = req.params;

            const ticket = await TicketRepository.close(id);

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error closing ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Escalate ticket
     */
    async escalateTicket(req, res) {
        try {
            const { id } = req.params;
            const { reason, escalatedBy } = req.body;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Escalation reason is required'
                });
            }

            const ticket = await TicketRepository.escalate(id, reason, escalatedBy);

            await AuditLogger.logEscalation(
                ticket,
                reason,
                { agentId: escalatedBy },
                { ipAddress: req.ip, userAgent: req.get('user-agent') }
            );

            res.json({
                success: true,
                data: ticket
            });

        } catch (error) {
            console.error('Error escalating ticket:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get routing suggestions
     */
    async getRoutingSuggestions(req, res) {
        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 5;

            const suggestions = await SkillBasedRouter.getRoutingSuggestions(id, limit);

            res.json({
                success: true,
                data: suggestions
            });

        } catch (error) {
            console.error('Error getting routing suggestions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get audit trail for ticket
     */
    async getAuditTrail(req, res) {
        try {
            const { id } = req.params;

            const auditLogs = await AuditLogger.getTicketAuditTrail(id);

            res.json({
                success: true,
                data: auditLogs
            });

        } catch (error) {
            console.error('Error fetching audit trail:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new TicketController();
