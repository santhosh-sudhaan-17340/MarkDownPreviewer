# 🔒 Parcel Drop-Locker Management System

A comprehensive smart locker management system with atomic reservations, pickup codes, automated expiry management, and an admin portal for monitoring and optimization.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Admin Portal](#admin-portal)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Deployment](#deployment)

## ✨ Features

### Core Functionality
- **Atomic Locker Reservations**: Thread-safe slot allocation with database transactions and row-level locking
- **Smart Slot Selection**: Intelligent locker selection based on size, location, and availability
- **Pickup Code Generation**: Secure 6-digit pickup codes with uniqueness guarantees
- **Automated Expiry Management**: Scheduled jobs for expiry checks, warnings, and cleanup
- **Multi-size Support**: Small, Medium, Large, and Extra Large slot sizes

### Admin Portal Features
- **Real-time Dashboard**: System overview with key metrics and statistics
- **Locker Management**: View and manage all locker locations and slots
- **Reservation Tracking**: Monitor all reservations with filtering
- **Health Monitoring**: Track locker health status and maintenance queue
- **Advanced Reports**:
  - Overfill Report: Identify locations at risk
  - Occupancy Report: Track slot utilization
  - Performance Metrics: Analyze pickup success rates and efficiency
  - Logistics Optimization: Find optimal lockers for deliveries

### Security & Performance
- Rate limiting and CORS protection
- JWT-based authentication
- Helmet.js security headers
- Input validation with Joi
- Comprehensive audit logging
- Database connection pooling

## 🏗️ Architecture

```
┌─────────────────┐
│   React Admin   │ ← Admin Portal (Port 3001)
│     Portal      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express API    │ ← Backend Server (Port 3000)
│    Server       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ ← Database
│    Database     │
└─────────────────┘
```

### Key Components

**Backend Services:**
- `reservationService`: Atomic reservation processing
- `expiryService`: Automated expiry management with cron jobs
- `healthService`: Locker health monitoring
- `analyticsService`: Heavy SQL queries for reporting and optimization

**Scheduled Jobs:**
- Hourly: Process expired reservations
- Every 6 hours: Send expiry warnings
- Daily at 2 AM: Cleanup old records

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.x
- PostgreSQL >= 13.x
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd MarkDownPreviewer
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install admin portal dependencies**
```bash
cd admin-portal
npm install
cd ..
```

4. **Set up PostgreSQL database**
```bash
# Create database
createdb parcel_locker_db

# Or using psql
psql -U postgres
CREATE DATABASE parcel_locker_db;
\q
```

5. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

Example `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=parcel_locker_db
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3000
NODE_ENV=development

JWT_SECRET=your_secure_jwt_secret_change_in_production
JWT_EXPIRES_IN=24h

DEFAULT_PICKUP_EXPIRY_HOURS=48
PICKUP_CODE_LENGTH=6
```

6. **Run database migrations**
```bash
npm run db:migrate
```

7. **Seed the database with sample data**
```bash
npm run db:seed
```

### Running the Application

**Start the backend server:**
```bash
npm start
# Development mode with auto-restart:
npm run dev
```

**Start the admin portal (in a separate terminal):**
```bash
cd admin-portal
npm start
```

The system will be available at:
- Backend API: http://localhost:3000
- Admin Portal: http://localhost:3001

### Default Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

**Operator Login:**
- Username: `operator1`
- Password: `operator123`

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Public Endpoints

#### Reserve a Locker
```http
POST /api/reservations
Content-Type: application/json

{
  "trackingNumber": "PKG123456789",
  "recipientName": "John Doe",
  "recipientEmail": "john@example.com",
  "recipientPhone": "+1-555-0101",
  "size": "medium",
  "preferredLocationId": "uuid-here" // optional
}
```

**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": "uuid",
    "trackingNumber": "PKG123456789",
    "pickupCode": "123456",
    "slotNumber": "S042",
    "lockerName": "Downtown Hub",
    "lockerLocationId": "uuid",
    "reservedAt": "2025-11-08T10:00:00Z",
    "expiresAt": "2025-11-10T10:00:00Z",
    "expiryHours": 48
  }
}
```

#### Track Parcel
```http
GET /api/reservations/track/{trackingNumber}
```

**Response:**
```json
{
  "tracking_number": "PKG123456789",
  "parcel_status": "delivered_to_locker",
  "pickup_code": "123456",
  "slot_number": "S042",
  "locker_name": "Downtown Hub",
  "locker_address": "123 Main St",
  "expires_at": "2025-11-10T10:00:00Z"
}
```

#### Process Pickup
```http
POST /api/reservations/pickup
Content-Type: application/json

{
  "pickupCode": "123456",
  "email": "john@example.com" // optional verification
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pickup successful",
  "parcel": {
    "trackingNumber": "PKG123456789",
    "slotNumber": "S042",
    "lockerName": "Downtown Hub"
  }
}
```

### Admin Endpoints

All admin endpoints require authentication header:
```
Authorization: Bearer {token}
```

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Dashboard Data
```http
GET /api/admin/dashboard
```

#### Locker Locations
```http
GET /api/admin/lockers
GET /api/admin/lockers/{id}/slots
```

#### Reports
```http
GET /api/admin/reports/occupancy
GET /api/admin/reports/overfill?threshold=80
GET /api/admin/reports/performance?startDate=2025-01-01&endDate=2025-01-31
GET /api/admin/reports/optimization?size=medium&latitude=37.7749&longitude=-122.4194
```

#### Health Monitoring
```http
GET /api/admin/health/overview
GET /api/admin/health/maintenance
POST /api/admin/health/check/{slotId}
POST /api/admin/health/repair/{slotId}
```

#### Reservations
```http
GET /api/admin/reservations?status=active&limit=50&offset=0
GET /api/admin/expiring
POST /api/admin/process-expired
```

## 🖥️ Admin Portal

### Features

**Dashboard**
- Real-time system metrics
- 24-hour activity summary
- Expiry warnings
- Recent reservations
- Health overview

**Locker Management**
- View all locker locations
- Slot availability and status
- Occupancy rates
- Size distribution

**Reservations**
- Filter by status
- Search and track parcels
- View pickup codes
- Monitor expiry times

**Health Monitoring**
- Location health overview
- Maintenance queue
- Issue tracking
- Temperature monitoring

**Reports & Analytics**
- Overfill Report: Identify capacity issues
- Occupancy Report: Track utilization
- Performance Metrics: Success rates and efficiency
- Logistics Optimization: Smart locker suggestions

### Screenshots

The admin portal provides:
- Responsive design for desktop and mobile
- Real-time data updates
- Intuitive navigation
- Color-coded status indicators
- Comprehensive filtering and search

## 🗄️ Database Schema

### Core Tables

**locker_locations**: Physical locker locations
- id, name, address, city, coordinates, operating_hours, status

**locker_slots**: Individual locker compartments
- id, locker_location_id, slot_number, size, status, health_status, temperature

**parcels**: Parcel information
- id, tracking_number, recipient details, size, status

**reservations**: Locker reservations
- id, parcel_id, slot_id, pickup_code, status, expires_at, delivered_at, picked_up_at

**users**: End users

**admin_users**: Admin portal users

**locker_health_logs**: Health check history

**audit_logs**: System audit trail

**notification_queue**: Notification management

**locker_metrics**: Analytics data

### Views

**locker_occupancy_status**: Real-time occupancy for all locations

**expiring_parcels**: Parcels expiring in next 24 hours

### Indexes

Optimized indexes on:
- Slot status and location for fast lookups
- Pickup codes for validation
- Expiry dates for scheduled jobs
- Tracking numbers for user queries

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | parcel_locker_db |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| PORT | Server port | 3000 |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | Token expiry | 24h |
| DEFAULT_PICKUP_EXPIRY_HOURS | Pickup expiry time | 48 |
| PICKUP_CODE_LENGTH | Pickup code length | 6 |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |

### Scheduled Jobs

Jobs can be configured in `server/services/expiryService.js`:

- **Expiry Check**: `0 * * * *` (hourly)
- **Warning Notifications**: `0 */6 * * *` (every 6 hours)
- **Cleanup**: `0 2 * * *` (daily at 2 AM)

## 🚢 Deployment

### Production Checklist

1. **Environment Setup**
   - Set strong JWT_SECRET
   - Use production database credentials
   - Enable SSL for PostgreSQL
   - Set NODE_ENV=production

2. **Security**
   - Change default admin passwords
   - Configure CORS for specific origins
   - Enable HTTPS
   - Set up firewall rules

3. **Database**
   - Run migrations
   - Set up automated backups
   - Configure connection pooling
   - Enable query logging

4. **Monitoring**
   - Set up error logging
   - Configure health check monitoring
   - Enable performance metrics
   - Set up alerting

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: parcel_locker_db
      POSTGRES_PASSWORD: your_password
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PASSWORD: your_password
    depends_on:
      - postgres

volumes:
  pgdata:
```

## 📊 System Features

### Atomic Reservations

The system uses PostgreSQL row-level locking to ensure atomic slot allocation:

```sql
SELECT ... FROM locker_slots
WHERE status = 'available' AND size = $1
FOR UPDATE SKIP LOCKED
```

This ensures:
- No double-booking
- Thread-safe operations
- High concurrency support

### Expiry Management

Three-tier expiry system:
1. **Warnings**: Sent 12 hours before expiry
2. **Expiry Processing**: Automated hourly checks
3. **Cleanup**: Daily removal of old records

### Health Monitoring

- Real-time sensor data (temperature, door status)
- Automated health checks
- Maintenance queue prioritization
- Historical health logs

### Analytics & Optimization

Heavy SQL queries provide:
- Demand forecasting
- Optimal locker selection
- Capacity planning
- Performance analysis
- Revenue tracking

## 🤝 Support

For issues or questions:
- Check the API documentation above
- Review error logs in `server/index.js`
- Verify database connection
- Check scheduled job status

## 📄 License

MIT License

---

**Built with:** Node.js, Express, PostgreSQL, React, and comprehensive SQL optimization

**Status:** Production-ready system with enterprise-grade features
