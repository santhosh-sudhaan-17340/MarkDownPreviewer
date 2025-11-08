const db = require('../config/database');
const AuditLogger = require('./AuditLogger');
const cron = require('node-cron');

class SLAMonitor {
    constructor() {
        this.isRunning = false;
    }

    /**
     * Start SLA monitoring job
     */
    start() {
        if (this.isRunning) {
            console.log('SLA Monitor is already running');
            return;
        }

        const checkInterval = process.env.SLA_CHECK_INTERVAL || 5;

        // Run every N minutes
        this.job = cron.schedule(`*/${checkInterval} * * * *`, async () => {
            try {
                await this.checkSLABreaches();
            } catch (error) {
                console.error('SLA check failed:', error);
            }
        });

        this.isRunning = true;
        console.log(`✓ SLA Monitor started (checking every ${checkInterval} minutes)`);

        // Run initial check
        this.checkSLABreaches();
    }

    /**
     * Stop SLA monitoring job
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.isRunning = false;
            console.log('SLA Monitor stopped');
        }
    }

    /**
     * Check for SLA breaches
     */
    async checkSLABreaches() {
        console.log('[SLA Monitor] Checking for SLA breaches...');

        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // Check response SLA breaches
            const responseBreaches = await client.query(`
                UPDATE tickets
                SET sla_response_breached = true
                WHERE first_response_at IS NULL
                    AND sla_response_due < CURRENT_TIMESTAMP
                    AND sla_response_breached = false
                    AND status NOT IN ('resolved', 'closed')
                RETURNING *;
            `);

            // Check resolution SLA breaches
            const resolutionBreaches = await client.query(`
                UPDATE tickets
                SET sla_resolution_breached = true
                WHERE resolved_at IS NULL
                    AND sla_resolution_due < CURRENT_TIMESTAMP
                    AND sla_resolution_breached = false
                    AND status NOT IN ('resolved', 'closed')
                RETURNING *;
            `);

            await client.query('COMMIT');

            // Log breaches
            if (responseBreaches.rows.length > 0) {
                console.log(`[SLA Monitor] Found ${responseBreaches.rows.length} response SLA breaches`);

                for (const ticket of responseBreaches.rows) {
                    await AuditLogger.logSLABreach(ticket, 'response');
                    await this.handleSLABreach(ticket, 'response');
                }
            }

            if (resolutionBreaches.rows.length > 0) {
                console.log(`[SLA Monitor] Found ${resolutionBreaches.rows.length} resolution SLA breaches`);

                for (const ticket of resolutionBreaches.rows) {
                    await AuditLogger.logSLABreach(ticket, 'resolution');
                    await this.handleSLABreach(ticket, 'resolution');
                }
            }

            if (responseBreaches.rows.length === 0 && resolutionBreaches.rows.length === 0) {
                console.log('[SLA Monitor] No SLA breaches found');
            }

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[SLA Monitor] Error checking SLA breaches:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Handle SLA breach (trigger escalation, notifications, etc.)
     */
    async handleSLABreach(ticket, breachType) {
        console.log(`[SLA Monitor] Handling ${breachType} SLA breach for ticket ${ticket.ticket_number}`);

        // Check if auto-escalation is enabled for this ticket's category/priority
        const escalationRule = await this.getEscalationRule(ticket, breachType);

        if (escalationRule && escalationRule.is_active) {
            await this.escalateTicket(ticket, escalationRule);
        }

        // Send notifications (would integrate with email/SMS service)
        await this.sendSLABreachNotification(ticket, breachType);
    }

    /**
     * Get applicable escalation rule
     */
    async getEscalationRule(ticket, breachType) {
        const result = await db.query(`
            SELECT *
            FROM escalation_rules
            WHERE is_active = true
                AND condition_type = 'sla_breach'
                AND (
                    condition_value->>'breach_type' = $1
                    OR condition_value->>'breach_type' = 'any'
                )
            ORDER BY id
            LIMIT 1;
        `, [breachType]);

        return result.rows[0];
    }

    /**
     * Escalate ticket based on rule
     */
    async escalateTicket(ticket, rule) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            // Escalate the ticket
            const escalatedTicket = await client.query(`
                UPDATE tickets
                SET escalation_level = escalation_level + 1,
                    escalated_at = CURRENT_TIMESTAMP,
                    escalation_reason = $2,
                    status = 'escalated',
                    priority = CASE
                        WHEN $3 AND priority = 'low' THEN 'medium'
                        WHEN $3 AND priority = 'medium' THEN 'high'
                        WHEN $3 AND priority = 'high' THEN 'critical'
                        ELSE priority
                    END
                WHERE id = $1
                RETURNING *;
            `, [ticket.id, `Automatic escalation due to SLA breach`, rule.priority_increase || false]);

            // If rule specifies an agent to escalate to
            if (rule.escalate_to_agent_id) {
                await client.query(`
                    UPDATE tickets
                    SET assigned_agent_id = $1
                    WHERE id = $2;
                `, [rule.escalate_to_agent_id, ticket.id]);
            }

            await client.query('COMMIT');

            console.log(`[SLA Monitor] Escalated ticket ${ticket.ticket_number} to level ${escalatedTicket.rows[0].escalation_level}`);

            // Log the escalation
            await AuditLogger.logEscalation(
                escalatedTicket.rows[0],
                'Automatic escalation due to SLA breach',
                { agentId: null }
            );

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[SLA Monitor] Error escalating ticket:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Send SLA breach notification
     */
    async sendSLABreachNotification(ticket, breachType) {
        // In production, this would integrate with an email/SMS service
        console.log(`[SLA Monitor] NOTIFICATION: ${breachType} SLA breach for ticket ${ticket.ticket_number}`);
        console.log(`  Priority: ${ticket.priority}`);
        console.log(`  Assigned to: ${ticket.assigned_agent_id || 'Unassigned'}`);
        console.log(`  Created: ${ticket.created_at}`);

        // Log notification as audit entry
        await AuditLogger.log({
            ticketId: ticket.id,
            action: 'sla_breach_notification_sent',
            entityType: 'notification',
            description: `${breachType} SLA breach notification sent`
        });
    }

    /**
     * Get SLA statistics
     */
    async getSLAStatistics(period = '30 days') {
        const result = await db.query(`
            SELECT
                COUNT(*) as total_tickets,
                COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) as tickets_with_response,
                COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_tickets,
                COUNT(CASE WHEN sla_response_breached THEN 1 END) as response_breaches,
                COUNT(CASE WHEN sla_resolution_breached THEN 1 END) as resolution_breaches,
                ROUND(100.0 * COUNT(CASE WHEN NOT sla_response_breached AND first_response_at IS NOT NULL THEN 1 END) /
                    NULLIF(COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END), 0), 2) as response_compliance_rate,
                ROUND(100.0 * COUNT(CASE WHEN NOT sla_resolution_breached AND resolved_at IS NOT NULL THEN 1 END) /
                    NULLIF(COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END), 0), 2) as resolution_compliance_rate,
                ROUND(AVG(CASE
                    WHEN first_response_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (first_response_at - created_at))/60
                END), 2) as avg_response_time_minutes,
                ROUND(AVG(CASE
                    WHEN resolved_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (resolved_at - created_at))/60
                END), 2) as avg_resolution_time_minutes
            FROM tickets
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${period}';
        `);

        return result.rows[0];
    }

    /**
     * Get tickets at risk of SLA breach
     */
    async getTicketsAtRisk(thresholdMinutes = 60) {
        const result = await db.query(`
            SELECT
                t.*,
                u.email as customer_email,
                a.full_name as agent_name,
                a.email as agent_email,
                c.name as category_name,
                CASE
                    WHEN t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '${thresholdMinutes} minutes'
                        THEN 'response'
                    WHEN t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '${thresholdMinutes} minutes'
                        THEN 'resolution'
                END as at_risk_type,
                EXTRACT(EPOCH FROM (
                    CASE
                        WHEN t.first_response_at IS NULL THEN t.sla_response_due
                        ELSE t.sla_resolution_due
                    END - CURRENT_TIMESTAMP
                ))/60 as minutes_remaining
            FROM tickets t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.status NOT IN ('resolved', 'closed')
                AND (
                    (t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '${thresholdMinutes} minutes' AND t.sla_response_due > CURRENT_TIMESTAMP)
                    OR
                    (t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '${thresholdMinutes} minutes' AND t.sla_resolution_due > CURRENT_TIMESTAMP)
                )
            ORDER BY minutes_remaining ASC;
        `);

        return result.rows;
    }
}

module.exports = new SLAMonitor();
