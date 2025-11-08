const db = require('../config/database');

class AuditLogger {
    /**
     * Log an action to audit trail
     */
    async log({
        ticketId = null,
        agentId = null,
        userId = null,
        action,
        entityType = null,
        entityId = null,
        oldValue = null,
        newValue = null,
        ipAddress = null,
        userAgent = null,
        description = null
    }) {
        try {
            const result = await db.query(`
                INSERT INTO audit_logs (
                    ticket_id, agent_id, user_id, action,
                    entity_type, entity_id, old_value, new_value,
                    ip_address, user_agent, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *;
            `, [
                ticketId, agentId, userId, action,
                entityType, entityId,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ipAddress, userAgent, description
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw - audit logging shouldn't break the main flow
            return null;
        }
    }

    /**
     * Log ticket creation
     */
    async logTicketCreated(ticket, userId, metadata = {}) {
        return this.log({
            ticketId: ticket.id,
            userId: userId,
            action: 'ticket_created',
            entityType: 'ticket',
            entityId: ticket.id,
            newValue: ticket,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: `Ticket ${ticket.ticket_number} created`
        });
    }

    /**
     * Log status change
     */
    async logStatusChange(ticket, oldStatus, newStatus, changedBy, metadata = {}) {
        return this.log({
            ticketId: ticket.id,
            agentId: changedBy.agentId,
            userId: changedBy.userId,
            action: 'status_changed',
            entityType: 'ticket',
            entityId: ticket.id,
            oldValue: { status: oldStatus },
            newValue: { status: newStatus },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: `Status changed from ${oldStatus} to ${newStatus}`
        });
    }

    /**
     * Log ticket assignment
     */
    async logTicketAssignment(ticket, agentId, assignedBy, metadata = {}) {
        return this.log({
            ticketId: ticket.id,
            agentId: assignedBy.agentId,
            action: 'ticket_assigned',
            entityType: 'ticket',
            entityId: ticket.id,
            newValue: { assigned_agent_id: agentId },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: `Ticket assigned to agent ${agentId}`
        });
    }

    /**
     * Log comment added
     */
    async logCommentAdded(comment, metadata = {}) {
        return this.log({
            ticketId: comment.ticket_id,
            agentId: comment.agent_id,
            userId: comment.user_id,
            action: 'comment_added',
            entityType: 'comment',
            entityId: comment.id,
            newValue: { comment: comment.comment, is_internal: comment.is_internal },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: 'Comment added to ticket'
        });
    }

    /**
     * Log attachment uploaded
     */
    async logAttachmentUploaded(attachment, metadata = {}) {
        return this.log({
            ticketId: attachment.ticket_id,
            agentId: attachment.uploaded_by_agent_id,
            userId: attachment.uploaded_by_user_id,
            action: 'attachment_uploaded',
            entityType: 'attachment',
            entityId: attachment.id,
            newValue: {
                filename: attachment.filename,
                file_size: attachment.file_size,
                mime_type: attachment.mime_type
            },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: `File ${attachment.original_filename} uploaded`
        });
    }

    /**
     * Log escalation
     */
    async logEscalation(ticket, reason, escalatedBy, metadata = {}) {
        return this.log({
            ticketId: ticket.id,
            agentId: escalatedBy.agentId,
            action: 'ticket_escalated',
            entityType: 'ticket',
            entityId: ticket.id,
            oldValue: { escalation_level: ticket.escalation_level - 1 },
            newValue: {
                escalation_level: ticket.escalation_level,
                reason: reason
            },
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            description: `Ticket escalated to level ${ticket.escalation_level}`
        });
    }

    /**
     * Log SLA breach
     */
    async logSLABreach(ticket, breachType, metadata = {}) {
        return this.log({
            ticketId: ticket.id,
            action: 'sla_breached',
            entityType: 'ticket',
            entityId: ticket.id,
            newValue: {
                breach_type: breachType,
                sla_response_breached: ticket.sla_response_breached,
                sla_resolution_breached: ticket.sla_resolution_breached
            },
            description: `SLA ${breachType} breach occurred`
        });
    }

    /**
     * Get audit trail for a ticket
     */
    async getTicketAuditTrail(ticketId, limit = 100) {
        const result = await db.query(`
            SELECT
                al.*,
                a.full_name as agent_name,
                u.full_name as user_name
            FROM audit_logs al
            LEFT JOIN agents a ON al.agent_id = a.id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.ticket_id = $1
            ORDER BY al.created_at DESC
            LIMIT $2;
        `, [ticketId, limit]);

        return result.rows;
    }

    /**
     * Get recent audit logs
     */
    async getRecentLogs(filters = {}) {
        const {
            action,
            agentId,
            userId,
            limit = 100,
            offset = 0
        } = filters;

        let query = `
            SELECT
                al.*,
                a.full_name as agent_name,
                u.full_name as user_name,
                t.ticket_number
            FROM audit_logs al
            LEFT JOIN agents a ON al.agent_id = a.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN tickets t ON al.ticket_id = t.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (action) {
            query += ` AND al.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (agentId) {
            query += ` AND al.agent_id = $${paramIndex}`;
            params.push(agentId);
            paramIndex++;
        }

        if (userId) {
            query += ` AND al.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        query += ` ORDER BY al.created_at DESC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new AuditLogger();
