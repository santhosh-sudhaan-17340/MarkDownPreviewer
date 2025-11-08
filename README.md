# Complaint Ticketing System with SLA Tracking

A comprehensive complaint ticketing system featuring SLA tracking, automatic escalation, skill-based routing, detailed audit logs, attachment management, and analytics.

## Features

### Core Features
- **Ticket Management**: Create, update, and track support tickets
- **SLA Tracking**: Automatic monitoring of response and resolution SLAs
- **Auto-Escalation**: Tickets automatically escalate when SLAs are at risk or breached
- **Skill-Based Routing**: Intelligent assignment of tickets based on agent skills and workload
- **Audit Logging**: Comprehensive logging of all ticket activities
- **Attachment Management**: Upload and manage ticket attachments with metadata
- **Status Timeline**: Track complete history of ticket status changes
- **Comments System**: Internal and external comments on tickets

### Analytics & Reporting
- **Backlog Analysis**: View ticket backlog by status and priority
- **SLA Breach Reports**: Track SLA violations with detailed metrics
- **Agent Productivity**: Monitor agent performance and workload
- **Resolution Time Distribution**: Analyze ticket resolution patterns
- **Skill Metrics**: Track performance by skill category
- **System Metrics**: Overall system health and performance indicators

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL with Prisma ORM
- **File Upload**: Multer
- **Background Jobs**: Node-cron
- **API**: RESTful JSON API

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MarkDownPreviewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `PORT`: Server port (default: 3000)
   - SLA time limits for different priorities

4. **Set up the database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Start the server**
   ```bash
   # Development mode with hot reload
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Tickets

#### Create Ticket
```http
POST /api/tickets
Content-Type: application/json

{
  "title": "Login issue",
  "description": "Cannot log in to the application",
  "priority": "HIGH",
  "requiredSkillId": "skill-uuid",
  "createdById": "user-uuid"
}
```

#### List Tickets
```http
GET /api/tickets?status=OPEN&priority=HIGH&page=1&limit=20
```

Query parameters:
- `status`: Filter by status (NEW, OPEN, IN_PROGRESS, PENDING_USER, PENDING_AGENT, RESOLVED, CLOSED, ESCALATED)
- `priority`: Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)
- `assignedToId`: Filter by assigned agent
- `createdById`: Filter by creator
- `requiredSkillId`: Filter by required skill
- `responseSLAStatus`: Filter by response SLA status
- `resolutionSLAStatus`: Filter by resolution SLA status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### Get Ticket Details
```http
GET /api/tickets/:id
```

Returns ticket with:
- Full ticket details
- Comments history
- Attachments
- Status history timeline
- Escalation history
- SLA breach records

#### Update Ticket
```http
PATCH /api/tickets/:id
Content-Type: application/json
X-User-Id: user-uuid

{
  "status": "IN_PROGRESS",
  "assignedToId": "agent-uuid"
}
```

#### Add Comment
```http
POST /api/tickets/:id/comments
Content-Type: application/json

{
  "userId": "user-uuid",
  "content": "Working on this issue",
  "isInternal": false
}
```

#### Upload Attachment
```http
POST /api/tickets/:id/attachments
Content-Type: multipart/form-data

file: <file>
metadata: {"description": "Error screenshot", "tags": ["bug", "ui"]}
```

#### Get Audit Logs
```http
GET /api/tickets/:id/audit-logs
```

### Users

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "email": "agent@example.com",
  "name": "John Doe",
  "role": "AGENT",
  "skillIds": ["skill-uuid-1", "skill-uuid-2"]
}
```

#### List Users
```http
GET /api/users?role=AGENT
```

#### Get User Details
```http
GET /api/users/:id
```

#### Add Skill to User
```http
POST /api/users/:id/skills
Content-Type: application/json

{
  "skillId": "skill-uuid",
  "proficiency": 4
}
```

Proficiency scale: 1-5 (1 = Beginner, 5 = Expert)

### Skills

#### Create Skill
```http
POST /api/skills
Content-Type: application/json

{
  "name": "Technical Support",
  "description": "Handle technical issues"
}
```

#### List Skills
```http
GET /api/skills
```

#### Get Skill Details
```http
GET /api/skills/:id
```

### Analytics

#### Get Backlog Count
```http
GET /api/analytics/backlog
```

Returns:
- Total backlog count
- Breakdown by status
- Breakdown by priority

#### Get SLA Breaches
```http
GET /api/analytics/sla-breaches?startDate=2024-01-01&endDate=2024-12-31
```

Returns:
- Total breach count
- Tickets at risk
- Breaches by type (response/resolution)
- Breaches by priority
- Average breach duration

#### Get Agent Productivity
```http
GET /api/analytics/agent-productivity?startDate=2024-01-01&endDate=2024-12-31
```

Returns for each agent:
- Total tickets assigned
- Total tickets resolved
- Average resolution time
- SLA breach count
- Resolution rate percentage

#### Get System Metrics
```http
GET /api/analytics/system-metrics
```

Returns:
- Total tickets
- Open/resolved/closed counts
- Average resolution time
- Average first response time
- SLA compliance rate
- Overall resolution rate

#### Get Resolution Time Distribution
```http
GET /api/analytics/resolution-time-distribution
```

#### Get Ticket Trends
```http
GET /api/analytics/ticket-trends?days=30
```

#### Get Skill Metrics
```http
GET /api/analytics/skill-metrics
```

#### Get Attachment Statistics
```http
GET /api/analytics/attachment-stats?ticketId=ticket-uuid
```

## Database Schema

### Main Tables

#### Ticket
- Core ticket information
- SLA tracking fields
- Status and priority
- Assignment and routing

#### User
- User authentication and profile
- Role-based access (USER, AGENT, ADMIN)

#### Skill
- Available skills in the system
- Used for ticket routing

#### AgentSkill
- Links agents to their skills
- Proficiency levels

#### TicketComment
- Comments on tickets
- Internal/external flag

#### TicketAttachment
- File attachments
- Metadata storage

#### TicketStatusHistory
- Complete timeline of status changes

#### TicketEscalation
- Escalation tracking
- Escalation levels (L1, L2, L3, MANAGEMENT)

#### SLABreach
- Records of SLA violations
- Breach duration tracking

#### AuditLog
- Comprehensive activity logging
- Change tracking

## SLA Configuration

Configure SLA times (in minutes) in `.env`:

```env
# Critical Priority
CRITICAL_RESPONSE_SLA=15
CRITICAL_RESOLUTION_SLA=120

# High Priority
HIGH_RESPONSE_SLA=30
HIGH_RESOLUTION_SLA=240

# Medium Priority
MEDIUM_RESPONSE_SLA=60
MEDIUM_RESOLUTION_SLA=480

# Low Priority
LOW_RESPONSE_SLA=120
LOW_RESOLUTION_SLA=960
```

## Background Jobs

### SLA Monitor
Runs every 5 minutes to:
- Check SLA status for all active tickets
- Update SLA risk levels
- Trigger automatic escalations
- Record SLA breaches

### Workload Balancer
Runs every 15 minutes to:
- Assign unassigned tickets
- Balance workload across agents
- Consider agent skills and current workload

## Skill-Based Routing

The system uses an intelligent routing algorithm that considers:
1. **Required Skills**: Matches tickets to agents with the required skill
2. **Proficiency Level**: Prefers agents with higher proficiency
3. **Current Workload**: Balances tickets across agents
4. **Priority**: Critical tickets get priority in assignment

## Audit Logging

All actions are logged including:
- Ticket creation/updates
- Status changes
- Comments
- Attachments
- Assignments
- Escalations
- SLA updates

Audit logs include:
- Action type
- User who performed the action
- Timestamp
- Before/after values
- IP address and user agent (when available)

## Development

### Run in development mode
```bash
npm run dev
```

### Database operations
```bash
# Create migration
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Run SLA monitor standalone
```bash
npm run sla:monitor
```

## API Examples

### Example: Creating and Managing a Ticket

1. **Create a new high-priority ticket**
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Application crashes on startup",
    "description": "The app crashes immediately after opening",
    "priority": "HIGH",
    "createdById": "user-123"
  }'
```

2. **Agent updates ticket status**
```bash
curl -X PATCH http://localhost:3000/api/tickets/ticket-456 \
  -H "Content-Type: application/json" \
  -H "X-User-Id: agent-789" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

3. **Add a comment**
```bash
curl -X POST http://localhost:3000/api/tickets/ticket-456/comments \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "agent-789",
    "content": "Investigating the issue. Found potential cause in logs."
  }'
```

4. **Upload attachment**
```bash
curl -X POST http://localhost:3000/api/tickets/ticket-456/attachments \
  -F "file=@screenshot.png" \
  -F 'metadata={"description":"Error screenshot"}'
```

5. **Mark as resolved**
```bash
curl -X PATCH http://localhost:3000/api/tickets/ticket-456 \
  -H "Content-Type: application/json" \
  -H "X-User-Id: agent-789" \
  -d '{
    "status": "RESOLVED"
  }'
```

### Example: Analytics Queries

```bash
# Get current backlog
curl http://localhost:3000/api/analytics/backlog

# Get SLA breaches for last 30 days
curl "http://localhost:3000/api/analytics/sla-breaches?startDate=2024-11-01&endDate=2024-11-30"

# Get agent productivity
curl http://localhost:3000/api/analytics/agent-productivity

# Get system metrics
curl http://localhost:3000/api/analytics/system-metrics
```

## Security Considerations

- Implement authentication middleware (JWT, OAuth, etc.)
- Add authorization checks for role-based access
- Validate and sanitize all user inputs
- Use HTTPS in production
- Implement rate limiting
- Secure file uploads
- Sanitize SQL queries (Prisma handles this)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager (PM2, systemd)
3. Set up proper PostgreSQL backups
4. Configure log rotation
5. Use a reverse proxy (nginx)
6. Enable SSL/TLS
7. Set up monitoring and alerts
8. Configure proper file storage (S3, etc.)

## License

MIT

## Support

For issues, questions, or contributions, please open an issue in the repository.
