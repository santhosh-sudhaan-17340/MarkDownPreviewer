-- Analytics Queries for Complaint Ticketing System

-- ============================================
-- 1. BACKLOG COUNTS
-- ============================================

-- Overall backlog count by status
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
    END;

-- Backlog by priority
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
    END;

-- Backlog by agent
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
ORDER BY assigned_tickets DESC;

-- Backlog by skill
SELECT
    s.name as skill_name,
    COUNT(t.id) as ticket_count,
    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600) as avg_wait_time_hours
FROM skills s
LEFT JOIN tickets t ON s.id = t.skill_id AND t.status NOT IN ('closed', 'resolved')
GROUP BY s.id, s.name
ORDER BY ticket_count DESC;

-- ============================================
-- 2. SLA BREACHES
-- ============================================

-- Current SLA breach summary
SELECT
    COUNT(*) as total_breached,
    COUNT(CASE WHEN status NOT IN ('closed', 'resolved') THEN 1 END) as active_breached,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_breached,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_breached
FROM tickets
WHERE is_sla_breached = true;

-- SLA breach details with ticket info
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
ORDER BY t.due_date ASC;

-- SLA breach rate by period
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN is_sla_breached = true THEN 1 END) as breached_tickets,
    ROUND(100.0 * COUNT(CASE WHEN is_sla_breached = true THEN 1 END) / COUNT(*), 2) as breach_rate_percent
FROM tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- SLA breach by agent
SELECT
    a.id as agent_id,
    a.full_name as agent_name,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.is_sla_breached = true THEN 1 END) as breached_tickets,
    ROUND(100.0 * COUNT(CASE WHEN t.is_sla_breached = true THEN 1 END) / NULLIF(COUNT(t.id), 0), 2) as breach_rate_percent
FROM users a
LEFT JOIN tickets t ON a.id = t.assigned_agent_id
WHERE a.role = 'agent' AND a.is_active = true
GROUP BY a.id, a.full_name
ORDER BY breach_rate_percent DESC;

-- Tickets at risk of SLA breach (approaching due date)
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
ORDER BY t.due_date ASC;

-- ============================================
-- 3. AGENT PRODUCTIVITY
-- ============================================

-- Agent performance summary
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
ORDER BY resolved_tickets DESC;

-- Agent productivity by time period (last 30 days)
SELECT
    a.id as agent_id,
    a.full_name as agent_name,
    COUNT(DISTINCT t.id) FILTER (WHERE t.created_at >= CURRENT_DATE - INTERVAL '7 days') as tickets_last_7_days,
    COUNT(DISTINCT t.id) FILTER (WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days') as tickets_last_30_days,
    COUNT(DISTINCT t.id) FILTER (WHERE t.resolved_at >= CURRENT_DATE - INTERVAL '7 days') as resolved_last_7_days,
    COUNT(DISTINCT t.id) FILTER (WHERE t.resolved_at >= CURRENT_DATE - INTERVAL '30 days') as resolved_last_30_days
FROM users a
LEFT JOIN tickets t ON a.id = t.assigned_agent_id
WHERE a.role = 'agent' AND a.is_active = true
GROUP BY a.id, a.full_name
ORDER BY resolved_last_30_days DESC;

-- Agent workload distribution
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
ORDER BY total_assigned DESC;

-- Agent activity log (recent actions)
SELECT
    u.full_name as agent_name,
    al.action,
    al.entity_type,
    al.created_at,
    t.ticket_number
FROM audit_logs al
JOIN users u ON al.user_id = u.id
LEFT JOIN tickets t ON al.ticket_id = t.id
WHERE u.role = 'agent' AND al.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 100;

-- Ticket resolution rate trends
SELECT
    DATE_TRUNC('day', resolved_at) as resolution_date,
    COUNT(*) as tickets_resolved,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time_hours,
    COUNT(CASE WHEN is_sla_breached = false THEN 1 END) as within_sla,
    COUNT(CASE WHEN is_sla_breached = true THEN 1 END) as breached_sla
FROM tickets
WHERE resolved_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', resolved_at)
ORDER BY resolution_date DESC;

-- ============================================
-- 4. ADDITIONAL ANALYTICS
-- ============================================

-- Tickets by category
SELECT
    category,
    COUNT(*) as ticket_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, CURRENT_TIMESTAMP) - created_at))/3600) as avg_handling_time_hours
FROM tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category
ORDER BY ticket_count DESC;

-- Escalation statistics
SELECT
    COUNT(DISTINCT ticket_id) as total_escalated_tickets,
    COUNT(*) as total_escalations,
    COUNT(CASE WHEN is_auto_escalated = true THEN 1 END) as auto_escalations,
    AVG(escalation_level) as avg_escalation_level
FROM ticket_escalations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Customer satisfaction proxy (tickets per customer)
SELECT
    u.id as customer_id,
    u.full_name as customer_name,
    u.email,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
    COUNT(CASE WHEN t.is_sla_breached = true THEN 1 END) as sla_breached_tickets,
    MAX(t.created_at) as last_ticket_date
FROM users u
LEFT JOIN tickets t ON u.id = t.customer_id
WHERE u.role = 'customer'
GROUP BY u.id, u.full_name, u.email
HAVING COUNT(t.id) > 0
ORDER BY total_tickets DESC
LIMIT 50;

-- Attachment statistics
SELECT
    COUNT(DISTINCT ticket_id) as tickets_with_attachments,
    COUNT(*) as total_attachments,
    SUM(file_size) as total_size_bytes,
    AVG(file_size) as avg_file_size_bytes,
    COUNT(DISTINCT file_type) as unique_file_types
FROM attachments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
