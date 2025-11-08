# Appointment Scheduling System with Resource Constraints

A robust, production-ready appointment scheduling system designed for resource-constrained environments (doctors, barbers, technicians, etc.) with advanced features including conflict prevention, automated reminders, cancellation rules, and no-show penalties.

## Features

### Core Functionality
- **Resource Management**: Support for multiple resource types (doctors, barbers, technicians, consultants)
- **Schedule Configuration**: Flexible weekly schedules with day-specific time slots
- **Conflict Prevention**: Database-level locking with serializable transactions to prevent double-booking
- **Automated Reminders**: Configurable reminder system with multiple notification times
- **Cancellation Rules**: Flexible cancellation policies with late-cancellation penalties
- **No-Show Penalties**: Automatic penalty tracking and customer history
- **Efficient Search**: Optimized nearest available slot search algorithm
- **Resource Utilization**: Track and analyze resource booking efficiency

### Technical Highlights
- **Transaction Safety**: Multi-row transactions with `FOR UPDATE` row-level locking
- **Type Safety**: Full TypeScript implementation with Zod validation
- **Database**: PostgreSQL with Prisma ORM for type-safe database access
- **RESTful API**: Express.js REST API with comprehensive endpoints
- **Automated Processing**: Cron-based reminder processor
- **Error Handling**: Robust error handling and validation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Express REST API                        │
├─────────────────────────────────────────────────────────────┤
│  Resources  │  Appointments  │  Availability  │  Penalties │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼─────────┐  ┌───────▼────────┐
│ Resource Mgmt  │  │  Booking Service  │  │ Reminder Svc   │
│   - Schedules  │  │  - Transactions   │  │ - Cron Jobs    │
│   - Validation │  │  - Locking        │  │ - Notifications│
└────────────────┘  └───────────────────┘  └────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼─────────┐  ┌───────▼────────┐
│ Availability   │  │  Penalty Service  │  │ Customer Svc   │
│   - Search     │  │  - No-show Track  │  │ - Statistics   │
│   - Utilization│  │  - Cancellation   │  │ - History      │
└────────────────┘  └───────────────────┘  └────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  PostgreSQL DB    │
                    │  (with Prisma)    │
                    └───────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up the database:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migrate
```

5. Start the server:
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Database Schema

### Core Entities

**Resource**: Service providers (doctors, barbers, etc.)
- id, name, type, email, phone, description, isActive

**Schedule**: Weekly availability for resources
- id, resourceId, dayOfWeek (0-6), startTime, endTime, isActive

**Customer**: Clients booking appointments
- id, name, email, phone, noShowCount, totalPenalty

**Appointment**: Booking records
- id, resourceId, customerId, startTime, endTime, status, notes

**Reminder**: Automated notifications
- id, appointmentId, scheduledFor, status, message, sentAt

**NoShowPenalty**: Penalty tracking
- id, appointmentId, customerId, amount, isPaid, paidAt

**CancellationRule**: Cancellation policies
- id, name, hoursBeforeStart, penaltyPercentage, isActive

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Resources API

#### Create Resource
```http
POST /api/resources
Content-Type: application/json

{
  "name": "Dr. Sarah Johnson",
  "type": "DOCTOR",
  "email": "sarah.johnson@example.com",
  "phone": "+1-555-0123",
  "description": "General Practitioner"
}
```

#### Get All Resources
```http
GET /api/resources?type=DOCTOR
```

#### Create Schedule
```http
POST /api/resources/{resourceId}/schedules
Content-Type: application/json

{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00"
}
```

### Appointments API

#### Create Appointment
```http
POST /api/appointments
Content-Type: application/json

{
  "resourceId": "uuid",
  "customerId": "uuid",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:30:00Z",
  "notes": "Annual checkup"
}
```

#### Cancel Appointment
```http
POST /api/appointments/{appointmentId}/cancel
```

#### Mark No-Show
```http
POST /api/appointments/{appointmentId}/no-show
```

#### Reschedule Appointment
```http
POST /api/appointments/{appointmentId}/reschedule
Content-Type: application/json

{
  "newStartTime": "2024-01-16T14:00:00Z",
  "newEndTime": "2024-01-16T14:30:00Z"
}
```

### Availability API

#### Search for Available Slots
```http
POST /api/availability/search
Content-Type: application/json

{
  "resourceType": "DOCTOR",
  "durationMinutes": 30,
  "limit": 10
}
```

Response:
```json
{
  "count": 10,
  "slots": [
    {
      "resourceId": "uuid",
      "resourceName": "Dr. Sarah Johnson",
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T09:30:00Z"
    }
  ]
}
```

#### Get Resource Availability
```http
GET /api/availability/resource/{resourceId}?startDate=2024-01-15&endDate=2024-01-22&durationMinutes=30
```

#### Check Slot Availability
```http
POST /api/availability/check
Content-Type: application/json

{
  "resourceId": "uuid",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:30:00Z"
}
```

#### Get Resource Utilization
```http
GET /api/availability/resource/{resourceId}/utilization?startDate=2024-01-01&endDate=2024-01-31
```

### Customers API

#### Create Customer
```http
POST /api/customers
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0456"
}
```

#### Get Customer Statistics
```http
GET /api/customers/{customerId}/stats
```

#### Get Customer Appointments
```http
GET /api/customers/{customerId}/appointments?futureOnly=true
```

#### Get Customer Penalties
```http
GET /api/customers/{customerId}/penalties?unpaidOnly=true
```

### Penalties API

#### Create Cancellation Rule
```http
POST /api/penalties/rules
Content-Type: application/json

{
  "name": "24-Hour Cancellation Policy",
  "hoursBeforeStart": 24,
  "penaltyPercentage": 50
}
```

#### Mark Penalty as Paid
```http
POST /api/penalties/{penaltyId}/pay
```

#### Waive Penalty
```http
POST /api/penalties/{penaltyId}/waive
```

#### Get Penalty Statistics
```http
GET /api/penalties/stats/all
```

## Key Implementation Details

### Conflict Prevention

The system uses PostgreSQL's serializable transaction isolation level with row-level locking to prevent double-booking:

```typescript
// Pseudo-code from bookingService.ts
await prisma.$transaction(async (tx) => {
  // Lock rows and check for conflicts
  const conflicts = await tx.$queryRaw`
    SELECT id FROM "Appointment"
    WHERE "resourceId" = ${resourceId}
      AND status NOT IN ('CANCELLED', 'NO_SHOW')
      AND (time ranges overlap)
    FOR UPDATE  // Row-level lock
  `;

  if (conflicts.length > 0) {
    throw new Error('Time slot already booked');
  }

  // Create appointment
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});
```

### Reminder System

Automatic reminder processing runs every minute via cron:

```typescript
// Runs every minute to check for pending reminders
cron.schedule('* * * * *', async () => {
  await reminderService.processPendingReminders();
});
```

Reminders are automatically created when booking appointments based on configuration:
- 24 hours before (default)
- 2 hours before (default)

### Efficient Slot Search

The availability search algorithm:
1. Queries only active resources matching criteria
2. Generates theoretical time slots based on schedules
3. Fetches existing appointments with indexed queries
4. Filters out conflicts in memory
5. Returns earliest available slots

Performance optimizations:
- Database indexes on `resourceId`, `startTime`, `status`
- Day-by-day iteration with early exit
- Limit parameter to control result size

## Configuration

Environment variables (`.env`):

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/appointment_scheduling"

# Server
PORT=3000
NODE_ENV=development

# Appointment Settings
DEFAULT_SLOT_DURATION_MINUTES=30
CANCELLATION_WINDOW_HOURS=24
NO_SHOW_PENALTY_AMOUNT=25.00
REMINDER_HOURS_BEFORE=[24, 2]
LATE_CANCELLATION_PENALTY=15.00

# Timezone
TZ=UTC
```

## Testing

Run the included test suite:
```bash
npm test
```

## Production Deployment

### Database Migration
```bash
npm run migrate:deploy
```

### Build and Start
```bash
npm run build
NODE_ENV=production npm start
```

### Recommended Production Setup
- Use a process manager (PM2, systemd)
- Set up database connection pooling
- Configure proper logging (Winston, Pino)
- Implement rate limiting
- Add authentication/authorization middleware
- Set up monitoring (DataDog, New Relic)
- Configure CORS appropriately
- Use HTTPS/TLS

## Security Considerations

1. **Input Validation**: All inputs validated with Zod schemas
2. **SQL Injection**: Protected via Prisma's parameterized queries
3. **Transaction Isolation**: Serializable transactions prevent race conditions
4. **Authentication**: Add JWT/OAuth middleware in production
5. **Rate Limiting**: Implement API rate limiting
6. **CORS**: Configure allowed origins

## Extending the System

### Adding Email/SMS Notifications

Modify `src/services/reminderService.ts`:

```typescript
private async sendReminder(reminder: Reminder): Promise<void> {
  // Integrate with email service
  await emailService.send({
    to: reminder.appointment.customer.email,
    subject: 'Appointment Reminder',
    body: reminder.message
  });

  // Integrate with SMS service
  await smsService.send({
    to: reminder.appointment.customer.phone,
    message: reminder.message
  });
}
```

### Adding Payment Processing

Create a payment service and integrate with `penaltyService.ts`:

```typescript
async payPenalty(penaltyId: string, paymentMethod: string) {
  const penalty = await this.getPenaltyById(penaltyId);

  // Process payment
  await paymentService.charge({
    amount: penalty.amount,
    method: paymentMethod
  });

  // Mark as paid
  await this.markPenaltyPaid(penaltyId);
}
```

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.
