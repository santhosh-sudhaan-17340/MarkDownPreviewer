# Complaint Ticketing System - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Ticket Management API](#ticket-management-api)
4. [Reporting API](#reporting-api)
5. [Database Schema](#database-schema)
6. [SLA Tracking](#sla-tracking)
7. [Skill-Based Routing](#skill-based-routing)
8. [Audit Logging](#audit-logging)

---

## Overview

This is a comprehensive Complaint Ticketing System with:
- ✅ Complete ticket lifecycle management
- ✅ SLA (Service Level Agreement) tracking with automatic breach detection
- ✅ Skill-based ticket routing to optimize agent assignment
- ✅ Comprehensive audit logging for all actions
- ✅ Attachment handling with metadata and security
- ✅ Status timeline tracking
- ✅ Detailed reporting (backlog, SLA breaches, agent productivity)
- ✅ Automatic escalation on SLA breaches

---

## Getting Started

### Prerequisites
- Node.js 14+
- PostgreSQL 12+

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migration
npm run migrate

# Seed demo data (optional)
npm run seed

# Start the server
npm start

# For development with auto-reload
npm run dev
```

### Environment Variables

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_system
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3000
NODE_ENV=development

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

DEFAULT_SLA_RESPONSE_TIME=60
DEFAULT_SLA_RESOLUTION_TIME=480
SLA_CHECK_INTERVAL=5
```

---

## Ticket Management API

### Base URL
```
http://localhost:3000/api/tickets
```

### 1. Create Ticket

**POST** `/api/tickets`

Create a new support ticket with automatic SLA calculation and optional auto-assignment.

**Request Body:**
```json
{
  "userId": 1,
  "categoryId": 2,
  "subject": "Cannot access my account",
  "description": "I've been trying to log in but keep getting an error message",
  "priority": "high",
  "source": "web",
  "tags": ["login", "authentication"],
  "autoAssign": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "ticket_number": "TKT-1699564800000-A3B5C7D9",
    "user_id": 1,
    "category_id": 2,
    "assigned_agent_id": 3,
    "subject": "Cannot access my account",
    "description": "I've been trying to log in...",
    "priority": "high",
    "status": "open",
    "sla_response_due": "2024-01-15T14:30:00.000Z",
    "sla_resolution_due": "2024-01-15T18:00:00.000Z",
    "created_at": "2024-01-15T14:00:00.000Z"
  }
}
```

**Priority Levels:**
- `critical` - Highest priority
- `high` - High priority
- `medium` - Default priority
- `low` - Lowest priority

### 2. Get Tickets

**GET** `/api/tickets`

Retrieve tickets with optional filters.

**Query Parameters:**
- `status` - Filter by status (new, open, in_progress, pending, resolved, closed, escalated)
- `priority` - Filter by priority (critical, high, medium, low)
- `assignedAgentId` - Filter by assigned agent (use 'null' for unassigned)
- `userId` - Filter by customer
- `categoryId` - Filter by category
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)
- `orderBy` - Sort field (default: created_at)
- `orderDir` - Sort direction (ASC/DESC, default: DESC)

**Example:**
```
GET /api/tickets?status=open&priority=high&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "ticket_number": "TKT-1699564800000-A3B5C7D9",
      "subject": "Cannot access my account",
      "priority": "high",
      "status": "open",
      "customer_name": "John Doe",
      "agent_name": "Jane Smith",
      "category_name": "Account Help",
      "created_at": "2024-01-15T14:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 3. Get Single Ticket

**GET** `/api/tickets/:identifier`

Get detailed ticket information by ID or ticket number.

**Examples:**
```
GET /api/tickets/42
GET /api/tickets/TKT-1699564800000-A3B5C7D9
```

**Response includes:**
- All ticket fields
- Customer information
- Assigned agent details
- Category information
- Age in hours
- Remaining time until SLA breach

### 4. Update Ticket

**PATCH** `/api/tickets/:id`

Update ticket fields.

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "critical",
  "tags": ["urgent", "vip"],
  "changedByAgentId": 3,
  "statusComment": "Escalating to senior team"
}
```

**Updatable Fields:**
- `status`
- `priority`
- `subject`
- `description`
- `assigned_agent_id`
- `escalation_level`
- `tags`

### 5. Assign Ticket

**POST** `/api/tickets/:id/assign`

Manually assign ticket to an agent.

**Request Body:**
```json
{
  "agentId": 5,
  "assignedBy": 3
}
```

### 6. Add Comment

**POST** `/api/tickets/:id/comments`

Add a comment or update to the ticket.

**Request Body:**
```json
{
  "comment": "I've reset your password and sent you an email",
  "agentId": 3,
  "isInternal": false
}
```

**Fields:**
- `comment` (required) - Comment text
- `agentId` - Agent who wrote the comment
- `userId` - User who wrote the comment
- `isInternal` - Whether comment is internal note (default: false)

### 7. Get Comments

**GET** `/api/tickets/:id/comments`

Retrieve all comments for a ticket.

### 8. Get Status History

**GET** `/api/tickets/:id/history`

Get complete status change timeline for a ticket.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "ticket_id": 42,
      "old_status": "new",
      "new_status": "open",
      "changed_by_agent_name": "Jane Smith",
      "comment": "Ticket assigned and investigation started",
      "created_at": "2024-01-15T14:05:00.000Z"
    },
    {
      "id": 11,
      "ticket_id": 42,
      "old_status": "open",
      "new_status": "in_progress",
      "changed_by_agent_name": "Jane Smith",
      "created_at": "2024-01-15T14:30:00.000Z"
    }
  ]
}
```

### 9. Resolve Ticket

**POST** `/api/tickets/:id/resolve`

Mark ticket as resolved.

**Request Body:**
```json
{
  "resolvedBy": 3,
  "resolution": "Password reset completed. User can now access their account."
}
```

### 10. Close Ticket

**POST** `/api/tickets/:id/close`

Close a resolved ticket.

### 11. Escalate Ticket

**POST** `/api/tickets/:id/escalate`

Manually escalate ticket (also happens automatically on SLA breach).

**Request Body:**
```json
{
  "reason": "Customer VIP - requires immediate attention",
  "escalatedBy": 3
}
```

### 12. Get Routing Suggestions

**GET** `/api/tickets/:id/routing-suggestions?limit=5`

Get AI-powered agent suggestions based on skills, workload, and performance.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "full_name": "Jane Smith",
      "email": "jane.smith@support.com",
      "proficiency_level": 5,
      "workload_ratio": 0.40,
      "score": 142.5,
      "recommendation_reason": "High skill proficiency (Level 5), Low current workload, No recent SLA breaches"
    }
  ]
}
```

### 13. Get Audit Trail

**GET** `/api/tickets/:id/audit`

Get complete audit log for a ticket.

**Response includes:**
- All actions performed on the ticket
- Who performed each action
- Timestamp of each action
- Before/after values for changes
- IP address and user agent

### 14. Upload Attachment

**POST** `/api/tickets/:id/attachments`

Upload a file attachment.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file`
- Additional fields: `agentId` or `userId`

**Supported file types:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, Word, Excel, Text, CSV
- Archives: ZIP

**Max file size:** 10MB (configurable)

### 15. Get Attachments

**GET** `/api/tickets/:id/attachments`

Get all attachments for a ticket with metadata.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "ticket_id": 42,
      "filename": "uuid-generated-name.png",
      "original_filename": "screenshot.png",
      "file_size": 245678,
      "mime_type": "image/png",
      "checksum": "sha256hash...",
      "uploaded_by_agent_name": "Jane Smith",
      "created_at": "2024-01-15T14:35:00.000Z"
    }
  ]
}
```

---

## Reporting API

### Base URL
```
http://localhost:3000/api/reports
```

### 1. Dashboard Summary

**GET** `/api/reports/dashboard`

Get high-level dashboard metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketsByStatus": [
      { "status": "open", "count": 45 },
      { "status": "in_progress", "count": 32 }
    ],
    "today": {
      "created_today": 28,
      "resolved_today": 22,
      "response_breaches_today": 2,
      "resolution_breaches_today": 1
    },
    "backlog": { "backlog": 156 },
    "agents": {
      "total_agents": 15,
      "active_agents": 12,
      "avg_tickets_per_agent": 10.5,
      "avg_capacity": 70.2
    }
  }
}
```

### 2. Backlog Report

**GET** `/api/reports/backlog`

Detailed backlog analysis.

**Response includes:**
- Total backlog count
- Breakdown by status
- Breakdown by priority with age
- Breakdown by category
- Unassigned tickets by priority

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total": { "backlog_count": 156 },
    "byStatus": [
      { "status": "open", "ticket_count": 65, "percentage": 41.67 },
      { "status": "in_progress", "ticket_count": 58, "percentage": 37.18 }
    ],
    "byPriority": [
      { "priority": "critical", "ticket_count": 8, "avg_age_hours": 2.5 },
      { "priority": "high", "ticket_count": 42, "avg_age_hours": 12.3 }
    ],
    "byCategory": [...],
    "unassigned": [
      { "priority": "critical", "unassigned_count": 3, "avg_wait_minutes": 15.2 }
    ]
  }
}
```

### 3. SLA Breach Report

**GET** `/api/reports/sla-breaches`

Current SLA breaches and at-risk tickets.

**Response includes:**
- Current response SLA breaches
- Current resolution SLA breaches
- Historical SLA summary (30 days)
- Tickets at risk of breach (within 1 hour)

**Example:**
```json
{
  "success": true,
  "data": {
    "responseBreaches": [
      {
        "ticket_number": "TKT-...",
        "subject": "...",
        "priority": "high",
        "breach_minutes": 45.3,
        "assigned_agent": "John Doe"
      }
    ],
    "resolutionBreaches": [...],
    "summary": [
      {
        "date": "2024-01-15",
        "total_tickets": 85,
        "response_breaches": 4,
        "resolution_breaches": 7,
        "response_compliance_rate": 95.29,
        "resolution_compliance_rate": 91.76
      }
    ],
    "atRisk": [...]
  }
}
```

### 4. Agent Productivity Report

**GET** `/api/reports/agent-productivity?days=30`

Comprehensive agent performance metrics.

**Query Parameters:**
- `days` - Time period (default: 30)

**Response includes:**
- Tickets assigned and resolved per agent
- Average response and resolution times
- SLA compliance rates
- Current workload distribution

**Example:**
```json
{
  "success": true,
  "data": {
    "productivity": [
      {
        "id": 3,
        "full_name": "Jane Smith",
        "email": "jane.smith@support.com",
        "total_assigned": 145,
        "resolved_tickets": 132,
        "active_tickets": 13,
        "avg_response_time_minutes": 18.5,
        "avg_resolution_time_minutes": 245.3,
        "response_breaches": 2,
        "resolution_breaches": 5,
        "response_compliance_rate": 98.62,
        "resolution_compliance_rate": 96.21
      }
    ],
    "workload": [
      {
        "id": 3,
        "full_name": "Jane Smith",
        "current_ticket_count": 13,
        "max_concurrent_tickets": 15,
        "capacity_utilization": 86.67,
        "critical_tickets": 2
      }
    ]
  }
}
```

### 5. SLA Statistics

**GET** `/api/reports/sla-statistics?days=30`

Overall SLA performance statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tickets": 850,
    "tickets_with_response": 842,
    "resolved_tickets": 785,
    "response_breaches": 23,
    "resolution_breaches": 45,
    "response_compliance_rate": 97.27,
    "resolution_compliance_rate": 94.27,
    "avg_response_time_minutes": 22.5,
    "avg_resolution_time_minutes": 315.8
  }
}
```

### 6. Attachment Statistics

**GET** `/api/reports/attachment-stats?ticketId=42`

File attachment statistics.

**Query Parameters:**
- `ticketId` - Optional, for specific ticket stats

---

## Database Schema

### Core Tables

#### tickets
Primary ticket table with all ticket information and SLA tracking fields.

**Key Fields:**
- `id` - Primary key
- `ticket_number` - Unique ticket identifier (TKT-...)
- `user_id` - Customer who created ticket
- `category_id` - Ticket category
- `assigned_agent_id` - Assigned support agent
- `subject` - Ticket subject
- `description` - Detailed description
- `priority` - critical/high/medium/low
- `status` - new/open/in_progress/pending/resolved/closed/escalated
- `sla_response_due` - When first response is due
- `sla_resolution_due` - When resolution is due
- `first_response_at` - Timestamp of first agent response
- `resolved_at` - When ticket was resolved
- `sla_response_breached` - Boolean flag
- `sla_resolution_breached` - Boolean flag
- `escalation_level` - Current escalation level
- `tags` - Array of tags

#### audit_logs
Comprehensive audit trail of all actions.

**Logged Actions:**
- `ticket_created`
- `status_changed`
- `ticket_assigned`
- `comment_added`
- `attachment_uploaded`
- `ticket_escalated`
- `sla_breached`

**Fields:**
- `action` - Action type
- `old_value` - Previous state (JSONB)
- `new_value` - New state (JSONB)
- `ip_address` - Client IP
- `user_agent` - Client user agent
- `description` - Human-readable description

#### ticket_status_history
Timeline of all status changes.

#### attachments
File attachments with metadata.

**Metadata:**
- Original and stored filenames
- File size and MIME type
- SHA-256 checksum
- Virus scan status
- Upload timestamp and uploader

#### skills & agent_skills
Skill definitions and agent skill mappings for routing.

#### categories
Ticket categories with required skills and SLA policies.

#### sla_policies
SLA policy definitions with escalation rules.

---

## SLA Tracking

### How It Works

1. **Automatic SLA Calculation**
   - When a ticket is created, SLA due times are calculated based on category
   - Response SLA: Time until first agent response required
   - Resolution SLA: Time until ticket must be resolved

2. **Continuous Monitoring**
   - Background job checks for SLA breaches every 5 minutes (configurable)
   - Automatically marks tickets as breached when SLA times pass
   - Creates audit log entries for all breaches

3. **Automatic Escalation**
   - Tickets can auto-escalate on SLA breach (if rules configured)
   - Priority can be automatically increased
   - Tickets can be re-assigned to senior agents

4. **Reporting**
   - Real-time breach detection
   - Historical compliance tracking
   - At-risk ticket identification

### SLA Configuration

In `.env`:
```
DEFAULT_SLA_RESPONSE_TIME=60      # Minutes
DEFAULT_SLA_RESOLUTION_TIME=480   # Minutes
SLA_CHECK_INTERVAL=5              # How often to check for breaches
```

Per-category SLA times are defined in the `categories` table.

---

## Skill-Based Routing

### Features

1. **Automatic Agent Selection**
   - Analyzes ticket category to determine required skill
   - Finds agents with matching skills
   - Scores agents based on:
     - Skill proficiency level (1-5)
     - Current workload
     - Recent SLA performance
     - Average resolution time

2. **Scoring Algorithm**
   ```
   Score = Base (100)
         + Skill Proficiency (0-25 points)
         + Low Workload Bonus (0-30 points)
         + Performance Bonus (0-25 points)
         + Speed Bonus (0-20 points)
   ```

3. **Manual Override**
   - Get routing suggestions via API
   - See recommendation reasons
   - Manually assign to any agent

4. **Load Balancing**
   - Respects agent maximum ticket limits
   - Distributes work evenly
   - Considers agent availability

### Example Routing Suggestion
```json
{
  "agent": "Jane Smith",
  "score": 165.5,
  "reason": "High skill proficiency (Level 5), Low current workload, No recent SLA breaches, Fast average resolution time",
  "workload": "6 / 15 tickets (40%)",
  "sla_compliance": "98.5%"
}
```

---

## Audit Logging

### What Gets Logged

Every significant action is logged with:
- Who performed the action (agent or user)
- What changed (before/after values)
- When it happened
- Where it came from (IP address, user agent)
- Why (optional description)

### Logged Events
- Ticket creation
- Status changes
- Assignments and re-assignments
- Comments (with visibility flag)
- Attachments
- Escalations
- SLA breaches
- Priority changes
- Resolution/closure

### Query Audit Logs

```
GET /api/tickets/:id/audit
```

Returns complete audit trail for a ticket with all actions, timestamps, and actors.

### Use Cases
- Compliance and regulatory requirements
- Troubleshooting ticket history
- Performance analysis
- Security auditing
- Customer dispute resolution

---

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## SQL Query Examples

The system includes pre-written SQL queries in `database/queries.sql` for:

1. **Backlog Analysis**
   - Current backlog count
   - Backlog by status/priority/category
   - Aging analysis
   - Unassigned tickets

2. **SLA Breach Analysis**
   - Current breaches
   - Historical breach rates
   - At-risk tickets
   - Compliance rates by category

3. **Agent Productivity**
   - Overall productivity metrics
   - Workload distribution
   - Performance by priority
   - Top performers
   - Daily activity

4. **Additional Analytics**
   - Escalation statistics
   - Ticket volume trends
   - Customer ticket history
   - Response time distribution
   - Attachment statistics

All these queries can be run directly in PostgreSQL or integrated into custom reports.

---

## Best Practices

### Creating Tickets
- Always specify accurate category for proper SLA and routing
- Use priority appropriately (reserve 'critical' for true emergencies)
- Add relevant tags for better searchability
- Enable auto-assign for faster response times

### Managing Tickets
- Respond to new tickets promptly to meet response SLA
- Add internal notes for team visibility
- Update status regularly to reflect actual progress
- Resolve tickets before closing them

### Using Reports
- Check dashboard daily for overview
- Monitor SLA breach report to prevent violations
- Review agent productivity weekly
- Use backlog report to identify bottlenecks

### Performance Tips
- Use pagination for large result sets
- Filter queries appropriately
- Index custom search fields if needed
- Archive old closed tickets periodically

---

## Support

For issues or questions about this API, please contact the development team or file an issue in the repository.
