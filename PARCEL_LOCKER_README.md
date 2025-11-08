# 📦 Parcel Drop-Locker Management System

A comprehensive smart locker management system for secure parcel delivery and pickup. Features atomic slot reservations, automated pickup code generation with expiry rules, real-time health monitoring, and advanced logistics optimization.

## 🌟 Features

### Core Functionality
- **Smart Locker Management**: Multiple locations with configurable slot sizes (Small, Medium, Large, XLarge)
- **Atomic Slot Reservation**: PostgreSQL row-level locking ensures no double-booking
- **Pickup Code System**: Auto-generated 6-character codes with configurable expiry
- **24/7 Access**: User-friendly pickup interface with phone verification
- **Parcel Tracking**: Real-time status updates and location information

### Admin Portal
- **Dashboard**: Real-time statistics and capacity overview
- **Health Checks**: Monitor locker temperature, humidity, and sensor status
- **Overfill Reports**: Identify lockers approaching capacity with predictive analytics
- **Logistics Optimization**: Data-driven insights for:
  - City expansion priority analysis
  - Slot size distribution recommendations
  - Peak hours and load balancing
  - Maintenance schedule optimization
- **Audit Logs**: Complete system activity history
- **Locker Management**: Configure and monitor all locker units

### Technical Highlights
- PostgreSQL with advanced SQL queries and stored procedures
- Row-level locking for atomic operations (SKIP LOCKED)
- Automated background tasks (cleanup, health checks)
- RESTful API with JWT authentication
- Real-time metrics collection
- Comprehensive audit trail

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interfaces                          │
├──────────────────────┬──────────────────────────────────────┤
│  User Portal         │  Admin Portal                        │
│  - Find Lockers      │  - Dashboard                         │
│  - Track Parcels     │  - Health Monitoring                 │
│  - Pickup Interface  │  - Analytics & Reports               │
└──────────────────────┴──────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                      Express API Server                      │
├──────────────────────┬──────────────────────────────────────┤
│  Auth Routes         │  User Routes       │  Admin Routes   │
│  Middleware          │  Services          │  Validation     │
└──────────────────────┴──────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
├──────────────────────────────────────────────────────────────┤
│  - Lockers & Slots   - Parcels           - Reservations     │
│  - Users             - Health Metrics     - Audit Logs      │
│  - Stored Procedures - Triggers           - Views           │
└──────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **npm** >= 9.0.0

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd MarkDownPreviewer
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb parcel_locker_db

# Configure environment
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=parcel_locker_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-secret-key

# Run database schema
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The application will be available at:
- **User Interface**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## 📚 API Documentation

### Authentication

All admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints Overview

#### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `PUT /me` - Update profile
- `POST /change-password` - Change password

#### Locations (`/api/locations`)
- `GET /` - Get all locations (query: city, size)
- `GET /:id` - Get location details
- `GET /:id/available-slots` - Get available slots
- `GET /nearby/search` - Find nearby locations (query: lat, lng, radius)

#### Parcels (`/api/parcels`)
- `POST /` - Create new parcel
- `POST /:id/reserve` - Reserve locker slot (atomic)
- `POST /:id/confirm-dropoff` - Confirm drop-off, generate code
- `POST /pickup` - Pickup parcel with code
- `GET /track/:trackingNumber` - Track parcel
- `GET /my-parcels` - Get user's parcels (authenticated)

#### Admin (`/api/admin`) - Requires Admin Role
- `GET /dashboard` - Dashboard overview
- `GET /health-checks` - Locker health status
- `GET /overfill-report` - Capacity warnings (query: threshold)
- `GET /logistics-optimization` - Comprehensive analytics
- `GET /expired-parcels` - Parcels needing removal
- `POST /lockers` - Create new locker
- `PUT /lockers/:id/status` - Update locker status
- `POST /cleanup-reservations` - Manual cleanup trigger
- `GET /audit-logs` - System audit trail

### Example Requests

#### Create Parcel
```bash
curl -X POST http://localhost:3000/api/parcels \
  -H "Content-Type: application/json" \
  -d '{
    "senderName": "John Doe",
    "recipientName": "Jane Smith",
    "recipientPhone": "+1234567890",
    "recipientEmail": "jane@example.com",
    "parcelSize": "MEDIUM",
    "weightKg": 2.5
  }'
```

#### Reserve Locker Slot (Atomic Operation)
```bash
curl -X POST http://localhost:3000/api/parcels/{parcelId}/reserve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "uuid-here",
    "reservationMinutes": 15
  }'
```

#### Pickup Parcel
```bash
curl -X POST http://localhost:3000/api/parcels/pickup \
  -H "Content-Type: application/json" \
  -d '{
    "pickupCode": "ABC123",
    "phone": "+1234567890"
  }'
```

## 🗄️ Database Schema

### Key Tables

**lockers**
- Stores locker unit information
- Auto-updates status based on capacity
- Tracks temperature, humidity, maintenance

**locker_slots**
- Individual compartments with size specifications
- Status: AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE
- Sensor health monitoring

**parcels**
- Tracking numbers, sender/recipient info
- Auto-generated pickup codes
- Expiry date calculations

**reservations**
- Atomic slot booking with row-level locking
- Automatic cleanup of expired reservations
- Prevents double-booking

**audit_logs**
- Complete system activity history
- User actions and IP tracking
- JSON change tracking

### Advanced SQL Features

- **Stored Procedures**: Atomic slot reservation with `FOR UPDATE SKIP LOCKED`
- **Triggers**: Auto-update locker capacity and status
- **Views**: Optimized queries for common operations
- **Generated Columns**: Real-time expiry calculations
- **Indexes**: High-performance queries on large datasets

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing | - |
| `JWT_EXPIRES_IN` | Token expiration | 24h |
| `PARCEL_EXPIRY_DAYS` | Days until parcel expires | 3 |
| `DEFAULT_RESERVATION_MINUTES` | Reservation duration | 15 |
| `RATE_LIMIT_MAX_REQUESTS` | API rate limit | 100 |
| `RESERVATION_CLEANUP_INTERVAL` | Cleanup frequency (min) | 2 |
| `HEALTH_CHECK_INTERVAL` | Health check frequency (min) | 5 |

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth
- **bcrypt Password Hashing**: 10 rounds by default
- **Helmet.js**: Security headers
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: express-validator
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable origins
- **Atomic Operations**: Race condition prevention

## 📊 Monitoring & Health

### Scheduled Tasks

1. **Reservation Cleanup** (every 2 minutes)
   - Releases expired reservations
   - Updates slot status to AVAILABLE
   - Resets parcel status to PENDING

2. **Health Metrics Collection** (every 5 minutes)
   - Records temperature and humidity
   - Monitors power and network status
   - Tracks door/lock sensor health

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "healthy",
    "version": "PostgreSQL 16.0"
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📈 Performance Optimization

- **Database Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Configurable pool size
- **Compression**: gzip compression for responses
- **Efficient Queries**: Optimized SQL with proper JOINs
- **Caching**: Ready for Redis integration

## 🛠️ Development

### Project Structure

```
MarkDownPreviewer/
├── server/
│   ├── config/
│   │   └── database.js          # Database connection & pooling
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints
│   │   ├── parcels.js            # Parcel operations
│   │   ├── locations.js          # Location queries
│   │   └── admin.js              # Admin portal API
│   ├── services/
│   │   └── lockerService.js      # Business logic
│   └── index.js                  # Express server
├── database/
│   └── schema.sql                # Complete database schema
├── public/
│   ├── index.html                # User interface
│   ├── style.css                 # User UI styles
│   ├── app-user.js               # User UI logic
│   └── admin/
│       ├── index.html            # Admin portal
│       ├── admin.css             # Admin styles
│       └── admin.js              # Admin logic
├── scripts/
│   ├── setup-database.js         # Database initialization
│   └── seed-data.js              # Sample data
├── package.json
├── .env.example
└── PARCEL_LOCKER_README.md
```

### Adding New Features

1. Define database schema in `database/schema.sql`
2. Create service methods in `server/services/`
3. Add API routes in `server/routes/`
4. Update admin portal or user interface
5. Add tests

## 🚧 Roadmap

- [ ] SMS notifications for pickup codes
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] QR code scanning
- [ ] Payment integration
- [ ] IoT hardware integration
- [ ] Machine learning for demand prediction
- [ ] Multi-language support
- [ ] Customer support chat

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Email: support@example.com

## 👏 Acknowledgments

Built with:
- Express.js
- PostgreSQL
- JWT
- bcryptjs
- And many other open-source libraries

---

**Note**: This is a production-ready system with enterprise-grade features. Ensure proper security configuration before deploying to production.
