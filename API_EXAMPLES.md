# Complaint Ticketing System - API Examples

This document provides detailed examples of how to use the Complaint Ticketing System API.

## Base URL

```
http://localhost:3000
```

## Table of Contents

1. [Tickets API](#tickets-api)
2. [Users & Agents API](#users--agents-api)
3. [Reports API](#reports-api)
4. [Attachments API](#attachments-api)
5. [Common Response Formats](#common-response-formats)

---

## Tickets API

### Create a New Ticket

**Endpoint:** `POST /api/tickets`

**Request Body:**
```json
{
  "customer_id": 1,
  "category_id": 2,
  "subject": "Unable to access my account",
  "description": "I've been trying to log in for the past hour but keep getting an error message saying 'Invalid credentials' even though I'm using the correct password.",
  "priority": "high",
  "auto_assign": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "id": 42,
    "ticket_number": "TKT-12345678-123",
    "customer_id": 1,
    "assigned_agent_id": 5,
    "category_id": 2,
    "subject": "Unable to access my account",
    "description": "I've been trying to log in...",
    "priority": "high",
    "status": "assigned",
    "sla_due_date": "2025-11-09T02:30:00.000Z",
    "sla_breached": false,
    "created_at": "2025-11-08T14:30:00.000Z"
  }
}
```

### Get All Tickets

**Endpoint:** `GET /api/tickets`

**Query Parameters:**
- `status` - Filter by status (new, assigned, in_progress, on_hold, resolved, closed, escalated)
- `priority` - Filter by priority (low, medium, high, critical)
- `assigned_agent_id` - Filter by assigned agent
- `customer_id` - Filter by customer
- `sla_breached` - Filter by SLA breach status (true/false)
- `limit` - Limit number of results (default: 100)

**Example Request:**
```bash
GET /api/tickets?status=in_progress&priority=high&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 42,
      "ticket_number": "TKT-12345678-123",
      "customer_name": "John Doe",
      "agent_name": "Jane Smith",
      "category_name": "Technical Support",
      "subject": "Unable to access my account",
      "priority": "high",
      "status": "in_progress",
      "sla_due_date": "2025-11-09T02:30:00.000Z",
      "sla_breached": false,
      "created_at": "2025-11-08T14:30:00.000Z"
    }
  ]
}
```

### Get Ticket by ID

**Endpoint:** `GET /api/tickets/:id`

**Example Request:**
```bash
GET /api/tickets/42
```

### Update Ticket Status

**Endpoint:** `PUT /api/tickets/:id/status`

**Request Body:**
```json
{
  "status": "resolved",
  "user_id": 5,
  "reason": "Issue resolved by resetting password",
  "resolution_notes": "Sent password reset email. Customer confirmed they can now log in successfully."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket status updated successfully",
  "data": {
    "id": 42,
    "status": "resolved",
    "resolved_at": "2025-11-08T16:45:00.000Z"
  }
}
```

### Assign Ticket to Agent

**Endpoint:** `PUT /api/tickets/:id/assign`

**Request Body:**
```json
{
  "agent_id": 8,
  "user_id": 3,
  "reason": "Original agent on leave, reassigning to available technical support specialist"
}
```

### Add Comment to Ticket

**Endpoint:** `POST /api/tickets/:id/comments`

**Request Body:**
```json
{
  "user_id": 5,
  "comment_text": "I've investigated the issue. It appears the user's account was temporarily locked due to multiple failed login attempts. I've unlocked it and sent a password reset link.",
  "is_internal": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": 123,
    "ticket_id": 42,
    "user_id": 5,
    "comment_text": "I've investigated the issue...",
    "is_internal": false,
    "created_at": "2025-11-08T15:20:00.000Z"
  }
}
```

### Get Ticket Timeline

**Endpoint:** `GET /api/tickets/:id/timeline`

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "event_type": "status_change",
      "old_status": "in_progress",
      "new_status": "resolved",
      "details": "Issue resolved by resetting password",
      "user_id": 5,
      "event_time": "2025-11-08T16:45:00.000Z"
    },
    {
      "event_type": "comment",
      "new_status": "public",
      "details": "I've investigated the issue...",
      "user_id": 5,
      "event_time": "2025-11-08T15:20:00.000Z"
    },
    {
      "event_type": "assignment",
      "old_status": null,
      "new_status": "5",
      "details": "Auto-assigned based on skill match and workload balancing",
      "user_id": null,
      "event_time": "2025-11-08T14:30:00.000Z"
    }
  ]
}
```

---

## Users & Agents API

### Create a New User

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "username": "jsmith",
  "email": "jane.smith@example.com",
  "full_name": "Jane Smith",
  "role": "agent",
  "is_active": true
}
```

### Get All Users

**Endpoint:** `GET /api/users`

**Query Parameters:**
- `role` - Filter by role (customer, agent, admin)

**Example Request:**
```bash
GET /api/users?role=agent
```

### Get All Agents

**Endpoint:** `GET /api/users/agents`

### Get Agent with Skills

**Endpoint:** `GET /api/users/:id/agent-details`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "jsmith",
    "email": "jane.smith@example.com",
    "full_name": "Jane Smith",
    "role": "agent",
    "is_active": true,
    "skills": [
      {
        "skill_id": 1,
        "skill_name": "Technical Support",
        "proficiency_level": "expert"
      },
      {
        "skill_id": 4,
        "skill_name": "Account Management",
        "proficiency_level": "intermediate"
      }
    ]
  }
}
```

### Assign Skills to Agent

**Endpoint:** `PUT /api/users/:id/skills`

**Request Body:**
```json
{
  "skills": [
    {
      "skill_id": 1,
      "proficiency_level": "expert"
    },
    {
      "skill_id": 2,
      "proficiency_level": "intermediate"
    },
    {
      "skill_id": 5,
      "proficiency_level": "expert"
    }
  ]
}
```

### Get Agent Statistics

**Endpoint:** `GET /api/users/:id/statistics`

**Response:**
```json
{
  "success": true,
  "data": {
    "assigned_tickets": "3",
    "in_progress_tickets": "5",
    "on_hold_tickets": "1",
    "resolved_tickets": "127",
    "closed_tickets": "120",
    "sla_breached_tickets": "8",
    "avg_resolution_time_minutes": "245.67",
    "tickets_resolved_today": "4",
    "tickets_resolved_this_week": "18"
  }
}
```

### Find Agents by Skill

**Endpoint:** `GET /api/users/skills/:skillId/agents`

**Query Parameters:**
- `proficiency_level` - Filter by proficiency (beginner, intermediate, expert)

**Example Request:**
```bash
GET /api/users/skills/1/agents?proficiency_level=expert
```

---

## Reports API

### Get Backlog Summary

**Endpoint:** `GET /api/reports/backlog/summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "new_tickets": "15",
    "assigned_tickets": "23",
    "in_progress_tickets": "42",
    "on_hold_tickets": "8",
    "escalated_tickets": "5",
    "total_backlog": "93",
    "critical_backlog": "7",
    "high_backlog": "18",
    "breached_backlog": "12",
    "avg_backlog_age_hours": "38.5"
  }
}
```

### Get Backlog Counts

**Endpoint:** `GET /api/reports/backlog/counts`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "status": "in_progress",
      "priority": "critical",
      "count": "5",
      "avg_age_hours": "12.3",
      "oldest_ticket_date": "2025-11-07T08:00:00.000Z",
      "newest_ticket_date": "2025-11-08T14:00:00.000Z"
    }
  ]
}
```

### Get SLA Breaches

**Endpoint:** `GET /api/reports/sla/breaches`

**Query Parameters:**
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)

**Example Request:**
```bash
GET /api/reports/sla/breaches?start_date=2025-11-01&end_date=2025-11-08
```

**Response:**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": 38,
      "ticket_number": "TKT-12340123-456",
      "subject": "Payment not processing",
      "priority": "high",
      "status": "in_progress",
      "created_at": "2025-11-07T10:00:00.000Z",
      "sla_due_date": "2025-11-08T10:00:00.000Z",
      "sla_breach_time": "2025-11-08T10:05:00.000Z",
      "escalation_level": 1,
      "time_to_breach_minutes": "1445",
      "breach_duration_minutes": "125.5",
      "customer_name": "Mike Johnson",
      "agent_name": "Sarah Lee",
      "category_name": "Billing & Payments",
      "escalation_count": "1",
      "first_response_at": "2025-11-07T10:15:00.000Z",
      "first_response_sla_met": true
    }
  ]
}
```

### Get SLA Breach Statistics

**Endpoint:** `GET /api/reports/sla/breach-stats`

**Query Parameters:**
- `period` - Grouping period (day, week, month)

**Example Request:**
```bash
GET /api/reports/sla/breach-stats?period=week
```

### Get SLA Metrics

**Endpoint:** `GET /api/reports/sla/metrics`

**Query Parameters:**
- `days` - Number of days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tickets": "342",
    "tickets_within_sla": "298",
    "tickets_breached_sla": "44",
    "sla_compliance_percentage": "87.13",
    "escalated_tickets": "18",
    "avg_resolution_time_minutes": "287.45"
  }
}
```

### Get Upcoming SLA Deadlines

**Endpoint:** `GET /api/reports/sla/upcoming-deadlines`

**Query Parameters:**
- `hours` - Hours ahead to check (default: 4)

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": 52,
      "ticket_number": "TKT-12345679-789",
      "subject": "Feature request - Dark mode",
      "priority": "medium",
      "status": "in_progress",
      "sla_due_date": "2025-11-08T18:30:00.000Z",
      "assigned_agent_id": 7,
      "customer_name": "Alice Brown",
      "agent_name": "Tom Wilson",
      "minutes_until_due": "45.5"
    }
  ]
}
```

### Get Agent Productivity

**Endpoint:** `GET /api/reports/agents/productivity`

**Query Parameters:**
- `agent_id` - Filter by specific agent
- `start_date` - Start date
- `end_date` - End date

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "agent_id": 5,
      "agent_name": "Jane Smith",
      "agent_email": "jane.smith@example.com",
      "total_tickets_handled": "156",
      "tickets_resolved": "142",
      "tickets_active": "14",
      "tickets_within_sla": "134",
      "tickets_breached_sla": "8",
      "avg_resolution_time_minutes": "245.67",
      "avg_first_response_time_minutes": "18.23",
      "tickets_resolved_today": "4",
      "tickets_resolved_this_week": "18",
      "tickets_resolved_this_month": "67",
      "sla_compliance_percentage": "94.37"
    }
  ]
}
```

### Get Agent Workload

**Endpoint:** `GET /api/reports/agents/workload`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agent_id": 7,
      "agent_name": "Tom Wilson",
      "assigned_count": "8",
      "in_progress_count": "12",
      "on_hold_count": "2",
      "total_active": "22",
      "critical_tickets": "3",
      "high_tickets": "7",
      "breached_tickets": "4",
      "avg_ticket_age_hours": "28.5"
    }
  ]
}
```

### Get Tickets by Category

**Endpoint:** `GET /api/reports/categories/tickets`

**Query Parameters:**
- `start_date` - Start date
- `end_date` - End date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category_name": "Technical Support",
      "category_description": "Handle technical issues and troubleshooting",
      "total_tickets": "284",
      "resolved_tickets": "256",
      "active_tickets": "28",
      "breached_tickets": "19",
      "avg_resolution_time_minutes": "312.45",
      "sla_compliance_percentage": "92.58"
    }
  ]
}
```

### Get Trending Issues

**Endpoint:** `GET /api/reports/trending-issues`

**Query Parameters:**
- `limit` - Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "subject": "Unable to access my account",
      "occurrence_count": "23",
      "last_occurrence": "2025-11-08T14:30:00.000Z",
      "active_count": "5",
      "avg_resolution_time_minutes": "187.34"
    }
  ]
}
```

### Get Daily Ticket Volume

**Endpoint:** `GET /api/reports/daily-volume`

**Query Parameters:**
- `days` - Number of days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-08",
      "tickets_created": "28",
      "same_day_resolved": "12",
      "critical_tickets": "3",
      "high_tickets": "8"
    }
  ]
}
```

### Get Resolution Time Distribution

**Endpoint:** `GET /api/reports/resolution-time-distribution`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "priority": "critical",
      "total_resolved": "45",
      "avg_resolution_minutes": "187.23",
      "median_resolution_minutes": "165.50",
      "p90_resolution_minutes": "320.00",
      "min_resolution_minutes": "45.00",
      "max_resolution_minutes": "450.00"
    }
  ]
}
```

---

## Attachments API

### Upload Attachment

**Endpoint:** `POST /api/tickets/:ticketId/attachments`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` - The file to upload
- `user_id` - ID of the user uploading

**Example using cURL:**
```bash
curl -X POST \
  http://localhost:3000/api/tickets/42/attachments \
  -F "file=@/path/to/screenshot.png" \
  -F "user_id=5"
```

**Response:**
```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": 89,
    "ticket_id": 42,
    "uploaded_by_user_id": 5,
    "file_name": "screenshot.png",
    "file_path": "uploads/file-1699450000000-123456789.png",
    "file_size": 245678,
    "file_type": "png",
    "mime_type": "image/png",
    "file_hash": "a1b2c3d4e5f6...",
    "uploaded_at": "2025-11-08T15:30:00.000Z"
  }
}
```

### Get Ticket Attachments

**Endpoint:** `GET /api/tickets/:ticketId/attachments`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 89,
      "ticket_id": 42,
      "file_name": "screenshot.png",
      "file_size": 245678,
      "file_type": "png",
      "mime_type": "image/png",
      "uploaded_by_name": "Jane Smith",
      "uploaded_by_email": "jane.smith@example.com",
      "uploaded_at": "2025-11-08T15:30:00.000Z"
    }
  ]
}
```

### Get Attachment Metadata

**Endpoint:** `GET /api/attachments/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 89,
    "ticket_id": 42,
    "file_name": "screenshot.png",
    "file_path": "uploads/file-1699450000000-123456789.png",
    "file_size": 245678,
    "file_type": "png",
    "mime_type": "image/png",
    "file_hash": "a1b2c3d4e5f6...",
    "uploaded_by_name": "Jane Smith",
    "uploaded_by_email": "jane.smith@example.com",
    "uploaded_at": "2025-11-08T15:30:00.000Z",
    "ticket_number": "TKT-12345678-123",
    "ticket_subject": "Unable to access my account",
    "total_attachments_in_ticket": "2",
    "total_size_in_ticket": "512345"
  }
}
```

### Download Attachment

**Endpoint:** `GET /api/attachments/:id/download`

**Response:** Binary file download

### Delete Attachment

**Endpoint:** `DELETE /api/attachments/:id`

**Request Body:**
```json
{
  "user_id": 5
}
```

### Get Storage Statistics

**Endpoint:** `GET /api/attachments/stats/storage`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_attachments": "234",
    "total_storage_bytes": "52345678",
    "avg_file_size": "223694.26",
    "max_file_size": "9876543",
    "tickets_with_attachments": "187",
    "unique_file_types": "8",
    "files_by_type": {
      "png": 89,
      "jpg": 67,
      "pdf": 45,
      "docx": 23,
      "xlsx": 10
    }
  }
}
```

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message description",
  "error": "Detailed error information"
}
```

### Validation Error Response
```json
{
  "errors": [
    {
      "msg": "Subject is required",
      "param": "subject",
      "location": "body"
    }
  ]
}
```

---

## Priority Levels

- `low` - Non-urgent issues (SLA: 3 days)
- `medium` - Standard priority (SLA: 2 days)
- `high` - Important issues (SLA: 1 day)
- `critical` - Urgent issues requiring immediate attention (SLA: 8 hours)

## Ticket Statuses

- `new` - Newly created ticket
- `assigned` - Assigned to an agent
- `in_progress` - Agent is actively working on it
- `on_hold` - Temporarily paused
- `resolved` - Issue has been resolved
- `closed` - Ticket is closed
- `escalated` - Escalated due to SLA breach or complexity

## User Roles

- `customer` - End users who create tickets
- `agent` - Support agents who handle tickets
- `admin` - System administrators

## Proficiency Levels

- `beginner` - Basic knowledge
- `intermediate` - Moderate expertise
- `expert` - Advanced expertise
