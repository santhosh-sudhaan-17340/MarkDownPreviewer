const sequelize = require('../config/database');
const { Ticket, User, SlaPolicy, Skill } = require('../models');
const SlaService = require('../services/slaService');
const { Op } = require('sequelize');

class AnalyticsController {

  // Get backlog counts
  static async getBacklog(req, res) {
    try {
      // Overall backlog by status
      const backlogByStatus = await sequelize.query(`
        SELECT
          status,
          COUNT(*) as ticket_count,
          COUNT(CASE WHEN is_sla_breached = true THEN 1 END) as breached_count
        FROM tickets
        WHERE status NOT IN ('closed', 'resolved')
        GROUP BY status
        ORDER BY
          CASE status
            WHEN 'escalated' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'assigned' THEN 3
            WHEN 'open' THEN 4
            WHEN 'pending' THEN 5
          END
      `, { type: sequelize.QueryTypes.SELECT });

      // Backlog by priority
      const backlogByPriority = await sequelize.query(`
        SELECT
          priority,
          COUNT(*) as ticket_count,
          AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/3600) as avg_age_hours
        FROM tickets
        WHERE status NOT IN ('closed', 'resolved')
        GROUP BY priority
        ORDER BY
          CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END
      `, { type: sequelize.QueryTypes.SELECT });

      // Backlog by agent
      const backlogByAgent = await sequelize.query(`
        SELECT
          u.id as agent_id,
          u.full_name as agent_name,
          COUNT(t.id) as assigned_tickets,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN t.is_sla_breached = true THEN 1 END) as sla_breached
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_agent_id AND t.status NOT IN ('closed', 'resolved')
        WHERE u.role = 'agent' AND u.is_active = true
        GROUP BY u.id, u.full_name
        ORDER BY assigned_tickets DESC
      `, { type: sequelize.QueryTypes.SELECT });

      res.json({
        byStatus: backlogByStatus,
        byPriority: backlogByPriority,
        byAgent: backlogByAgent
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get SLA breach statistics
  static async getSlaBreaches(req, res) {
    try {
      // Current SLA breach summary
      const breachSummary = await sequelize.query(`
        SELECT
          COUNT(*) as total_breached,
          COUNT(CASE WHEN status NOT IN ('closed', 'resolved') THEN 1 END) as active_breached,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_breached,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_breached
        FROM tickets
        WHERE is_sla_breached = true
      `, { type: sequelize.QueryTypes.SELECT });

      // SLA breach details
      const breachDetails = await sequelize.query(`
        SELECT
          t.ticket_number,
          t.subject,
          t.priority,
          t.status,
          u.full_name as customer_name,
          a.full_name as assigned_agent,
          t.created_at,
          t.due_date,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.due_date))/3600 as hours_overdue,
          t.sla_breach_reason
        FROM tickets t
        LEFT JOIN users u ON t.customer_id = u.id
        LEFT JOIN users a ON t.assigned_agent_id = a.id
        WHERE t.is_sla_breached = true AND t.status NOT IN ('closed', 'resolved')
        ORDER BY t.due_date ASC
        LIMIT 50
      `, { type: sequelize.QueryTypes.SELECT });

      // SLA breach rate by period (last 30 days)
      const breachRateTrend = await sequelize.query(`
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN is_sla_breached = true THEN 1 END) as breached_tickets,
          ROUND(100.0 * COUNT(CASE WHEN is_sla_breached = true THEN 1 END) / COUNT(*), 2) as breach_rate_percent
        FROM tickets
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `, { type: sequelize.QueryTypes.SELECT });

      // Tickets at risk
      const atRisk = await sequelize.query(`
        SELECT
          t.ticket_number,
          t.subject,
          t.priority,
          t.status,
          a.full_name as assigned_agent,
          t.due_date,
          EXTRACT(EPOCH FROM (t.due_date - CURRENT_TIMESTAMP))/3600 as hours_until_breach
        FROM tickets t
        LEFT JOIN users a ON t.assigned_agent_id = a.id
        WHERE
          t.status NOT IN ('closed', 'resolved')
          AND t.is_sla_breached = false
          AND t.due_date IS NOT NULL
          AND t.due_date <= CURRENT_TIMESTAMP + INTERVAL '4 hours'
        ORDER BY t.due_date ASC
        LIMIT 20
      `, { type: sequelize.QueryTypes.SELECT });

      res.json({
        summary: breachSummary[0],
        breachDetails,
        trendData: breachRateTrend,
        atRisk
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get agent productivity statistics
  static async getAgentProductivity(req, res) {
    try {
      const productivity = await sequelize.query(`
        SELECT
          a.id as agent_id,
          a.full_name as agent_name,
          COUNT(DISTINCT t.id) as total_tickets_handled,
          COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END) as resolved_tickets,
          COUNT(DISTINCT CASE WHEN t.status NOT IN ('resolved', 'closed') THEN t.id END) as active_tickets,
          AVG(CASE
            WHEN t.resolved_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600
          END) as avg_resolution_time_hours,
          AVG(CASE
            WHEN t.first_response_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (t.first_response_at - t.created_at))/3600
          END) as avg_first_response_time_hours,
          COUNT(DISTINCT CASE WHEN t.is_sla_breached = true THEN t.id END) as sla_breaches,
          ROUND(100.0 * COUNT(DISTINCT CASE WHEN t.is_sla_breached = false AND t.status IN ('resolved', 'closed') THEN t.id END) /
            NULLIF(COUNT(DISTINCT CASE WHEN t.status IN ('resolved', 'closed') THEN t.id END), 0), 2) as sla_compliance_rate
        FROM users a
        LEFT JOIN tickets t ON a.id = t.assigned_agent_id
        WHERE a.role = 'agent' AND a.is_active = true
        GROUP BY a.id, a.full_name
        ORDER BY resolved_tickets DESC
      `, { type: sequelize.QueryTypes.SELECT });

      // Agent workload distribution
      const workload = await sequelize.query(`
        SELECT
          a.id as agent_id,
          a.full_name as agent_name,
          COUNT(t.id) FILTER (WHERE t.priority = 'critical') as critical_tickets,
          COUNT(t.id) FILTER (WHERE t.priority = 'high') as high_tickets,
          COUNT(t.id) FILTER (WHERE t.priority = 'medium') as medium_tickets,
          COUNT(t.id) FILTER (WHERE t.priority = 'low') as low_tickets,
          COUNT(t.id) as total_assigned
        FROM users a
        LEFT JOIN tickets t ON a.id = t.assigned_agent_id AND t.status NOT IN ('closed', 'resolved')
        WHERE a.role = 'agent' AND a.is_active = true
        GROUP BY a.id, a.full_name
        ORDER BY total_assigned DESC
      `, { type: sequelize.QueryTypes.SELECT });

      res.json({
        productivity,
        workload
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get dashboard statistics
  static async getDashboard(req, res) {
    try {
      const totalTickets = await Ticket.count();
      const openTickets = await Ticket.count({
        where: { status: { [Op.in]: ['open', 'assigned', 'in_progress', 'pending', 'escalated'] } }
      });
      const closedToday = await Ticket.count({
        where: {
          status: 'closed',
          closed_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });
      const slaBreached = await Ticket.count({
        where: {
          is_sla_breached: true,
          status: { [Op.notIn]: ['closed', 'resolved'] }
        }
      });

      // Tickets by priority
      const byPriority = await Ticket.findAll({
        attributes: [
          'priority',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          status: { [Op.notIn]: ['closed', 'resolved'] }
        },
        group: ['priority']
      });

      // Recent tickets
      const recentTickets = await Ticket.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [
          { model: User, as: 'customer', attributes: ['id', 'full_name'] },
          { model: User, as: 'assignedAgent', attributes: ['id', 'full_name'] }
        ]
      });

      res.json({
        summary: {
          totalTickets,
          openTickets,
          closedToday,
          slaBreached
        },
        byPriority,
        recentTickets
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get ticket trends
  static async getTicketTrends(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;

      const trends = await sequelize.query(`
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as total_created,
          COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as total_resolved,
          AVG(CASE
            WHEN resolved_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (resolved_at - created_at))/3600
          END) as avg_resolution_hours
        FROM tickets
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `, { type: sequelize.QueryTypes.SELECT });

      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AnalyticsController;
