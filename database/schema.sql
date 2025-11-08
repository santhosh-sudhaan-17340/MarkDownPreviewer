-- Complaint Ticketing System with SLA Tracking
-- Database Schema

-- Users table (customers who raise tickets)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Skills table (for skill-based routing)
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table (support staff who handle tickets)
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    max_concurrent_tickets INTEGER DEFAULT 10,
    current_ticket_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Skills mapping (many-to-many)
CREATE TABLE IF NOT EXISTS agent_skills (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5) DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, skill_id)
);

-- Ticket Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    required_skill_id INTEGER REFERENCES skills(id),
    sla_response_minutes INTEGER DEFAULT 60,
    sla_resolution_minutes INTEGER DEFAULT 480,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id),
    assigned_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,

    -- Ticket details
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(50) CHECK (status IN ('new', 'open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated')) DEFAULT 'new',

    -- SLA tracking
    sla_response_due TIMESTAMP,
    sla_resolution_due TIMESTAMP,
    first_response_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    sla_response_breached BOOLEAN DEFAULT false,
    sla_resolution_breached BOOLEAN DEFAULT false,

    -- Escalation tracking
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP,
    escalation_reason TEXT,

    -- Metadata
    source VARCHAR(50) DEFAULT 'web', -- web, email, phone, chat
    tags TEXT[], -- Array of tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Status History (timeline)
CREATE TABLE IF NOT EXISTS ticket_status_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Comments/Updates
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs customer-visible
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attachments table with metadata
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES ticket_comments(id) ON DELETE CASCADE,
    uploaded_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- File metadata
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL, -- in bytes
    mime_type VARCHAR(100),
    file_extension VARCHAR(10),

    -- Additional metadata
    checksum VARCHAR(64), -- SHA-256 hash
    virus_scanned BOOLEAN DEFAULT false,
    is_safe BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log table (comprehensive tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Audit details
    action VARCHAR(100) NOT NULL, -- e.g., 'ticket_created', 'status_changed', 'assigned', etc.
    entity_type VARCHAR(50), -- e.g., 'ticket', 'comment', 'attachment'
    entity_id INTEGER,

    -- Change tracking
    old_value JSONB,
    new_value JSONB,

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Policies table
CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    -- SLA times in minutes
    response_time_minutes INTEGER NOT NULL,
    resolution_time_minutes INTEGER NOT NULL,

    -- Escalation rules
    escalation_enabled BOOLEAN DEFAULT true,
    escalation_threshold_minutes INTEGER,

    -- Applicability
    applies_to_priority VARCHAR(20)[],
    applies_to_category_ids INTEGER[],

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escalation Rules
CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50) NOT NULL, -- 'sla_breach', 'time_threshold', 'priority', 'no_response'
    condition_value JSONB,
    escalate_to_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    notification_emails TEXT[],
    priority_increase BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Productivity Metrics (pre-computed for performance)
CREATE TABLE IF NOT EXISTS agent_metrics (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Ticket counts
    tickets_assigned INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    tickets_closed INTEGER DEFAULT 0,

    -- Time metrics (in minutes)
    avg_response_time INTEGER,
    avg_resolution_time INTEGER,

    -- SLA metrics
    sla_breaches INTEGER DEFAULT 0,
    sla_compliance_rate DECIMAL(5,2),

    -- Quality metrics
    customer_satisfaction_score DECIMAL(3,2),
    reopened_tickets INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, metric_date)
);

-- Indexes for performance
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_assigned_agent_id ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_sla_response_due ON tickets(sla_response_due);
CREATE INDEX idx_tickets_sla_resolution_due ON tickets(sla_resolution_due);
CREATE INDEX idx_tickets_category_id ON tickets(category_id);

CREATE INDEX idx_audit_logs_ticket_id ON audit_logs(ticket_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

CREATE INDEX idx_ticket_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_attachments_ticket_id ON attachments(ticket_id);

CREATE INDEX idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX idx_agent_skills_skill_id ON agent_skills(skill_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
