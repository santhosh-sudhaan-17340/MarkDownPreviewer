-- Complaint Ticketing System with SLA Tracking Database Schema

-- Users table (customers and agents)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'agent', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table for skill-based routing
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User skills mapping (agents can have multiple skills)
CREATE TABLE user_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);

-- SLA policies
CREATE TABLE sla_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    response_time_hours INTEGER NOT NULL,
    resolution_time_hours INTEGER NOT NULL,
    escalation_time_hours INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed', 'escalated')),
    category VARCHAR(100),
    customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    skill_id INTEGER REFERENCES skills(id) ON DELETE SET NULL,
    sla_policy_id INTEGER REFERENCES sla_policies(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_response_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    due_date TIMESTAMP,
    escalated_at TIMESTAMP,
    is_sla_breached BOOLEAN DEFAULT false,
    sla_breach_reason TEXT
);

-- Ticket status history (timeline)
CREATE TABLE ticket_status_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket assignments history
CREATE TABLE ticket_assignments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assignment_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket escalations
CREATE TABLE ticket_escalations (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    escalated_from INTEGER REFERENCES users(id) ON DELETE SET NULL,
    escalated_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    escalation_reason TEXT NOT NULL,
    escalation_level INTEGER DEFAULT 1,
    is_auto_escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attachments table
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    checksum VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments
CREATE TABLE ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created ON tickets(created_at);
CREATE INDEX idx_tickets_sla_breach ON tickets(is_sla_breached);
CREATE INDEX idx_tickets_skill ON tickets(skill_id);
CREATE INDEX idx_audit_logs_ticket ON audit_logs(ticket_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_ticket_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX idx_attachments_ticket ON attachments(ticket_id);

-- Insert default SLA policies
INSERT INTO sla_policies (name, priority, response_time_hours, resolution_time_hours, escalation_time_hours) VALUES
('Critical SLA', 'critical', 1, 4, 2),
('High Priority SLA', 'high', 4, 24, 8),
('Medium Priority SLA', 'medium', 8, 72, 24),
('Low Priority SLA', 'low', 24, 168, 48);

-- Insert default skills
INSERT INTO skills (name, description) VALUES
('Technical Support', 'General technical support and troubleshooting'),
('Billing', 'Billing and payment related issues'),
('Account Management', 'Account setup, changes, and management'),
('Product Support', 'Product-specific questions and issues'),
('Network Issues', 'Network connectivity and configuration'),
('Security', 'Security-related concerns and incidents');
