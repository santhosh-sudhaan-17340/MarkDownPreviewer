-- Reporting Queries for Complaint Ticketing System

-- =====================================================
-- 1. BACKLOG QUERIES
-- =====================================================

-- Current backlog count (all open tickets)
-- Returns: Total count of tickets that are not resolved or closed
SELECT COUNT(*) as backlog_count
FROM tickets
WHERE status NOT IN ('resolved', 'closed');

-- Backlog by status
-- Returns: Count of tickets grouped by status
SELECT
    status,
    COUNT(*) as ticket_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM tickets
WHERE status NOT IN ('resolved', 'closed')
GROUP BY status
ORDER BY ticket_count DESC;

-- Backlog by priority
-- Returns: Count of open tickets grouped by priority
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

-- Backlog by category
-- Returns: Count of open tickets by category
SELECT
    c.name as category,
    COUNT(t.id) as ticket_count,
    AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at))/3600) as avg_age_hours
FROM tickets t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.status NOT IN ('resolved', 'closed')
GROUP BY c.name
ORDER BY ticket_count DESC;

-- Aging backlog (tickets older than X days)
-- Returns: Tickets grouped by age buckets
SELECT
    CASE
        WHEN age_days <= 1 THEN '0-1 days'
        WHEN age_days <= 3 THEN '1-3 days'
        WHEN age_days <= 7 THEN '3-7 days'
        WHEN age_days <= 14 THEN '7-14 days'
        WHEN age_days <= 30 THEN '14-30 days'
        ELSE '30+ days'
    END as age_bucket,
    COUNT(*) as ticket_count
FROM (
    SELECT
        id,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at)) as age_days
    FROM tickets
    WHERE status NOT IN ('resolved', 'closed')
) t
GROUP BY age_bucket
ORDER BY
    CASE age_bucket
        WHEN '0-1 days' THEN 1
        WHEN '1-3 days' THEN 2
        WHEN '3-7 days' THEN 3
        WHEN '7-14 days' THEN 4
        WHEN '14-30 days' THEN 5
        ELSE 6
    END;

-- Unassigned tickets backlog
-- Returns: Count of tickets not yet assigned to any agent
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

-- =====================================================
-- 2. SLA BREACH QUERIES
-- =====================================================

-- SLA response time breaches (current)
-- Returns: Tickets that have breached or are about to breach response SLA
SELECT
    t.id,
    t.ticket_number,
    t.subject,
    t.priority,
    t.created_at,
    t.sla_response_due,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_response_due))/60 as breach_minutes,
    t.sla_response_breached,
    u.email as customer_email,
    a.full_name as assigned_agent
FROM tickets t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.first_response_at IS NULL
    AND t.status NOT IN ('resolved', 'closed')
    AND (t.sla_response_breached = true OR CURRENT_TIMESTAMP > t.sla_response_due)
ORDER BY t.sla_response_due ASC;

-- SLA resolution time breaches (current)
-- Returns: Tickets that have breached or are about to breach resolution SLA
SELECT
    t.id,
    t.ticket_number,
    t.subject,
    t.priority,
    t.status,
    t.created_at,
    t.sla_resolution_due,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.sla_resolution_due))/60 as breach_minutes,
    t.sla_resolution_breached,
    u.email as customer_email,
    a.full_name as assigned_agent
FROM tickets t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.resolved_at IS NULL
    AND t.status NOT IN ('resolved', 'closed')
    AND (t.sla_resolution_breached = true OR CURRENT_TIMESTAMP > t.sla_resolution_due)
ORDER BY t.sla_resolution_due ASC;

-- SLA breach summary by period
-- Returns: Daily SLA breach statistics for last 30 days
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

-- SLA breach by category
-- Returns: SLA performance by ticket category
SELECT
    c.name as category,
    COUNT(t.id) as total_tickets,
    SUM(CASE WHEN t.sla_response_breached THEN 1 ELSE 0 END) as response_breaches,
    SUM(CASE WHEN t.sla_resolution_breached THEN 1 ELSE 0 END) as resolution_breaches,
    ROUND(100.0 * SUM(CASE WHEN NOT t.sla_response_breached THEN 1 ELSE 0 END) / COUNT(t.id), 2) as response_compliance_rate,
    ROUND(100.0 * SUM(CASE WHEN NOT t.sla_resolution_breached THEN 1 ELSE 0 END) / COUNT(t.id), 2) as resolution_compliance_rate
FROM tickets t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.name
ORDER BY total_tickets DESC;

-- Tickets at risk of SLA breach (within next hour)
-- Returns: Tickets that will breach SLA soon
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
    a.full_name as assigned_agent,
    a.email as agent_email
FROM tickets t
LEFT JOIN agents a ON t.assigned_agent_id = a.id
WHERE t.status NOT IN ('resolved', 'closed')
    AND (
        (t.first_response_at IS NULL AND t.sla_response_due < CURRENT_TIMESTAMP + INTERVAL '1 hour' AND t.sla_response_due > CURRENT_TIMESTAMP)
        OR
        (t.resolved_at IS NULL AND t.sla_resolution_due < CURRENT_TIMESTAMP + INTERVAL '1 hour' AND t.sla_resolution_due > CURRENT_TIMESTAMP)
    )
ORDER BY due_at ASC;

-- =====================================================
-- 3. AGENT PRODUCTIVITY QUERIES
-- =====================================================

-- Overall agent productivity
-- Returns: Comprehensive productivity metrics per agent
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
    AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE a.is_active = true
GROUP BY a.id, a.full_name, a.email
ORDER BY resolved_tickets DESC;

-- Agent workload distribution
-- Returns: Current ticket distribution across agents
SELECT
    a.id,
    a.full_name,
    a.current_ticket_count,
    a.max_concurrent_tickets,
    ROUND(100.0 * a.current_ticket_count / a.max_concurrent_tickets, 2) as capacity_utilization,
    COUNT(CASE WHEN t.status = 'new' THEN 1 END) as new_tickets,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tickets,
    COUNT(CASE WHEN t.priority = 'critical' THEN 1 END) as critical_tickets,
    COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_tickets
FROM agents a
LEFT JOIN tickets t ON a.id = t.assigned_agent_id
    AND t.status NOT IN ('resolved', 'closed')
WHERE a.is_active = true
GROUP BY a.id, a.full_name, a.current_ticket_count, a.max_concurrent_tickets
ORDER BY capacity_utilization DESC;

-- Agent performance by priority
-- Returns: How agents handle different priority tickets
SELECT
    a.full_name,
    t.priority,
    COUNT(t.id) as ticket_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, CURRENT_TIMESTAMP) - t.created_at))/3600), 2) as avg_handle_time_hours,
    COUNT(CASE WHEN t.sla_resolution_breached THEN 1 END) as sla_breaches,
    ROUND(100.0 * COUNT(CASE WHEN NOT t.sla_resolution_breached THEN 1 END) / COUNT(t.id), 2) as sla_compliance_rate
FROM agents a
JOIN tickets t ON a.id = t.assigned_agent_id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.full_name, t.priority
ORDER BY a.full_name,
    CASE t.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END;

-- Top performing agents (by SLA compliance)
-- Returns: Agents ranked by SLA compliance
SELECT
    a.id,
    a.full_name,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
    ROUND(100.0 * COUNT(CASE WHEN NOT t.sla_resolution_breached AND t.resolved_at IS NOT NULL THEN 1 END) /
        NULLIF(COUNT(CASE WHEN t.resolved_at IS NOT NULL THEN 1 END), 0), 2) as sla_compliance_rate,
    ROUND(AVG(CASE
        WHEN t.resolved_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600
    END), 2) as avg_resolution_hours
FROM agents a
JOIN tickets t ON a.id = t.assigned_agent_id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND a.is_active = true
GROUP BY a.id, a.full_name
HAVING COUNT(t.id) >= 5  -- Minimum 5 tickets for meaningful stats
ORDER BY sla_compliance_rate DESC, avg_resolution_hours ASC
LIMIT 10;

-- Agent activity timeline (tickets handled per day)
-- Returns: Daily ticket resolution count per agent
SELECT
    a.full_name,
    DATE(t.resolved_at) as date,
    COUNT(t.id) as tickets_resolved,
    AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) as avg_resolution_hours
FROM agents a
JOIN tickets t ON a.id = t.assigned_agent_id
WHERE t.resolved_at >= CURRENT_DATE - INTERVAL '30 days'
    AND t.resolved_at IS NOT NULL
GROUP BY a.full_name, DATE(t.resolved_at)
ORDER BY date DESC, tickets_resolved DESC;

-- Agent skill utilization
-- Returns: How often agent skills are being used
SELECT
    s.name as skill,
    COUNT(DISTINCT a.id) as agents_with_skill,
    COUNT(t.id) as tickets_handled,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, CURRENT_TIMESTAMP) - t.created_at))/3600), 2) as avg_resolution_hours,
    COUNT(CASE WHEN t.sla_resolution_breached THEN 1 END) as sla_breaches
FROM skills s
JOIN agent_skills ask ON s.id = ask.skill_id
JOIN agents a ON ask.agent_id = a.id
LEFT JOIN categories c ON c.required_skill_id = s.id
LEFT JOIN tickets t ON t.category_id = c.id AND t.assigned_agent_id = a.id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days' OR t.created_at IS NULL
GROUP BY s.name
ORDER BY tickets_handled DESC;

-- =====================================================
-- 4. ADDITIONAL ANALYTICS QUERIES
-- =====================================================

-- Escalation statistics
-- Returns: Escalation metrics
SELECT
    escalation_level,
    COUNT(*) as ticket_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (escalated_at - created_at))/3600), 2) as avg_time_to_escalation_hours,
    COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status NOT IN ('resolved', 'closed') THEN 1 END) as still_open
FROM tickets
WHERE escalation_level > 0
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY escalation_level
ORDER BY escalation_level;

-- Ticket volume trends
-- Returns: Ticket creation trends over time
SELECT
    DATE(created_at) as date,
    COUNT(*) as tickets_created,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_count,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_count
FROM tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Customer ticket history
-- Returns: Most active customers
SELECT
    u.id,
    u.full_name,
    u.email,
    COUNT(t.id) as total_tickets,
    COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
    COUNT(CASE WHEN t.status NOT IN ('resolved', 'closed') THEN 1 END) as open_tickets,
    MAX(t.created_at) as last_ticket_date
FROM users u
JOIN tickets t ON u.id = t.user_id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.full_name, u.email
ORDER BY total_tickets DESC
LIMIT 20;

-- Response time distribution
-- Returns: Distribution of first response times
SELECT
    CASE
        WHEN response_minutes <= 15 THEN '0-15 min'
        WHEN response_minutes <= 30 THEN '15-30 min'
        WHEN response_minutes <= 60 THEN '30-60 min'
        WHEN response_minutes <= 120 THEN '1-2 hours'
        WHEN response_minutes <= 240 THEN '2-4 hours'
        ELSE '4+ hours'
    END as response_time_bucket,
    COUNT(*) as ticket_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM (
    SELECT
        EXTRACT(EPOCH FROM (first_response_at - created_at))/60 as response_minutes
    FROM tickets
    WHERE first_response_at IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
) t
GROUP BY response_time_bucket
ORDER BY
    CASE response_time_bucket
        WHEN '0-15 min' THEN 1
        WHEN '15-30 min' THEN 2
        WHEN '30-60 min' THEN 3
        WHEN '1-2 hours' THEN 4
        WHEN '2-4 hours' THEN 5
        ELSE 6
    END;

-- Attachment statistics
-- Returns: File attachment metrics
SELECT
    DATE(a.created_at) as date,
    COUNT(a.id) as total_attachments,
    COUNT(DISTINCT a.ticket_id) as tickets_with_attachments,
    ROUND(SUM(a.file_size)::numeric / 1048576, 2) as total_size_mb,
    ROUND(AVG(a.file_size)::numeric / 1024, 2) as avg_size_kb,
    COUNT(CASE WHEN a.mime_type LIKE 'image/%' THEN 1 END) as images,
    COUNT(CASE WHEN a.mime_type LIKE 'application/pdf' THEN 1 END) as pdfs,
    COUNT(CASE WHEN a.mime_type LIKE 'application/%' AND a.mime_type NOT LIKE 'application/pdf' THEN 1 END) as documents
FROM attachments a
WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(a.created_at)
ORDER BY date DESC;
