const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const SLAMonitor = require('../services/SLAMonitor');
const AttachmentHandler = require('../services/AttachmentHandler');

class ReportingController {
    /**
     * Get backlog report
     */
    async getBacklog(req, res) {
        try {
            // Total backlog
            const totalResult = await db.query(`
                SELECT COUNT(*) as backlog_count
                FROM tickets
                WHERE status NOT IN ('resolved', 'closed');
            `);

            // By status
            const byStatusResult = await db.query(`
                SELECT
                    status,
                    COUNT(*) as ticket_count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
                FROM tickets
                WHERE status NOT IN ('resolved', 'closed')
                GROUP BY status
                ORDER BY ticket_count DESC;
            `);

            // By priority
            const byPriorityResult = await db.query(`
                SELECT
                    priority,
                    COUNT(*) as ticket_count,
                    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/3600) as avg_age_hours
                FROM tickets
                WHERE status NOT IN ('resolved', 'closed')
                GROUP BY priority
                ORDER BY
                    CASE priority
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END;
            `);

            // By category
            const byCategoryResult = await db.query(`
                SELECT
                    c.name as category,
                    COUNT(t.id) as ticket_count,
                    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600) as avg_age_hours
                FROM tickets t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.status NOT IN ('resolved', 'closed')
                GROUP BY c.name
                ORDER BY ticket_count DESC;
            `);

            // Unassigned
            const unassignedResult = await db.query(`
                SELECT
                    priority,
                    COUNT(*) as unassigned_count,
                    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/60) as avg_wait_minutes
                FROM tickets
                WHERE assigned_agent_id IS NULL
                    AND status NOT IN ('resolved', 'closed')
                GROUP BY priority
                ORDER BY
                    CASE priority
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END;
            `);

            res.json({
                success: true,
                data: {
                    total: totalResult.rows[0],
                    byStatus: byStatusResult.rows,
                    byPriority: byPriorityResult.rows,
                    byCategory: byCategoryResult.rows,
                    unassigned: unassignedResult.rows
                }
            });

        } catch (error) {
            console.error('Error generating backlog report:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get SLA breach report
     */
    async getSLABreaches(req, res) {
        try {
            // Current response breaches
            const responseBreachesResult = await db.query(`
                SELECT
                    t.id,
                    t.ticket_number,
                    t.subject,
                    t.priority,
                    t.created_at,
                    t.sla_response_due,
                    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_response_due))/60 as breach_minutes,
                    u.email as customer_email,
                    a.full_name as assigned_agent
                FROM tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN agents a ON t.assigned_agent_id = a.id
                WHERE t.first_response_at IS NULL
                    AND t.status NOT IN ('resolved', 'closed')
                    AND (t.sla_response_breached = true OR CURRENT_TIMESTAMP > t.sla_response_due)
                ORDER BY t.sla_response_due ASC
                LIMIT 50;
            `);

            // Current resolution breaches
            const resolutionBreachesResult = await db.query(`
                SELECT
                    t.id,
                    t.ticket_number,
                    t.subject,
                    t.priority,
                    t.status,
                    t.created_at,
                    t.sla_resolution_due,
                    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_resolution_due))/60 as breach_minutes,
                    u.email as customer_email,
                    a.full_name as assigned_agent
                FROM tickets t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN agents a ON t.assigned_agent_id = a.id
                WHERE t.resolved_at IS NULL
                    AND t.status NOT IN ('resolved', 'closed')
                    AND (t.sla_resolution_breached = true OR CURRENT_TIMESTAMP > t.sla_resolution_due)
                ORDER BY t.sla_resolution_due ASC
                LIMIT 50;
            `);

            // SLA summary
            const summaryResult = await db.query(`
                SELECT
                    DATE(created_at) as date,
                    COUNT(*) as total_tickets,
                    SUM(CASE WHEN sla_response_breached THEN 1 ELSE 0 END) as response_breaches,
                    SUM(CASE WHEN sla_resolution_breached THEN 1 ELSE 0 END) as resolution_breaches,
                    ROUND(100.0 * SUM(CASE WHEN NOT sla_response_breached THEN 1 ELSE 0 END) / COUNT(*), 2) as response_compliance_rate,
                    ROUND(100.0 * SUM(CASE WHEN NOT sla_resolution_breached THEN 1 ELSE 0 END) / COUNT(*), 2) as resolution_compliance_rate
                FROM tickets
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                    AND status IN ('resolved', 'closed')
                GROUP BY DATE(created_at)
                ORDER BY date DESC;
            `);

            // At risk tickets
            const atRiskResult = await db.query(`
                SELECT
                    t.id,
                    t.ticket_number,
                    t.subject,
                    t.priority,
                    t.status,
                    CASE
                        WHEN t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '1 hour'
                            THEN 'Response SLA at risk'
                        WHEN t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '1 hour'
                            THEN 'Resolution SLA at risk'
                    END as at_risk_type,
                    COALESCE(t.sla_response_due, t.sla_resolution_due) as due_at,
                    EXTRACT(EPOCH FROM (COALESCE(t.sla_response_due, t.sla_resolution_due) - CURRENT_TIMESTAMP))/60 as minutes_remaining,
                    a.full_name as assigned_agent
                FROM tickets t
                LEFT JOIN agents a ON t.assigned_agent_id = a.id
                WHERE t.status NOT IN ('resolved', 'closed')
                    AND (
                        (t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '1 hour' AND t.sla_response_due > CURRENT_TIMESTAMP)
                        OR
                        (t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '1 hour' AND t.sla_resolution_due > CURRENT_TIMESTAMP)
                    )
                ORDER BY due_at ASC;
            `);

            res.json({
                success: true,
                data: {
                    responseBreaches: responseBreachesResult.rows,
                    resolutionBreaches: resolutionBreachesResult.rows,
                    summary: summaryResult.rows,
                    atRisk: atRiskResult.rows
                }
            });

        } catch (error) {
            console.error('Error generating SLA breach report:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get agent productivity report
     */
    async getAgentProductivity(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;

            // Overall productivity
            const productivityResult = await db.query(`
                SELECT
                    a.id,
                    a.full_name,
                    a.email,
                    COUNT(t.id) as total_assigned,
                    COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
                    COUNT(CASE WHEN t.status NOT IN ('resolved', 'closed') THEN 1 END) as active_tickets,
                    ROUND(AVG(CASE
                        WHEN t.first_response_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (t.first_response_at - t.created_at))/60
                    END), 2) as avg_response_time_minutes,
                    ROUND(AVG(CASE
                        WHEN t.resolved_at IS NOT NULL
                        THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/60
                    END), 2) as avg_resolution_time_minutes,
                    COUNT(CASE WHEN t.sla_response_breached THEN 1 END) as response_breaches,
                    COUNT(CASE WHEN t.sla_resolution_breached THEN 1 END) as resolution_breaches,
                    ROUND(100.0 * COUNT(CASE WHEN NOT t.sla_response_breached AND t.first_response_at IS NOT NULL THEN 1 END) /
                        NULLIF(COUNT(CASE WHEN t.first_response_at IS NOT NULL THEN 1 END), 0), 2) as response_compliance_rate,
                    ROUND(100.0 * COUNT(CASE WHEN NOT t.sla_resolution_breached AND t.resolved_at IS NOT NULL THEN 1 END) /
                        NULLIF(COUNT(CASE WHEN t.resolved_at IS NOT NULL THEN 1 END), 0), 2) as resolution_compliance_rate
                FROM agents a
                LEFT JOIN tickets t ON a.id = t.assigned_agent_id
                    AND t.created_at >= CURRENT_DATE - INTERVAL '${days} days'
                WHERE a.is_active = true
                GROUP BY a.id, a.full_name, a.email
                ORDER BY resolved_tickets DESC;
            `);

            // Workload distribution
            const workloadResult = await db.query(`
                SELECT
                    a.id,
                    a.full_name,
                    a.current_ticket_count,
                    a.max_concurrent_tickets,
                    ROUND(100.0 * a.current_ticket_count / a.max_concurrent_tickets, 2) as capacity_utilization,
                    COUNT(CASE WHEN t.status = 'new' THEN 1 END) as new_tickets,
                    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
                    COUNT(CASE WHEN t.priority = 'critical' THEN 1 END) as critical_tickets
                FROM agents a
                LEFT JOIN tickets t ON a.id = t.assigned_agent_id
                    AND t.status NOT IN ('resolved', 'closed')
                WHERE a.is_active = true
                GROUP BY a.id, a.full_name, a.current_ticket_count, a.max_concurrent_tickets
                ORDER BY capacity_utilization DESC;
            `);

            res.json({
                success: true,
                data: {
                    productivity: productivityResult.rows,
                    workload: workloadResult.rows
                }
            });

        } catch (error) {
            console.error('Error generating agent productivity report:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get SLA statistics
     */
    async getSLAStatistics(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const stats = await SLAMonitor.getSLAStatistics(`${days} days`);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error getting SLA statistics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get attachment statistics
     */
    async getAttachmentStats(req, res) {
        try {
            const ticketId = req.query.ticketId;
            const stats = await AttachmentHandler.getAttachmentStats(ticketId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error getting attachment statistics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get dashboard summary
     */
    async getDashboard(req, res) {
        try {
            // Total tickets by status
            const statusResult = await db.query(`
                SELECT status, COUNT(*) as count
                FROM tickets
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY status;
            `);

            // Today's statistics
            const todayResult = await db.query(`
                SELECT
                    COUNT(*) as created_today,
                    COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_today,
                    COUNT(CASE WHEN sla_response_breached THEN 1 END) as response_breaches_today,
                    COUNT(CASE WHEN sla_resolution_breached THEN 1 END) as resolution_breaches_today
                FROM tickets
                WHERE created_at >= CURRENT_DATE;
            `);

            // Current backlog
            const backlogResult = await db.query(`
                SELECT COUNT(*) as backlog
                FROM tickets
                WHERE status NOT IN ('resolved', 'closed');
            `);

            // Agent availability
            const agentResult = await db.query(`
                SELECT
                    COUNT(*) as total_agents,
                    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_agents,
                    AVG(current_ticket_count) as avg_tickets_per_agent,
                    AVG(CAST(current_ticket_count AS FLOAT) / CAST(max_concurrent_tickets AS FLOAT) * 100) as avg_capacity
                FROM agents;
            `);

            res.json({
                success: true,
                data: {
                    ticketsByStatus: statusResult.rows,
                    today: todayResult.rows[0],
                    backlog: backlogResult.rows[0],
                    agents: agentResult.rows[0]
                }
            });

        } catch (error) {
            console.error('Error generating dashboard:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new ReportingController();
