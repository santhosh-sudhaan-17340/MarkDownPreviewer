-- Complaint Ticketing System Database Schema

-- Users table (both customers and agents)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent skills table
CREATE TABLE IF NOT EXISTS agent_skills (
    id SERIAL PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent-Skill mapping table
CREATE TABLE IF NOT EXISTS agent_skill_mapping (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, skill_id)
);

-- Ticket categories table
CREATE TABLE IF NOT EXISTS ticket_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    required_skill_id INTEGER REFERENCES agent_skills(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES users(id),
    assigned_agent_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES ticket_categories(id),
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'escalated')),
    sla_due_date TIMESTAMP NOT NULL,
    sla_breached BOOLEAN DEFAULT false,
    sla_breach_time TIMESTAMP,
    escalation_level INTEGER DEFAULT 0,
    escalated_to_agent_id INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket status history table
CREATE TABLE IF NOT EXISTS ticket_status_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id INTEGER REFERENCES users(id),
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket assignments history table
CREATE TABLE IF NOT EXISTS ticket_assignment_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_from_agent_id INTEGER REFERENCES users(id),
    assigned_to_agent_id INTEGER NOT NULL REFERENCES users(id),
    assignment_reason TEXT,
    assigned_by_user_id INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments/updates table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table for all operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by_user_id INTEGER REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA escalation rules table
CREATE TABLE IF NOT EXISTS sla_escalation_rules (
    id SERIAL PRIMARY KEY,
    priority VARCHAR(50) NOT NULL UNIQUE CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    response_time_minutes INTEGER NOT NULL,
    resolution_time_minutes INTEGER NOT NULL,
    escalation_level_1_minutes INTEGER NOT NULL,
    escalation_level_2_minutes INTEGER,
    escalation_level_3_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket SLA tracking table
CREATE TABLE IF NOT EXISTS ticket_sla_tracking (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    first_response_at TIMESTAMP,
    first_response_sla_met BOOLEAN,
    resolution_sla_met BOOLEAN,
    total_response_time_minutes INTEGER,
    total_resolution_time_minutes INTEGER,
    business_hours_response_time_minutes INTEGER,
    business_hours_resolution_time_minutes INTEGER,
    escalation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_agent_id ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_sla_due_date ON tickets(sla_due_date);
CREATE INDEX idx_tickets_sla_breached ON tickets(sla_breached);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_ticket_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_ticket_sla_tracking_ticket_id ON ticket_sla_tracking(ticket_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_escalation_rules_updated_at BEFORE UPDATE ON sla_escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_sla_tracking_updated_at BEFORE UPDATE ON ticket_sla_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default SLA escalation rules
INSERT INTO sla_escalation_rules (priority, response_time_minutes, resolution_time_minutes, escalation_level_1_minutes, escalation_level_2_minutes, escalation_level_3_minutes)
VALUES
    ('low', 1440, 4320, 3000, 3600, 4000),        -- 1 day response, 3 days resolution
    ('medium', 480, 2880, 1800, 2400, 2700),      -- 8 hours response, 2 days resolution
    ('high', 240, 1440, 900, 1200, 1350),         -- 4 hours response, 1 day resolution
    ('critical', 60, 480, 300, 400, 450)          -- 1 hour response, 8 hours resolution
ON CONFLICT (priority) DO NOTHING;

-- Insert sample skills
INSERT INTO agent_skills (skill_name, description)
VALUES
    ('Technical Support', 'Handle technical issues and troubleshooting'),
    ('Billing & Payments', 'Handle billing, payment, and refund related issues'),
    ('Product Knowledge', 'General product knowledge and usage guidance'),
    ('Account Management', 'Handle account-related queries and updates'),
    ('Escalations', 'Handle escalated and complex issues'),
    ('VIP Support', 'Support for VIP and premium customers')
ON CONFLICT (skill_name) DO NOTHING;
