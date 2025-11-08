const { query } = require('../database/connection');

class Reports {
  // Get backlog count by status
  static async getBacklogCounts() {
    const query_text = `
      SELECT
        status,
        priority,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600) as avg_age_hours,
        MIN(created_at) as oldest_ticket_date,
        MAX(created_at) as newest_ticket_date
      FROM tickets
      WHERE status NOT IN ('resolved', 'closed')
      GROUP BY status, priority
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        status
    `;

    const result = await query(query_text, []);
    return result.rows;
  }

  // Get detailed backlog summary
  static async getBacklogSummary() {
    const query_text = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_tickets,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated_tickets,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as total_backlog,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed') AND priority = 'critical') as critical_backlog,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed') AND priority = 'high') as high_backlog,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed') AND sla_breached = true) as breached_backlog,
        AVG(
          CASE WHEN status NOT IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600
          END
        ) as avg_backlog_age_hours
      FROM tickets
    `;

    const result = await query(query_text, []);
    return result.rows[0];
  }

  // Get SLA breach report
  static async getSLABreaches(startDate = null, endDate = null) {
    let query_text = `
      SELECT
        t.id,
        t.ticket_number,
        t.subject,
        t.priority,
        t.status,
        t.created_at,
        t.sla_due_date,
        t.sla_breach_time,
        t.escalation_level,
        EXTRACT(EPOCH FROM (t.sla_breach_time - t.created_at)) / 60 as time_to_breach_minutes,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_due_date)) / 60 as breach_duration_minutes,
        u_customer.full_name as customer_name,
        u_agent.full_name as agent_name,
        tc.category_name,
        ts.escalation_count,
        ts.first_response_at,
        ts.first_response_sla_met
      FROM tickets t
      LEFT JOIN users u_customer ON t.customer_id = u_customer.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN ticket_sla_tracking ts ON t.id = ts.ticket_id
      WHERE t.sla_breached = true
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query_text += ` AND t.sla_breach_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query_text += ` AND t.sla_breach_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query_text += ' ORDER BY t.sla_breach_time DESC';

    const result = await query(query_text, params);
    return result.rows;
  }

  // Get SLA breach statistics
  static async getSLABreachStatistics(period = 'month') {
    const dateFormat = period === 'day' ? 'YYYY-MM-DD' :
                      period === 'week' ? 'YYYY-IW' :
                      'YYYY-MM';

    const query_text = `
      SELECT
        to_char(sla_breach_time, $1) as period,
        priority,
        COUNT(*) as breach_count,
        AVG(EXTRACT(EPOCH FROM (sla_breach_time - created_at)) / 60) as avg_time_to_breach_minutes,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as breaches_resolved,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as breaches_open
      FROM tickets
      WHERE sla_breached = true
        AND sla_breach_time >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY period, priority
      ORDER BY period DESC, priority
    `;

    const result = await query(query_text, [dateFormat]);
    return result.rows;
  }

  // Get agent productivity report
  static async getAgentProductivity(agentId = null, startDate = null, endDate = null) {
    let query_text = `
      SELECT
        u.id as agent_id,
        u.full_name as agent_name,
        u.email as agent_email,
        COUNT(DISTINCT t.id) as total_tickets_handled,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) as tickets_resolved,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as tickets_active,
        COUNT(DISTINCT t.id) FILTER (WHERE t.sla_breached = false AND t.status IN ('resolved', 'closed')) as tickets_within_sla,
        COUNT(DISTINCT t.id) FILTER (WHERE t.sla_breached = true) as tickets_breached_sla,
        AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
          END
        ) as avg_resolution_time_minutes,
        AVG(
          CASE WHEN ts.first_response_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ts.first_response_at - t.created_at)) / 60
          END
        ) as avg_first_response_time_minutes,
        COUNT(DISTINCT t.id) FILTER (
          WHERE t.status IN ('resolved', 'closed')
          AND t.resolved_at >= CURRENT_DATE
        ) as tickets_resolved_today,
        COUNT(DISTINCT t.id) FILTER (
          WHERE t.status IN ('resolved', 'closed')
          AND t.resolved_at >= date_trunc('week', CURRENT_DATE)
        ) as tickets_resolved_this_week,
        COUNT(DISTINCT t.id) FILTER (
          WHERE t.status IN ('resolved', 'closed')
          AND t.resolved_at >= date_trunc('month', CURRENT_DATE)
        ) as tickets_resolved_this_month,
        ROUND(
          (COUNT(DISTINCT t.id) FILTER (WHERE t.sla_breached = false AND t.status IN ('resolved', 'closed'))::numeric /
          NULLIF(COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('resolved', 'closed')), 0)) * 100,
          2
        ) as sla_compliance_percentage
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_agent_id
      LEFT JOIN ticket_sla_tracking ts ON t.id = ts.ticket_id
      WHERE u.role = 'agent' AND u.is_active = true
    `;

    const params = [];
    let paramCount = 1;

    if (agentId) {
      query_text += ` AND u.id = $${paramCount}`;
      params.push(agentId);
      paramCount++;
    }

    if (startDate) {
      query_text += ` AND t.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query_text += ` AND t.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query_text += `
      GROUP BY u.id, u.full_name, u.email
      ORDER BY tickets_resolved DESC, avg_resolution_time_minutes ASC
    `;

    const result = await query(query_text, params);
    return result.rows;
  }

  // Get agent workload distribution
  static async getAgentWorkload() {
    const query_text = `
      SELECT
        u.id as agent_id,
        u.full_name as agent_name,
        COUNT(t.id) FILTER (WHERE t.status = 'assigned') as assigned_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'on_hold') as on_hold_count,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as total_active,
        COUNT(t.id) FILTER (WHERE t.priority = 'critical' AND t.status NOT IN ('resolved', 'closed')) as critical_tickets,
        COUNT(t.id) FILTER (WHERE t.priority = 'high' AND t.status NOT IN ('resolved', 'closed')) as high_tickets,
        COUNT(t.id) FILTER (WHERE t.sla_breached = true AND t.status NOT IN ('resolved', 'closed')) as breached_tickets,
        AVG(
          CASE WHEN t.status NOT IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at)) / 3600
          END
        ) as avg_ticket_age_hours
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_agent_id
      WHERE u.role = 'agent' AND u.is_active = true
      GROUP BY u.id, u.full_name
      ORDER BY total_active DESC
    `;

    const result = await query(query_text, []);
    return result.rows;
  }

  // Get tickets by category
  static async getTicketsByCategory(startDate = null, endDate = null) {
    let query_text = `
      SELECT
        tc.category_name,
        tc.description as category_description,
        COUNT(t.id) as total_tickets,
        COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) as resolved_tickets,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved', 'closed')) as active_tickets,
        COUNT(t.id) FILTER (WHERE t.sla_breached = true) as breached_tickets,
        AVG(
          CASE WHEN t.status IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60
          END
        ) as avg_resolution_time_minutes,
        ROUND(
          (COUNT(t.id) FILTER (WHERE t.sla_breached = false AND t.status IN ('resolved', 'closed'))::numeric /
          NULLIF(COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')), 0)) * 100,
          2
        ) as sla_compliance_percentage
      FROM ticket_categories tc
      LEFT JOIN tickets t ON tc.id = t.category_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query_text += ` AND t.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query_text += ` AND t.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query_text += `
      GROUP BY tc.id, tc.category_name, tc.description
      ORDER BY total_tickets DESC
    `;

    const result = await query(query_text, params);
    return result.rows;
  }

  // Get trending issues (most common subjects/descriptions)
  static async getTrendingIssues(limit = 10) {
    const query_text = `
      SELECT
        subject,
        COUNT(*) as occurrence_count,
        MAX(created_at) as last_occurrence,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) as active_count,
        AVG(
          CASE WHEN status IN ('resolved', 'closed')
          THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60
          END
        ) as avg_resolution_time_minutes
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY subject
      HAVING COUNT(*) > 1
      ORDER BY occurrence_count DESC
      LIMIT $1
    `;

    const result = await query(query_text, [limit]);
    return result.rows;
  }

  // Get daily ticket volume
  static async getDailyTicketVolume(days = 30) {
    const query_text = `
      SELECT
        date_trunc('day', created_at)::date as date,
        COUNT(*) as tickets_created,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND resolved_at::date = created_at::date) as same_day_resolved,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_tickets,
        COUNT(*) FILTER (WHERE priority = 'high') as high_tickets
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
      GROUP BY date
      ORDER BY date DESC
    `;

    const result = await query(query_text, [days]);
    return result.rows;
  }

  // Get resolution time distribution
  static async getResolutionTimeDistribution() {
    const query_text = `
      SELECT
        priority,
        COUNT(*) as total_resolved,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_resolution_minutes,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as median_resolution_minutes,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as p90_resolution_minutes,
        MIN(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as min_resolution_minutes,
        MAX(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as max_resolution_minutes
      FROM tickets
      WHERE status IN ('resolved', 'closed')
        AND resolved_at IS NOT NULL
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;

    const result = await query(query_text, []);
    return result.rows;
  }
}

module.exports = Reports;
