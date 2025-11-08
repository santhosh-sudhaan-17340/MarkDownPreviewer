# Gamified Learning Leaderboard Backend

A comprehensive backend system for gamified learning with competitive leaderboards, streak tracking, friend groups, cheat detection, and performance analytics.

## Features

### Core Functionality
- **User Management**: Registration, authentication, and profile management
- **Task System**: Create and complete learning tasks with difficulty levels and time limits
- **Points & Scoring**: Earn points for completing tasks with time-based bonuses
- **Global Leaderboards**: Real-time rankings with optimized SQL queries
- **Friend Groups**: Create private groups and compete with friends
- **Streak Tracking**: Daily activity streaks with historical data

### Advanced Features
- **Optimized SQL Rankings**: Uses PostgreSQL window functions and materialized views
- **Concurrent Score Updates**: Row-level locking prevents race conditions
- **Cheat Detection**: Multiple detection algorithms with configurable rules
- **Performance Analytics**: Comprehensive dashboards with trends and insights
- **Rank Notifications**: Automatic notifications for significant rank changes
- **Category Leaderboards**: Rankings by subject category
- **Timeframe Filtering**: View rankings for all-time, weekly, or monthly periods

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with advanced features
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Logging**: Winston
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Scheduled Jobs**: node-cron

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database connection and helpers
├── database/
│   └── schema.sql           # Complete database schema
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── validators.js        # Request validation rules
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User management endpoints
│   ├── tasks.js             # Task management endpoints
│   ├── leaderboard.js       # Leaderboard endpoints
│   ├── friendGroups.js      # Friend group endpoints
│   ├── analytics.js         # Analytics dashboard endpoints
│   └── notifications.js     # Notification endpoints
├── scripts/
│   ├── migrate.js           # Database migration script
│   └── seed.js              # Database seeding script
├── utils/
│   ├── logger.js            # Winston logger configuration
│   └── cheatDetection.js    # Cheat detection algorithms
├── logs/                    # Application logs (auto-generated)
├── .env.example             # Environment variables template
├── server.js                # Main application entry point
├── package.json             # Dependencies and scripts
├── README.md                # This file
└── API_DOCUMENTATION.md     # Complete API documentation
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Create PostgreSQL database**
```bash
createdb leaderboard_db
# Or use pgAdmin/other tools
```

5. **Run database migrations**
```bash
npm run migrate
```

6. **Seed database with sample data (optional)**
```bash
npm run seed
```

7. **Start the server**
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

The server will start on `http://localhost:5000` (or your configured PORT).

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leaderboard_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Ranking Refresh Interval (in minutes)
RANKING_REFRESH_INTERVAL=5

# Cheat Detection Configuration
CHEAT_DETECTION_ENABLED=true
MAX_TASKS_PER_HOUR=50
MIN_TASK_TIME_SECONDS=10
MAX_TASK_TIME_SECONDS=3600

# Notification Settings
SIGNIFICANT_RANK_CHANGE=10
TOP_RANK_THRESHOLD=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## API Documentation

Complete API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Quick API Overview

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks/:id/complete` - Complete a task
- `POST /api/tasks` - Create task (admin only)

#### Leaderboards
- `GET /api/leaderboard/global` - Global leaderboard
- `GET /api/leaderboard/group/:groupId` - Group leaderboard
- `GET /api/leaderboard/category/:category` - Category leaderboard

#### Friend Groups
- `POST /api/groups` - Create friend group
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/join` - Join group with invite code
- `DELETE /api/groups/:id/leave` - Leave group

#### Analytics
- `GET /api/analytics/dashboard` - Performance dashboard
- `GET /api/analytics/performance-trends` - Trends over time
- `GET /api/analytics/cheat-detection` - Cheat detection logs

#### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/check-rank-changes` - Check rank changes

## Database Schema

### Key Features

1. **Optimized Indexing**: Indexes on frequently queried columns
2. **Materialized Views**: Pre-computed global rankings for performance
3. **Triggers**: Automatic point updates and timestamp management
4. **Functions**: Stored procedures for complex operations
5. **Constraints**: Data integrity enforcement
6. **Cascading Deletes**: Proper cleanup of related records

### Main Tables

- **users**: User accounts with stats
- **tasks**: Learning tasks/challenges
- **user_task_completions**: Completion records with points
- **score_history**: Detailed point change history
- **streaks**: Daily activity tracking
- **friend_groups**: Friend group information
- **group_memberships**: User-group relationships
- **rank_notifications**: Rank change notifications
- **cheat_detection_logs**: Suspicious activity logs
- **performance_metrics**: Daily performance aggregates

## Key Features Explained

### 1. Optimized SQL Ranking

The system uses PostgreSQL's window functions for efficient ranking:

```sql
SELECT
    RANK() OVER (ORDER BY total_points DESC, current_streak DESC) as rank,
    DENSE_RANK() OVER (ORDER BY total_points DESC) as dense_rank
FROM users
```

For all-time global rankings, a materialized view is used and refreshed periodically:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY global_rankings
```

### 2. Concurrent Score Updates

Task completion uses transactions with row-level locking:

```sql
SELECT id FROM users WHERE id = $1 FOR UPDATE
```

This prevents race conditions when multiple tasks are completed simultaneously.

### 3. Cheat Detection

Multiple detection algorithms:
- **Impossible Time**: Task completed too quickly
- **Excessive Rate**: Too many tasks in short time
- **Rapid Succession**: Tasks completed back-to-back
- **Point Farming**: Excessive easy task completions
- **Statistical Anomalies**: Outlier detection vs. average

All configurable via environment variables.

### 4. Streak Tracking

Automatic daily streak calculation:
- Continues if user active on consecutive days
- Resets if a day is missed
- Tracks longest streak achieved

### 5. Rank Change Notifications

Notifications triggered when:
- Rank changes by 10+ positions (configurable)
- User enters top 100
- Significant group rank changes

## Scheduled Tasks

The system runs automated tasks:

1. **Ranking Refresh**: Every 5 minutes (configurable)
   - Refreshes materialized view for global rankings

2. **Session Cleanup**: Daily at midnight
   - Removes expired user sessions

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents brute force attacks
- **Helmet**: Security headers
- **CORS**: Configurable cross-origin requests
- **SQL Injection Protection**: Parameterized queries
- **Input Validation**: express-validator

## Performance Optimizations

1. **Database Indexing**: Strategic indexes on key columns
2. **Materialized Views**: Pre-computed rankings
3. **Connection Pooling**: Efficient database connections
4. **Query Optimization**: Window functions over subqueries
5. **Caching Strategy**: Materialized view refresh intervals

## Testing

Sample data is provided via the seed script:

```bash
npm run seed
```

This creates:
- 10 sample users
- 15 sample tasks
- Random task completions
- A sample friend group

**Test Credentials:**
- Username: `alice` (or any seeded username)
- Password: `Password123!`

## Monitoring and Logging

Logs are stored in the `logs/` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

Winston logger configuration in `utils/logger.js`.

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection settings in .env
# Verify database exists
psql -l
```

### Migration Errors
```bash
# Drop and recreate database
dropdb leaderboard_db
createdb leaderboard_db
npm run migrate
```

### Port Already in Use
```bash
# Change PORT in .env
# Or kill process using port
lsof -ti:5000 | xargs kill -9
```

## Development

### Adding New Endpoints

1. Create route file in `routes/`
2. Add validation middleware
3. Implement controller logic
4. Add route to `server.js`
5. Update API documentation

### Modifying Database Schema

1. Update `database/schema.sql`
2. Run migrations: `npm run migrate`
3. Update seed data if needed
4. Test thoroughly

## Production Deployment

### Recommendations

1. **Environment**:
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Configure proper `CORS_ORIGIN`

2. **Database**:
   - Use managed PostgreSQL (AWS RDS, Heroku Postgres, etc.)
   - Enable SSL connections
   - Set up regular backups
   - Configure connection pooling

3. **Server**:
   - Use process manager (PM2, systemd)
   - Set up reverse proxy (Nginx)
   - Enable HTTPS
   - Configure firewall

4. **Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Monitor database performance
   - Track API response times
   - Set up alerts

### Example PM2 Configuration

```bash
npm install -g pm2

# Start application
pm2 start server.js --name leaderboard-api

# Enable startup script
pm2 startup
pm2 save
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of a larger application. Refer to the main repository for license information.

## Support

For issues, questions, or feature requests, please open an issue in the repository.

## Acknowledgments

- PostgreSQL for powerful database features
- Express.js community
- All open-source dependencies

---

**Built with ❤️ for gamified learning**
