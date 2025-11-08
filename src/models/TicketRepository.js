const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class TicketRepository {
    /**
     * Create a new ticket
     */
    async create(ticketData) {
        const {
            userId,
            categoryId,
            subject,
            description,
            priority = 'medium',
            source = 'web',
            tags = []
        } = ticketData;

        // Generate unique ticket number
        const ticketNumber = `TKT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Get SLA times from category
        const categoryResult = await db.query(
            'SELECT sla_response_minutes, sla_resolution_minutes FROM categories WHERE id = $1',
            [categoryId]
        );

        if (categoryResult.rows.length === 0) {
            throw new Error('Invalid category');
        }

        const { sla_response_minutes, sla_resolution_minutes } = categoryResult.rows[0];
        const now = new Date();
        const slaResponseDue = new Date(now.getTime() + sla_response_minutes * 60000);
        const slaResolutionDue = new Date(now.getTime() + sla_resolution_minutes * 60000);

        const result = await db.query(`
            INSERT INTO tickets (
                ticket_number, user_id, category_id, subject, description,
                priority, status, source, tags,
                sla_response_due, sla_resolution_due
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `, [
            ticketNumber, userId, categoryId, subject, description,
            priority, 'new', source, tags,
            slaResponseDue, slaResolutionDue
        ]);

        return result.rows[0];
    }

    /**
     * Get ticket by ID with related data
     */
    async getById(ticketId) {
        const result = await db.query(`
            SELECT
                t.*,
                u.full_name as customer_name,
                u.email as customer_email,
                a.full_name as agent_name,
                a.email as agent_email,
                c.name as category_name,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600 as age_hours,
                EXTRACT(EPOCH FROM (t.sla_response_due - CURRENT_TIMESTAMP))/60 as response_time_remaining_minutes,
                EXTRACT(EPOCH FROM (t.sla_resolution_due - CURRENT_TIMESTAMP))/60 as resolution_time_remaining_minutes
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = $1;
        `, [ticketId]);

        return result.rows[0];
    }

    /**
     * Get ticket by ticket number
     */
    async getByTicketNumber(ticketNumber) {
        const result = await db.query(`
            SELECT
                t.*,
                u.full_name as customer_name,
                u.email as customer_email,
                a.full_name as agent_name,
                c.name as category_name
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.ticket_number = $1;
        `, [ticketNumber]);

        return result.rows[0];
    }

    /**
     * Update ticket
     */
    async update(ticketId, updates) {
        const allowedFields = [
            'status', 'priority', 'subject', 'description',
            'assigned_agent_id', 'escalation_level', 'tags'
        ];

        const setClause = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${paramIndex}`);
                values.push(updates[key]);
                paramIndex++;
            }
        });

        if (setClause.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(ticketId);

        const result = await db.query(`
            UPDATE tickets
            SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *;
        `, values);

        return result.rows[0];
    }

    /**
     * Assign ticket to agent
     */
    async assignToAgent(ticketId, agentId, assignedBy) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // Update ticket
            const ticketResult = await client.query(`
                UPDATE tickets
                SET assigned_agent_id = $1, status = 'open', updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `, [agentId, ticketId]);

            if (ticketResult.rows.length === 0) {
                throw new Error('Ticket not found');
            }

            // Update agent's current ticket count
            await client.query(`
                UPDATE agents
                SET current_ticket_count = current_ticket_count + 1
                WHERE id = $1;
            `, [agentId]);

            await client.query('COMMIT');
            return ticketResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Mark first response
     */
    async markFirstResponse(ticketId, agentId) {
        const result = await db.query(`
            UPDATE tickets
            SET first_response_at = CURRENT_TIMESTAMP,
                status = CASE WHEN status = 'new' THEN 'open' ELSE status END
            WHERE id = $1 AND first_response_at IS NULL
            RETURNING *;
        `, [ticketId]);

        return result.rows[0];
    }

    /**
     * Resolve ticket
     */
    async resolve(ticketId, resolvedBy, resolution) {
        const result = await db.query(`
            UPDATE tickets
            SET status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *;
        `, [ticketId]);

        return result.rows[0];
    }

    /**
     * Close ticket
     */
    async close(ticketId) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const ticketResult = await client.query(`
                UPDATE tickets
                SET status = 'closed',
                    closed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *;
            `, [ticketId]);

            if (ticketResult.rows.length === 0) {
                throw new Error('Ticket not found');
            }

            const ticket = ticketResult.rows[0];

            // Decrease agent's current ticket count
            if (ticket.assigned_agent_id) {
                await client.query(`
                    UPDATE agents
                    SET current_ticket_count = GREATEST(current_ticket_count - 1, 0)
                    WHERE id = $1;
                `, [ticket.assigned_agent_id]);
            }

            await client.query('COMMIT');
            return ticket;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Escalate ticket
     */
    async escalate(ticketId, reason, escalatedBy) {
        const result = await db.query(`
            UPDATE tickets
            SET escalation_level = escalation_level + 1,
                escalated_at = CURRENT_TIMESTAMP,
                escalation_reason = $2,
                status = 'escalated',
                priority = CASE
                    WHEN priority = 'low' THEN 'medium'
                    WHEN priority = 'medium' THEN 'high'
                    WHEN priority = 'high' THEN 'critical'
                    ELSE priority
                END
            WHERE id = $1
            RETURNING *;
        `, [ticketId, reason]);

        return result.rows[0];
    }

    /**
     * Get tickets with filters
     */
    async getTickets(filters = {}) {
        const {
            status,
            priority,
            assignedAgentId,
            userId,
            categoryId,
            limit = 50,
            offset = 0,
            orderBy = 'created_at',
            orderDir = 'DESC'
        } = filters;

        let query = `
            SELECT
                t.*,
                u.full_name as customer_name,
                u.email as customer_email,
                a.full_name as agent_name,
                c.name as category_name
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (priority) {
            query += ` AND t.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        if (assignedAgentId !== undefined) {
            if (assignedAgentId === null) {
                query += ` AND t.assigned_agent_id IS NULL`;
            } else {
                query += ` AND t.assigned_agent_id = $${paramIndex}`;
                params.push(assignedAgentId);
                paramIndex++;
            }
        }

        if (userId) {
            query += ` AND t.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        if (categoryId) {
            query += ` AND t.category_id = $${paramIndex}`;
            params.push(categoryId);
            paramIndex++;
        }

        query += ` ORDER BY t.${orderBy} ${orderDir}`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get tickets needing SLA attention
     */
    async getTicketsNeedingSLAAttention() {
        const result = await db.query(`
            SELECT
                t.*,
                u.email as customer_email,
                a.full_name as agent_name,
                a.email as agent_email,
                c.name as category_name
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status NOT IN ('resolved', 'closed')
            AND (
                (t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '30 minutes')
                OR
                (t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '1 hour')
            )
            ORDER BY
                CASE
                    WHEN t.sla_response_due < CURRENT_TIMESTAMP THEN 1
                    WHEN t.sla_resolution_due < CURRENT_TIMESTAMP THEN 2
                    ELSE 3
                END,
                t.priority,
                t.created_at;
        `);

        return result.rows;
    }
}

module.exports = new TicketRepository();
