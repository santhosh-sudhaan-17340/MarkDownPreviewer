# Complaint Ticketing System with SLA Tracking

A comprehensive **enterprise-grade** ticketing system with SLA tracking, skill-based routing, automatic escalations, detailed audit logs, and analytics reporting.

🚀 **NEW:** Now with real-time WebSocket notifications, email alerts, workflow automation, advanced search, time tracking, webhooks, and PDF/Excel exports!

## Features

### Core Functionality
- **Ticket Management**: Create, update, assign, and close tickets
- **User Roles**: Support for customers, agents, and administrators
- **SLA Tracking**: Automatic SLA policy application based on priority
- **Auto-Escalation**: Tickets automatically escalate when SLA thresholds are exceeded
- **Skill-Based Routing**: Intelligent ticket assignment based on agent skills and workload
- **Audit Logs**: Comprehensive audit trail for all actions
- **Status Timeline**: Track complete ticket status history
- **Attachment Support**: File upload with metadata tracking and checksum verification
- **Comments**: Internal and external comments on tickets
- **Team Management**: Organize agents into teams for better workload distribution

### Real-Time Features ⚡
- **WebSocket Integration**: Instant notifications and live updates
- **Typing Indicators**: See when agents are typing responses
- **Live Ticket Updates**: Real-time status changes without page refresh
- **Presence Detection**: Agent availability indicators
- **Push Notifications**: Browser and in-app notifications

### Email Notifications 📧
- **Automated Emails**: Professional email notifications for all events
- **Custom Templates**: Handlebars-based email templates
- **HTML Emails**: Beautiful, branded email design
- **Event Triggers**: Ticket created, assigned, status changed, SLA breach
- **Configurable**: Full SMTP configuration support

### Workflow Automation 🤖
- **Rule Engine**: Create powerful automation rules
- **Trigger Types**: Status change, priority change, time-based, SLA breach
- **Actions**: Send emails, create notifications, update tickets, trigger webhooks
- **Conditional Logic**: Complex conditions for precise control
- **Multi-Action**: Execute multiple actions per workflow

### Advanced Search 🔍
- **Full-Text Search**: PostgreSQL-powered full-text search
- **Relevance Ranking**: Results ranked by relevance
- **Advanced Filters**: Multi-field filtering with date ranges
- **Auto-Suggest**: Real-time search suggestions
- **Saved Searches**: Save frequently used search criteria

### Integrations & Webhooks 🔗
- **Webhook Support**: Trigger external systems on events
- **Event-Based**: Subscribe to specific ticket events
- **Retry Logic**: Automatic retries with exponential backoff
- **HMAC Signatures**: Secure webhook verification
- **Delivery Logs**: Track all webhook deliveries and responses

### Analytics & Reporting 📊
- **Backlog Analysis**: Track tickets by status, priority, agent, and skill
- **SLA Breach Monitoring**: Real-time tracking of SLA violations
- **Agent Productivity**: Metrics on resolution time, workload, and compliance
- **Trend Analysis**: Historical data visualization
- **At-Risk Alerts**: Identify tickets approaching SLA breach
- **Export Reports**: Excel and PDF export capabilities
- **Time Tracking**: Built-in time tracking for billable hours

### Agent Tools 🛠️
- **Canned Responses**: Quick reply templates for common questions
- **Time Tracking**: Log time spent on tickets
- **Bulk Actions**: Update multiple tickets at once
- **Quick Filters**: Pre-defined ticket views
- **Keyboard Shortcuts**: Speed up common actions

## Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL 13+ with full-text search
- **ORM**: Sequelize
- **Real-Time**: Socket.IO for WebSocket communication
- **Authentication**: JWT with role-based access control
- **Email**: Nodemailer with Handlebars templates
- **File Upload**: Multer with secure storage
- **Background Jobs**: node-cron + Bull queue for job processing
- **Caching**: Redis for session and query caching
- **Exports**: ExcelJS and PDFKit for report generation

### Frontend
- **Framework**: React 18 with Hooks
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with responsive design
- **HTTP Client**: Axios with interceptors
- **Real-Time**: Socket.IO client
- **State Management**: React Context API + Local state
- **File Upload**: Multi-file upload with progress indicators

## Project Structure

```
MarkDownPreviewer/
├── backend/
│   ├── config/
│   │   └── database.js           # Database configuration
│   ├── controllers/
│   │   ├── authController.js     # Authentication endpoints
│   │   ├── ticketController.js   # Ticket CRUD operations
│   │   └── analyticsController.js # Analytics and reporting
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── auditMiddleware.js    # Audit logging
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── Ticket.js             # Ticket model
│   │   ├── SlaPolicy.js          # SLA policies
│   │   ├── Skill.js              # Skills for routing
│   │   ├── AuditLog.js           # Audit trail
│   │   └── index.js              # Model associations
│   ├── routes/
│   │   ├── authRoutes.js         # Auth routes
│   │   ├── ticketRoutes.js       # Ticket routes
│   │   └── analyticsRoutes.js    # Analytics routes
│   ├── services/
│   │   ├── slaService.js         # SLA monitoring logic
│   │   ├── routingService.js     # Skill-based routing
│   │   ├── auditService.js       # Audit logging service
│   │   └── slaMonitor.js         # Background SLA monitor
│   ├── scripts/
│   │   ├── initDatabase.js       # Database initialization
│   │   └── seedData.js           # Sample data seeding
│   ├── .env.example              # Environment variables template
│   ├── package.json
│   └── server.js                 # Main server file
├── database/
│   ├── schema.sql                # Complete database schema
│   └── analytics_queries.sql     # Pre-built analytics queries
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Login.js          # Login/Register page
    │   │   ├── Dashboard.js      # Main dashboard
    │   │   ├── TicketList.js     # Ticket listing
    │   │   ├── CreateTicket.js   # Ticket creation form
    │   │   └── Analytics.js      # Analytics dashboard
    │   ├── contexts/
    │   │   └── AuthContext.js    # Authentication context
    │   ├── services/
    │   │   └── api.js            # API client
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    ├── package.json
    └── tailwind.config.js
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   cd MarkDownPreviewer
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your settings:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ticketing_system
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_secret_key
   ```

4. **Create PostgreSQL database**
   ```bash
   createdb ticketing_system
   ```

5. **Initialize database**
   ```bash
   npm run init-db
   ```

6. **Seed sample data (optional)**
   ```bash
   npm run seed
   ```

7. **Start the backend server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

8. **Start SLA Monitor (optional background service)**
   ```bash
   npm run sla-monitor
   ```

### Frontend Setup

1. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`

## Default Credentials

After running the seed script, you can login with:

**Admin**
- Email: `admin@example.com`
- Password: `admin123`

**Agents**
- Email: `agent1@example.com`, `agent2@example.com`, `agent3@example.com`
- Password: `password123`

**Customers**
- Email: `john.doe@example.com`, `jane.smith@example.com`, `bob.wilson@example.com`
- Password: `password123`

## API Documentation

### Authentication

**POST** `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "customer"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**GET** `/api/auth/me`
- Requires: Bearer token

### Tickets

**GET** `/api/tickets`
- Query params: `status`, `priority`, `customer_id`, `assigned_agent_id`, `page`, `limit`

**GET** `/api/tickets/:id`
- Returns ticket with full details including timeline, comments, attachments

**POST** `/api/tickets`
```json
{
  "subject": "Login issue",
  "description": "Cannot access my account",
  "priority": "high",
  "category": "Account Access",
  "skill_id": 1,
  "auto_assign": true
}
```

**PATCH** `/api/tickets/:id/status`
```json
{
  "status": "in_progress",
  "comment": "Starting work on this ticket"
}
```

**POST** `/api/tickets/:id/assign`
```json
{
  "agent_id": 2,
  "reason": "Best skilled agent available"
}
```

**POST** `/api/tickets/:id/escalate`
```json
{
  "escalate_to": 3,
  "reason": "Requires senior expertise"
}
```

**POST** `/api/tickets/:id/comments`
```json
{
  "comment": "Customer contacted via phone",
  "is_internal": true
}
```

### Analytics

**GET** `/api/analytics/dashboard`
- Returns overall statistics

**GET** `/api/analytics/backlog`
- Returns backlog counts by status, priority, and agent

**GET** `/api/analytics/sla-breaches`
- Returns SLA breach statistics and at-risk tickets

**GET** `/api/analytics/agent-productivity`
- Returns agent performance metrics

**GET** `/api/analytics/trends?days=30`
- Returns ticket trends over specified period

## Database Schema

### Main Tables

- **users**: Customers, agents, and admins
- **skills**: Available skill categories
- **user_skills**: Agent skill assignments with proficiency levels
- **sla_policies**: Configurable SLA policies by priority
- **tickets**: Main ticket data
- **ticket_status_history**: Complete status timeline
- **ticket_assignments**: Assignment history
- **ticket_escalations**: Escalation tracking
- **ticket_comments**: Ticket discussions
- **attachments**: File metadata
- **audit_logs**: Complete audit trail

### Key Relationships

- Tickets belong to customers (users)
- Tickets are assigned to agents (users)
- Tickets have skills for routing
- Tickets follow SLA policies
- All actions are logged in audit_logs

## SLA Management

### SLA Policies

Default SLA policies (configurable):

| Priority | Response Time | Resolution Time | Escalation Time |
|----------|--------------|----------------|-----------------|
| Critical | 1 hour       | 4 hours        | 2 hours         |
| High     | 4 hours      | 24 hours       | 8 hours         |
| Medium   | 8 hours      | 72 hours       | 24 hours        |
| Low      | 24 hours     | 168 hours      | 48 hours        |

### Auto-Escalation

The SLA Monitor service runs every 5 minutes to:
1. Check for tickets exceeding resolution time → Mark as SLA breached
2. Check for tickets exceeding escalation time → Auto-escalate to supervisor
3. Log all SLA-related events

## Skill-Based Routing

When a ticket is created with auto-assignment:

1. System identifies required skill from ticket
2. Finds all agents with that skill
3. Calculates agent scores based on:
   - Current workload (active tickets)
   - Critical ticket count (weighted higher)
   - Skill proficiency level (1-5)
4. Assigns to best available agent

**Score Formula**: `active_tickets + (critical_tickets × 2) - (proficiency × 5)`

Lower scores are preferred (less busy, higher skilled agents).

## Audit Logging

Every action is logged with:
- User who performed the action
- Action type (CREATE, UPDATE, ASSIGN, ESCALATE, etc.)
- Old and new values
- IP address and user agent
- Timestamp

Audit logs are immutable and used for:
- Compliance reporting
- Security investigations
- Performance analysis
- Ticket timeline reconstruction

## Analytics Queries

Pre-built SQL queries in `database/analytics_queries.sql`:

1. **Backlog Analysis**
   - By status, priority, agent, skill
   - Average ticket age

2. **SLA Breach Tracking**
   - Current breaches
   - Breach rate trends
   - At-risk tickets
   - Breach by agent

3. **Agent Productivity**
   - Resolution times
   - Workload distribution
   - SLA compliance rates
   - Activity logs

4. **Additional Metrics**
   - Tickets by category
   - Escalation statistics
   - Customer satisfaction proxy
   - Attachment statistics

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention (Sequelize ORM)
- XSS protection (Helmet middleware)
- Rate limiting
- CORS configuration

## Performance Optimization

- Database indexes on frequently queried columns
- Connection pooling
- Pagination for large result sets
- Background jobs for SLA monitoring

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

### SLA Monitor Not Working
- Check if background service is running
- Verify cron schedule in `slaMonitor.js`
- Check logs for errors

### Frontend Can't Connect to Backend
- Verify backend is running on port 5000
- Check CORS settings in `server.js`
- Verify proxy setting in `frontend/package.json`

## License

MIT