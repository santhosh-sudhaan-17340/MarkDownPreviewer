# Complaint Ticketing System with SLA Tracking

A comprehensive complaint ticketing system featuring SLA (Service Level Agreement) tracking, skill-based routing, automated escalations, and detailed reporting capabilities.

## Features

### Core Ticketing
- ✅ **Ticket Management** - Create, update, assign, and track support tickets
- ✅ **Status Tracking** - Complete lifecycle management (new → assigned → in_progress → resolved → closed)
- ✅ **Priority Levels** - Critical, high, medium, and low priority classification
- ✅ **Auto-Assignment** - Intelligent ticket routing based on agent skills and workload

### SLA Management
- ✅ **SLA Tracking** - Automatic SLA deadline calculation based on priority
- ✅ **Breach Detection** - Real-time monitoring for SLA violations
- ✅ **Auto-Escalation** - Multi-level escalation when SLAs are breached
- ✅ **SLA Metrics** - Compliance reporting and breach analytics

### Skill-Based Routing
- ✅ **Agent Skills** - Define agent expertise and proficiency levels
- ✅ **Smart Routing** - Route tickets to agents based on required skills
- ✅ **Workload Balancing** - Distribute tickets evenly across available agents
- ✅ **Manual Override** - Option for manual ticket assignment

### Audit & Timeline
- ✅ **Comprehensive Audit Logs** - Track all operations with user attribution
- ✅ **Status History** - Complete timeline of status changes
- ✅ **Assignment History** - Track ticket reassignments
- ✅ **Comment Thread** - Public and internal comments with full history

### Attachments
- ✅ **File Uploads** - Support for images, documents, and archives
- ✅ **Metadata Tracking** - File size, type, hash, and uploader details
- ✅ **Storage Statistics** - Track storage usage by file type
- ✅ **Secure Downloads** - Controlled file access

### Reporting & Analytics
- ✅ **Backlog Reports** - Real-time backlog counts and aging analysis
- ✅ **SLA Breach Reports** - Identify and analyze SLA violations
- ✅ **Agent Productivity** - Track resolution times and ticket counts
- ✅ **Category Analytics** - Performance metrics by ticket category
- ✅ **Trending Issues** - Identify recurring problems
- ✅ **Daily Volume** - Track ticket creation patterns

## Technology Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **File Upload:** Multer
- **Validation:** Express-validator
- **Scheduling:** Node-cron
- **Security:** Helmet + CORS

## Prerequisites

- Node.js 14+
- PostgreSQL 12+
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MarkDownPreviewer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

Create a PostgreSQL database:

```sql
CREATE DATABASE ticketing_system;
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_system
DB_USER=postgres
DB_PASSWORD=your_password_here

# SLA Configuration (in minutes)
SLA_LOW_PRIORITY=4320      # 3 days
SLA_MEDIUM_PRIORITY=2880   # 2 days
SLA_HIGH_PRIORITY=1440     # 1 day
SLA_CRITICAL_PRIORITY=480  # 8 hours

# Escalation Configuration
ESCALATION_CHECK_INTERVAL=15  # Check every 15 minutes

# Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### 5. Initialize Database Schema

```bash
npm run init-db
```

This will create all tables, indexes, triggers, and insert default data (SLA rules and skills).

### 6. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Quick Start Guide

### 1. Create Sample Users

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customer1",
    "email": "customer@example.com",
    "full_name": "John Customer",
    "role": "customer"
  }'

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent1",
    "email": "agent@example.com",
    "full_name": "Jane Agent",
    "role": "agent"
  }'
```

### 2. Assign Skills to Agent

```bash
curl -X PUT http://localhost:3000/api/users/2/skills \
  -H "Content-Type: application/json" \
  -d '{
    "skills": [
      {"skill_id": 1, "proficiency_level": "expert"},
      {"skill_id": 3, "proficiency_level": "intermediate"}
    ]
  }'
```

### 3. Create a Ticket

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "category_id": 1,
    "subject": "Cannot login to my account",
    "description": "Getting error message when trying to login",
    "priority": "high",
    "auto_assign": true
  }'
```

### 4. View Reports

```bash
# Backlog summary
curl http://localhost:3000/api/reports/backlog/summary

# SLA metrics
curl http://localhost:3000/api/reports/sla/metrics

# Agent productivity
curl http://localhost:3000/api/reports/agents/productivity
```

## API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### Health Check
```
GET /health
```

#### API Documentation
```
GET /api-docs
```

For detailed API examples, see [API_EXAMPLES.md](./API_EXAMPLES.md)

### Main Endpoints

**Tickets**
- `POST /api/tickets` - Create ticket
- `GET /api/tickets` - List tickets (with filters)
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id/status` - Update status
- `PUT /api/tickets/:id/assign` - Assign to agent
- `POST /api/tickets/:id/comments` - Add comment
- `GET /api/tickets/:id/timeline` - Get timeline

**Users & Agents**
- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/agents` - List agents
- `GET /api/users/:id/agent-details` - Get agent with skills
- `PUT /api/users/:id/skills` - Assign skills
- `GET /api/users/:id/statistics` - Agent statistics

**Reports**
- `GET /api/reports/backlog/summary` - Backlog summary
- `GET /api/reports/backlog/counts` - Detailed backlog counts
- `GET /api/reports/sla/breaches` - SLA breach list
- `GET /api/reports/sla/metrics` - SLA compliance metrics
- `GET /api/reports/agents/productivity` - Agent productivity
- `GET /api/reports/agents/workload` - Current workload
- `GET /api/reports/trending-issues` - Trending problems
- `GET /api/reports/daily-volume` - Daily ticket volume

**Attachments**
- `POST /api/tickets/:ticketId/attachments` - Upload file
- `GET /api/tickets/:ticketId/attachments` - List attachments
- `GET /api/attachments/:id` - Get metadata
- `GET /api/attachments/:id/download` - Download file
- `DELETE /api/attachments/:id` - Delete attachment

## Database Schema

### Core Tables

- **users** - System users (customers, agents, admins)
- **tickets** - Support tickets
- **ticket_categories** - Ticket categorization
- **agent_skills** - Available skills
- **agent_skill_mapping** - Agent-skill assignments

### Tracking Tables

- **ticket_status_history** - Status change timeline
- **ticket_assignment_history** - Assignment history
- **ticket_comments** - Comments and updates
- **ticket_attachments** - File attachments
- **ticket_sla_tracking** - SLA metrics

### Configuration Tables

- **sla_escalation_rules** - SLA thresholds by priority
- **audit_logs** - Complete audit trail

## SLA Configuration

Default SLA times (configurable in `.env`):

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Low      | 1 day        | 3 days         |
| Medium   | 8 hours      | 2 days         |
| High     | 4 hours      | 1 day          |
| Critical | 1 hour       | 8 hours        |

### Escalation Levels

Tickets automatically escalate when SLA is breached:
- **Level 1**: Shortly after SLA breach
- **Level 2**: Extended breach (configurable)
- **Level 3**: Severe breach (configurable)

## Skill-Based Routing

### Available Skills (Default)

1. Technical Support
2. Billing & Payments
3. Product Knowledge
4. Account Management
5. Escalations
6. VIP Support

### Proficiency Levels

- **Beginner** - Basic knowledge
- **Intermediate** - Moderate expertise
- **Expert** - Advanced expertise

### Routing Logic

1. Check if ticket category requires specific skill
2. Find agents with matching skill
3. Prioritize by proficiency level (expert > intermediate > beginner)
4. Consider current workload
5. Assign to agent with best match and lowest workload

## Automated Processes

### SLA Monitoring

Runs every 15 minutes (configurable):
- Checks for SLA breaches
- Marks breached tickets
- Triggers escalations
- Adds internal comments

### Features

- Automatic breach detection
- Multi-level escalation
- Audit trail creation
- Internal notifications

## Reporting Capabilities

### Backlog Analysis
- Count by status and priority
- Average ticket age
- Oldest and newest tickets
- Breach count

### SLA Analytics
- Compliance percentage
- Breach statistics
- Resolution time distribution
- Upcoming deadlines

### Agent Performance
- Tickets handled/resolved
- Average resolution time
- Average first response time
- SLA compliance rate
- Daily/weekly/monthly stats

### Category Analysis
- Tickets by category
- Resolution rates
- Average resolution time
- SLA compliance by category

## Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **File validation** - Type and size restrictions
- **SQL injection protection** - Parameterized queries
- **Audit logging** - Complete operation history

## File Upload Restrictions

- **Max size**: 10MB (configurable)
- **Allowed types**:
  - Images: jpeg, jpg, png, gif
  - Documents: pdf, doc, docx, xls, xlsx, txt
  - Archives: zip, rar

## Development

### Project Structure

```
MarkDownPreviewer/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── database/        # DB connection & schema
│   └── server.js        # Main application
├── uploads/             # File storage
├── .env.example         # Environment template
├── package.json
├── API_EXAMPLES.md      # Detailed API examples
└── README.md
```

### Running in Development

```bash
npm run dev
```

This uses nodemon for auto-reload on file changes.

## Testing

### Manual Testing

Use the provided API examples in `API_EXAMPLES.md` with:
- cURL
- Postman
- Insomnia
- Any HTTP client

### Database Queries

Example queries are provided in the Reports model at:
`src/models/Reports.js`

## Production Deployment

### 1. Set Environment

```bash
export NODE_ENV=production
```

### 2. Configure Database

Ensure PostgreSQL is properly configured with:
- Connection pooling
- Proper indexes (created automatically)
- Regular backups

### 3. Configure Reverse Proxy

Use Nginx or similar for:
- SSL/TLS termination
- Load balancing
- Rate limiting

### 4. Process Manager

Use PM2 for process management:

```bash
npm install -g pm2
pm2 start src/server.js --name ticketing-system
pm2 save
pm2 startup
```

### 5. Monitoring

Monitor:
- Application logs
- Database performance
- Disk space (for uploads)
- SLA breach rates

## Troubleshooting

### Database Connection Failed

Check:
- PostgreSQL is running
- Credentials in `.env` are correct
- Database exists
- Network connectivity

### SLA Monitor Not Running

Check:
- Server is running
- `ESCALATION_CHECK_INTERVAL` is set
- Check server logs for errors

### File Upload Failed

Check:
- `uploads/` directory exists and is writable
- File size within limits
- File type is allowed
- Disk space available

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License

## Support

For issues and questions:
- Check API_EXAMPLES.md for usage examples
- Review database schema in src/database/schema.sql
- Check application logs for errors

## Version History

### v1.0.0 (Initial Release)
- Complete ticketing system
- SLA tracking and escalation
- Skill-based routing
- Comprehensive reporting
- Audit logging
- File attachments
- REST API

## Acknowledgments

Built with modern Node.js best practices and PostgreSQL for reliable data management.
