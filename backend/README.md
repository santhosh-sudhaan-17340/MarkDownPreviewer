# Gamified Learning Leaderboard Backend

A comprehensive backend system for gamified learning with real-time leaderboards, streak tracking, cheat detection, and performance analytics.

## Features

### Core Features
- **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **Task Management** - CRUD operations for learning tasks with difficulty levels and categories
- **Task Completion** - Concurrent-safe task completion with optimistic locking
- **Points System** - Base points, bonus points for accuracy and speed

### Leaderboard & Rankings
- **Global Rankings** - Optimized SQL queries with window functions
- **Group Rankings** - Friend-group based leaderboards
- **Cached Rankings** - Redis caching for performance (5-minute TTL)
- **Real-time Updates** - WebSocket support for live rank changes
- **Top Performers** - Daily/weekly/monthly top performers tracking

### Streak System
- **Daily Streaks** - Track consecutive days of activity
- **Streak Bonuses** - Bonus points for maintaining streaks
- **Grace Period** - 4-hour grace period for streak maintenance
- **Streak History** - Full history of daily activities
- **Streak Leaderboard** - Dedicated leaderboard for longest streaks

### Cheat Detection
- **Speed Analysis** - Detect impossibly fast task completions
- **Accuracy Monitoring** - Flag suspiciously high accuracy patterns
- **Rate Limiting** - Detect excessive completion rates
- **Timing Patterns** - Identify automated submission patterns
- **Performance Spikes** - Flag sudden unexplained improvements
- **Review System** - Manual review workflow for flagged activities

### Notifications
- **Rank Changes** - Notify users of significant rank movements
- **Achievements** - Achievement unlock notifications
- **Streak Milestones** - Streak achievement notifications
- **Real-time Delivery** - WebSocket-based instant notifications
- **Notification History** - Persistent notification storage

### Analytics & Dashboards
- **Performance Metrics** - Daily/weekly/monthly performance tracking
- **Category Breakdown** - Performance analysis by task category
- **Difficulty Analysis** - Completion stats by difficulty level
- **Progress Tracking** - Time-series progress visualization
- **Activity Feed** - Recent activity timeline
- **Global Statistics** - Platform-wide analytics

### Friend Groups
- **Group Creation** - Public and private groups
- **Group Management** - Owner/admin role system
- **Group Rankings** - Leaderboards scoped to friend groups
- **Member Management** - Join/leave/invite functionality

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Validation**: Joi
- **Logging**: Winston
- **Scheduling**: node-cron

## Architecture

### Database Design
- **Optimized Indexes** - Strategic indexing for fast queries
- **Window Functions** - Efficient ranking with SQL window functions
- **Materialized Cache** - Cached rankings table for performance
- **Transactions** - ACID compliance for critical operations
- **Audit Logs** - Complete history of score changes

### Concurrency Control
- **Redis Locks** - Distributed locking for task completions
- **Optimistic Locking** - Version-based conflict detection
- **Transaction Isolation** - Serializable transactions for critical paths
- **Connection Pooling** - Efficient database connection management

### Caching Strategy
- **Multi-layer Cache** - Redis for hot data, PostgreSQL for persistence
- **TTL-based Invalidation** - Automatic cache expiration
- **Pattern-based Clearing** - Smart cache invalidation on updates
- **Sorted Sets** - Redis sorted sets for leaderboard caching

## Installation

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis 7 or higher

### Local Development

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

4. **Set up the database**
```bash
# Create database
createdb leaderboard_db

# Run schema
psql leaderboard_db < database/schema.sql
```

5. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Docker Deployment

1. **Configure environment**
```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export JWT_SECRET=your_jwt_secret
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Check service health**
```bash
docker-compose ps
```

4. **View logs**
```bash
docker-compose logs -f api
```

5. **Stop services**
```bash
docker-compose down
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

**Required:**
- `DB_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing secret

**Optional:**
- `PORT` - API port (default: 3000)
- `DB_HOST` - Database host (default: localhost)
- `REDIS_HOST` - Redis host (default: localhost)
- `CHEAT_DETECTION_ENABLED` - Enable cheat detection (default: true)
- `LOG_LEVEL` - Logging level (default: info)

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

**Base URL:** `http://localhost:3000/api/v1`

**Key Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /leaderboard/global` - Global rankings
- `POST /tasks/complete` - Complete a task
- `GET /analytics/performance/:userId` - User analytics

## Database Schema

### Key Tables
- **users** - User accounts and aggregate stats
- **tasks** - Learning tasks with difficulty and categories
- **task_completions** - Completed tasks with performance metrics
- **score_updates** - Audit log of all point changes
- **streak_history** - Daily activity tracking
- **friend_groups** - User-created groups
- **cached_rankings** - Materialized ranking cache
- **cheat_detection_logs** - Anomaly detection logs
- **notifications** - User notifications

### Optimized Functions
- `update_user_points()` - Concurrent-safe point updates
- `update_user_streak()` - Streak calculation and bonuses
- `get_global_rankings()` - Optimized global leaderboard
- `get_group_rankings()` - Optimized group leaderboard

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linter
npm run lint

# Format code
npm run format
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Metrics
- Database connection pool status
- Redis connection status
- Active WebSocket connections
- Request rate and response times

## Scheduled Tasks

The system runs several cron jobs:
- **Every 5 minutes**: Update cached rankings
- **Midnight daily**: Check and update user streaks
- **2 AM daily**: Clean up old notifications

## Security

### Implemented
- JWT authentication with expiration
- Password hashing with bcrypt (12 rounds)
- Rate limiting on all endpoints
- Strict rate limiting on auth endpoints
- SQL injection prevention (parameterized queries)
- XSS protection via Helmet
- CORS configuration
- Input validation with Joi

### Best Practices
- Change default JWT secret in production
- Use strong database passwords
- Enable SSL for PostgreSQL in production
- Set up firewall rules
- Regular security audits
- Keep dependencies updated

## Performance

### Optimizations
- Database connection pooling (2-10 connections)
- Redis caching with smart invalidation
- Materialized ranking cache
- SQL query optimization with indexes
- Batch operations for bulk updates
- Efficient JSON serialization

### Benchmarks
- Task completion: ~50ms (with cache)
- Global leaderboard: ~10ms (cached), ~100ms (fresh)
- User rank lookup: ~5ms (cached), ~30ms (fresh)

## Troubleshooting

### Common Issues

**Database connection failed**
- Verify PostgreSQL is running
- Check DB credentials in .env
- Ensure database exists

**Redis connection failed**
- Verify Redis is running
- Check Redis host/port configuration

**Port already in use**
- Change PORT in .env
- Kill process using the port

**Cheat detection too sensitive**
- Adjust thresholds in .env
- Review detection logs
- Disable if needed for testing

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration (DB, Redis)
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── server.ts        # Entry point
├── database/
│   └── schema.sql       # Database schema
├── logs/                # Application logs
└── dist/                # Compiled JavaScript
```

### Adding New Features

1. Create service in `src/services/`
2. Add route in `src/routes/`
3. Update API documentation
4. Add tests
5. Update CHANGELOG

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linter and tests
6. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact the development team
- Check the API documentation

## Changelog

See CHANGELOG.md for version history and updates.

---

Built with ❤️ for gamified learning
