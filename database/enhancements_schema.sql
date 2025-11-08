-- Enhanced schema additions for powerful features

-- Teams table for team-based routing
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members mapping
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'lead', 'manager')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Canned responses for quick replies
CREATE TABLE canned_responses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time tracking entries
CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    hours DECIMAL(10, 2) NOT NULL,
    billable BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom field definitions
CREATE TABLE custom_field_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_key VARCHAR(100) NOT NULL UNIQUE,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox')),
    options JSONB,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom field values
CREATE TABLE custom_field_values (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, field_id)
);

-- Workflows for automation
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('status_change', 'priority_change', 'time_based', 'assignment', 'escalation', 'sla_breach')),
    trigger_conditions JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    execution_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow execution log
CREATE TABLE workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks for external integrations
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    event_types TEXT[] NOT NULL,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 5000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook delivery log
CREATE TABLE webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    attempt_number INTEGER DEFAULT 1,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    email_on_assignment BOOLEAN DEFAULT true,
    email_on_comment BOOLEAN DEFAULT true,
    email_on_status_change BOOLEAN DEFAULT true,
    email_on_escalation BOOLEAN DEFAULT true,
    email_on_sla_breach BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Notifications table for in-app notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved searches/filters
CREATE TABLE saved_filters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    filter_criteria JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket watchers (users following tickets)
CREATE TABLE ticket_watchers (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, user_id)
);

-- Ticket tags for better organization
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_tags (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, tag_id)
);

-- Email templates
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA escalation rules
CREATE TABLE sla_escalation_rules (
    id SERIAL PRIMARY KEY,
    sla_policy_id INTEGER REFERENCES sla_policies(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL,
    time_threshold_hours INTEGER NOT NULL,
    escalate_to_role VARCHAR(50),
    escalate_to_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    notification_template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add team_id to tickets for team-based routing
ALTER TABLE tickets ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_teams_active ON teams(is_active);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_time_entries_ticket ON time_entries(ticket_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_custom_field_values_ticket ON custom_field_values(ticket_id);
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type, is_active);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_ticket_watchers_ticket ON ticket_watchers(ticket_id);
CREATE INDEX idx_ticket_tags_ticket ON ticket_tags(ticket_id);
CREATE INDEX idx_tickets_team ON tickets(team_id);

-- Full-text search index on tickets
CREATE INDEX idx_tickets_fulltext ON tickets USING gin(to_tsvector('english', subject || ' ' || description));

-- Insert default teams
INSERT INTO teams (name, description) VALUES
('Support Team', 'General customer support team'),
('Technical Team', 'Technical support and troubleshooting'),
('Billing Team', 'Billing and payment issues');

-- Insert default canned responses
INSERT INTO canned_responses (title, content, category) VALUES
('Welcome Message', 'Thank you for contacting support. We have received your ticket and will respond shortly.', 'General'),
('Request More Info', 'Thank you for your message. To better assist you, could you please provide more details about the issue?', 'General'),
('Issue Resolved', 'We are glad to inform you that your issue has been resolved. Please let us know if you need any further assistance.', 'Resolution'),
('Escalated', 'Your ticket has been escalated to our senior team. They will contact you within 24 hours.', 'Escalation');

-- Insert default email templates
INSERT INTO email_templates (name, subject, body, template_type) VALUES
('Ticket Created', 'Ticket {{ticket_number}} Created', 'Hello {{customer_name}},\n\nYour ticket #{{ticket_number}} has been created.\n\nSubject: {{subject}}\nPriority: {{priority}}\n\nWe will respond as soon as possible.\n\nBest regards,\nSupport Team', 'ticket_created'),
('Ticket Assigned', 'Ticket {{ticket_number}} Assigned to You', 'Hello {{agent_name}},\n\nTicket #{{ticket_number}} has been assigned to you.\n\nSubject: {{subject}}\nPriority: {{priority}}\nDue Date: {{due_date}}\n\nPlease review and respond.\n\nBest regards,\nSupport System', 'ticket_assigned'),
('SLA Breach Alert', 'SLA BREACH: Ticket {{ticket_number}}', 'ALERT: Ticket #{{ticket_number}} has breached SLA.\n\nSubject: {{subject}}\nPriority: {{priority}}\nAssigned to: {{agent_name}}\n\nImmediate action required.', 'sla_breach'),
('Ticket Escalated', 'Ticket {{ticket_number}} Escalated', 'Ticket #{{ticket_number}} has been escalated.\n\nReason: {{escalation_reason}}\nEscalation Level: {{level}}\n\nPlease review immediately.', 'ticket_escalated');
