# Complaint Ticketing System with SLA Tracking

A comprehensive, enterprise-grade complaint ticketing system featuring SLA tracking, skill-based routing, automatic escalations, and detailed audit logging.

## Features

### Core Ticketing
- ✅ Complete ticket lifecycle management (create, update, assign, resolve, close)
- ✅ Multiple priority levels (critical, high, medium, low)
- ✅ Status tracking (new, open, in_progress, pending, resolved, closed, escalated)
- ✅ Rich ticket metadata (tags, categories, source tracking)
- ✅ Comment system with internal/external visibility
- ✅ File attachments with metadata and security scanning

### SLA Management
- ✅ Automatic SLA calculation based on ticket category and priority
- ✅ Separate response time and resolution time SLAs
- ✅ Real-time SLA breach detection and monitoring
- ✅ Automatic escalation on SLA breaches
- ✅ Configurable SLA policies per category
- ✅ At-risk ticket identification (proactive alerts)

### Skill-Based Routing
- ✅ Skills taxonomy for agents
- ✅ Category-to-skill mapping
- ✅ Intelligent agent selection based on:
  - Required skills and proficiency levels
  - Current workload and capacity
  - Historical performance metrics
  - SLA compliance rates
- ✅ Automatic ticket assignment
- ✅ Manual routing suggestions with scoring

### Audit & Compliance
- ✅ Comprehensive audit trail for all actions
- ✅ Track who did what, when, and from where
- ✅ Complete ticket status history timeline
- ✅ Before/after value tracking for changes
- ✅ IP address and user agent logging
- ✅ Full compliance support for regulatory requirements

### Reporting & Analytics
- ✅ **Backlog Reports**
  - Current backlog counts
  - Breakdown by status, priority, category
  - Aging analysis
  - Unassigned ticket tracking

- ✅ **SLA Reports**
  - Current breach lists (response and resolution)
  - Historical compliance rates
  - At-risk ticket identification
  - Daily/weekly trend analysis

- ✅ **Agent Productivity**
  - Tickets handled per agent
  - Average response and resolution times
  - SLA compliance rates
  - Workload distribution
  - Capacity utilization
  - Performance rankings

- ✅ **Attachment Analytics**
  - File upload statistics
  - Storage usage tracking
  - File type distribution

### Additional Features
- ✅ Attachment handling with SHA-256 checksums
- ✅ Multi-source ticket creation (web, email, phone, chat)
- ✅ Escalation tracking with reason logging
- ✅ Real-time dashboard metrics
- ✅ RESTful API with comprehensive documentation

## Quick Start

### Prerequisites
- Node.js 14 or higher
- PostgreSQL 12 or higher

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Create database
createdb ticketing_system

# 4. Run migrations
npm run migrate

# 5. Seed demo data (optional)
npm run seed

# 6. Start the server
npm start
```

The server will start on `http://localhost:3000`

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-reload
```

## API Endpoints

### Tickets
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets` - List tickets with filters
- `GET /api/tickets/:id` - Get ticket details
- `PATCH /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/assign` - Assign to agent
- `POST /api/tickets/:id/comments` - Add comment
- `GET /api/tickets/:id/comments` - Get comments
- `GET /api/tickets/:id/history` - Get status timeline
- `POST /api/tickets/:id/resolve` - Resolve ticket
- `POST /api/tickets/:id/close` - Close ticket
- `POST /api/tickets/:id/escalate` - Escalate ticket
- `GET /api/tickets/:id/routing-suggestions` - Get agent suggestions
- `GET /api/tickets/:id/audit` - Get audit trail
- `POST /api/tickets/:id/attachments` - Upload file
- `GET /api/tickets/:id/attachments` - List attachments

### Reports
- `GET /api/reports/dashboard` - Dashboard summary
- `GET /api/reports/backlog` - Backlog analysis
- `GET /api/reports/sla-breaches` - SLA breach report
- `GET /api/reports/agent-productivity` - Agent metrics
- `GET /api/reports/sla-statistics` - Overall SLA stats
- `GET /api/reports/attachment-stats` - File statistics

## Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference including:
- Detailed endpoint documentation
- Request/response examples
- Database schema
- SLA tracking explanation
- Skill-based routing algorithm
- Audit logging details
- SQL query examples

## Architecture

```
src/
├── config/
│   └── database.js          # Database connection pool
├── models/
│   └── TicketRepository.js  # Ticket data access layer
├── services/
│   ├── AuditLogger.js       # Audit trail logging
│   ├── SLAMonitor.js        # SLA breach detection & escalation
│   ├── SkillBasedRouter.js  # Intelligent ticket routing
│   └── AttachmentHandler.js # File upload & metadata
├── controllers/
│   ├── TicketController.js  # Ticket API endpoints
│   └── ReportingController.js # Analytics endpoints
├── routes/
│   ├── ticketRoutes.js      # Ticket route definitions
│   └── reportRoutes.js      # Report route definitions
└── server.js                # Express app & startup

database/
├── schema.sql               # Complete database schema
├── queries.sql              # Pre-built analytical queries
├── migrate.js               # Migration runner
└── seed.js                  # Demo data seeding
```

## Database Schema

### Main Tables
- `tickets` - Core ticket information with SLA fields
- `users` - Customers who raise tickets
- `agents` - Support staff
- `skills` - Skill taxonomy
- `agent_skills` - Agent skill mappings with proficiency
- `categories` - Ticket categories with SLA policies
- `ticket_status_history` - Complete status timeline
- `ticket_comments` - Comments and updates
- `attachments` - File attachments with metadata
- `audit_logs` - Comprehensive audit trail
- `sla_policies` - SLA policy definitions
- `escalation_rules` - Auto-escalation rules
- `agent_metrics` - Pre-computed performance metrics

See [database/schema.sql](./database/schema.sql) for complete schema.

## SQL Queries

Pre-built analytical SQL queries are available in [database/queries.sql](./database/queries.sql) for:

1. **Backlog Analysis** (7 queries)
   - Current backlog counts
   - By status, priority, category
   - Aging buckets
   - Unassigned tickets

2. **SLA Breach Analysis** (5 queries)
   - Current response/resolution breaches
   - Historical compliance
   - At-risk tickets
   - Breach trends

3. **Agent Productivity** (6 queries)
   - Overall metrics per agent
   - Workload distribution
   - Performance by priority
   - Top performers
   - Activity timeline
   - Skill utilization

4. **Additional Analytics** (6 queries)
   - Escalation statistics
   - Volume trends
   - Customer history
   - Response time distribution
   - Attachment statistics

## Configuration

Key environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_system
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h

# Files
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads

# SLA
DEFAULT_SLA_RESPONSE_TIME=60     # Minutes
DEFAULT_SLA_RESOLUTION_TIME=480  # Minutes
SLA_CHECK_INTERVAL=5             # Minutes between checks
```

## SLA Monitoring

The system includes automatic SLA monitoring:

- Background job runs every 5 minutes (configurable)
- Checks for response SLA breaches (first response overdue)
- Checks for resolution SLA breaches (resolution overdue)
- Automatically marks tickets as breached
- Triggers escalation rules if configured
- Creates audit log entries
- Can send notifications (integration point)

## Example Usage

### Create a Ticket
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "categoryId": 2,
    "subject": "Cannot login to account",
    "description": "Getting error 403 when trying to login",
    "priority": "high",
    "autoAssign": true
  }'
```

### Get Backlog Report
```bash
curl http://localhost:3000/api/reports/backlog
```

### Check SLA Breaches
```bash
curl http://localhost:3000/api/reports/sla-breaches
```

### Agent Productivity
```bash
curl http://localhost:3000/api/reports/agent-productivity?days=30
```

## Demo Data

Run `npm run seed` to populate the database with:
- 7 Skills (Technical Support, Billing, etc.)
- 7 Categories with SLA policies
- 5 Demo Agents with various skills
- 5 Demo Users
- 4 SLA Policies
- Agent-skill mappings

This allows immediate testing of the system.

## Security Features

- Input validation on all endpoints
- File upload size limits
- MIME type validation for attachments
- SHA-256 checksum for file integrity
- Virus scanning placeholder (integrate with ClamAV)
- SQL injection prevention via parameterized queries
- Audit logging of all actions with IP tracking

## Performance Considerations

- Database indexes on frequently queried fields
- Connection pooling (20 connections)
- Pagination support on list endpoints
- Efficient SQL queries with proper JOINs
- Background job for SLA checking (doesn't block requests)

## Future Enhancements

Potential additions:
- Email notifications on SLA breaches
- SMS alerts for critical tickets
- Customer satisfaction surveys
- Multi-language support
- Advanced analytics dashboard
- Machine learning for ticket categorization
- Chatbot integration
- Knowledge base integration
- Customer self-service portal

## Testing

```bash
npm test  # Run test suite (when implemented)
```

## License

MIT

## Support

For questions or issues:
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Review [database/queries.sql](./database/queries.sql) for SQL examples
- Examine demo data in [database/seed.js](./database/seed.js)
