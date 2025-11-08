# Gamified Learning Leaderboard API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Examples](#examples)

## Overview

Base URL: `http://localhost:5000/api`

All API responses follow this structure:
```json
{
  "success": true/false,
  "message": "Optional message",
  "data": {},
  "error": "Error message if applicable"
}
```

## Authentication

Most endpoints require authentication via JWT Bearer token.

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123!",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "totalPoints": 0,
      "currentStreak": 0,
      "joinDate": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Login
**POST** `/auth/login`

Login and receive JWT token.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe"
    }
  }
}
```

#### 3. Logout
**POST** `/auth/logout`

Logout and invalidate current session.

**Headers:** Requires Authentication

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### 4. Get Current User
**GET** `/auth/me`

Get current authenticated user's information.

**Headers:** Requires Authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "avatarUrl": null,
      "totalPoints": 5000,
      "currentStreak": 7,
      "longestStreak": 15,
      "lastActivityDate": "2025-01-08",
      "joinDate": "2025-01-01T00:00:00.000Z",
      "globalRank": 42
    }
  }
}
```

---

### Task Endpoints

#### 1. Get All Tasks
**GET** `/tasks`

Get paginated list of all active tasks.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Filter by category
- `difficulty` (optional): Filter by difficulty (easy, medium, hard, expert)

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Introduction to Variables",
        "description": "Learn about variables and data types",
        "category": "Programming",
        "difficulty": "easy",
        "basePoints": 100,
        "timeLimitMinutes": 15,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "completedByUser": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

#### 2. Get Task Details
**GET** `/tasks/:id`

Get detailed information about a specific task.

**Headers:** Requires Authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "uuid",
      "title": "Introduction to Variables",
      "description": "Learn about variables and data types",
      "category": "Programming",
      "difficulty": "easy",
      "basePoints": 100,
      "timeLimitMinutes": 15,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "completedByUser": true,
      "completion": {
        "completionDate": "2025-01-05T10:30:00.000Z",
        "pointsEarned": 150,
        "timeTaken": 480
      }
    }
  }
}
```

#### 3. Complete Task
**POST** `/tasks/:id/complete`

Complete a task and earn points (with cheat detection).

**Headers:** Requires Authentication

**Request Body:**
```json
{
  "timeTaken": 480
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "completion": {
      "id": "uuid",
      "taskId": "uuid",
      "taskTitle": "Introduction to Variables",
      "pointsEarned": 150,
      "timeTaken": 480,
      "completionDate": "2025-01-08T14:30:00.000Z",
      "flaggedForReview": false
    },
    "userStats": {
      "totalPoints": 5150,
      "currentStreak": 8,
      "globalRank": 40
    }
  }
}
```

#### 4. Create Task (Admin Only)
**POST** `/tasks`

Create a new task (admin access required).

**Headers:** Requires Authentication (Admin)

**Request Body:**
```json
{
  "title": "New Challenge",
  "description": "Complete this challenge",
  "category": "Programming",
  "difficulty": "medium",
  "basePoints": 250,
  "timeLimitMinutes": 30
}
```

---

### Leaderboard Endpoints

#### 1. Global Leaderboard
**GET** `/leaderboard/global`

Get global leaderboard with optimized SQL ranking.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `timeframe` (optional): all, week, month (default: all)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "username": "alice",
        "displayName": "Alice Johnson",
        "avatarUrl": null,
        "points": 10500,
        "currentStreak": 25,
        "isCurrentUser": false
      }
    ],
    "currentUser": {
      "rank": 42,
      "userId": "uuid"
    },
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1000,
      "pages": 20
    },
    "timeframe": "all"
  }
}
```

#### 2. Friend Group Leaderboard
**GET** `/leaderboard/group/:groupId`

Get leaderboard for a specific friend group.

**Headers:** Requires Authentication

**Query Parameters:** Same as global leaderboard

**Response:** Similar structure to global leaderboard

#### 3. Category Leaderboard
**GET** `/leaderboard/category/:category`

Get leaderboard for a specific category.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "Programming",
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "username": "alice",
        "displayName": "Alice Johnson",
        "avatarUrl": null,
        "categoryPoints": 5200,
        "tasksCompleted": 25,
        "currentStreak": 10,
        "isCurrentUser": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 500,
      "pages": 10
    }
  }
}
```

---

### Friend Group Endpoints

#### 1. Create Friend Group
**POST** `/groups`

Create a new friend group.

**Headers:** Requires Authentication

**Request Body:**
```json
{
  "name": "Study Buddies",
  "description": "A group for collaborative learning",
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Friend group created successfully",
  "data": {
    "group": {
      "id": "uuid",
      "name": "Study Buddies",
      "description": "A group for collaborative learning",
      "isPublic": true,
      "inviteCode": "ABC123XY",
      "createdBy": "uuid",
      "createdAt": "2025-01-08T00:00:00.000Z"
    }
  }
}
```

#### 2. Get User's Friend Groups
**GET** `/groups`

Get all friend groups user is a member of.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "uuid",
        "name": "Study Buddies",
        "description": "A group for collaborative learning",
        "isPublic": true,
        "createdBy": "uuid",
        "creatorUsername": "alice",
        "memberCount": 15,
        "userRole": "member",
        "joinedAt": "2025-01-02T00:00:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

#### 3. Join Friend Group
**POST** `/groups/join`

Join a friend group using invite code.

**Headers:** Requires Authentication

**Request Body:**
```json
{
  "inviteCode": "ABC123XY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined friend group",
  "data": {
    "groupId": "uuid",
    "groupName": "Study Buddies"
  }
}
```

#### 4. Leave Friend Group
**DELETE** `/groups/:id/leave`

Leave a friend group.

**Headers:** Requires Authentication

#### 5. Delete Friend Group
**DELETE** `/groups/:id`

Delete a friend group (owner only).

**Headers:** Requires Authentication

---

### Analytics Endpoints

#### 1. Performance Dashboard
**GET** `/analytics/dashboard`

Get comprehensive performance analytics dashboard.

**Headers:** Requires Authentication

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "overallStats": {
      "totalPoints": 5000,
      "currentStreak": 7,
      "longestStreak": 15,
      "globalRank": 42,
      "totalTasksCompleted": 50,
      "uniqueTasksCompleted": 35,
      "activeDays": 25,
      "avgPointsPerTask": "100.00"
    },
    "dailyTrends": [
      {
        "date": "2025-01-08",
        "tasksCompleted": 3,
        "pointsEarned": 450,
        "avgTimeTaken": "600.50"
      }
    ],
    "categoryBreakdown": [
      {
        "category": "Programming",
        "tasksCompleted": 20,
        "totalPoints": 2500,
        "avgPoints": "125.00"
      }
    ],
    "difficultyBreakdown": [
      {
        "difficulty": "easy",
        "tasksCompleted": 15,
        "totalPoints": 1500,
        "avgTimeTaken": "450.00"
      }
    ],
    "rankHistory": [
      {
        "date": "2025-01-01",
        "rank": 50
      }
    ],
    "recentAchievements": [
      {
        "achievement": "1000 Points Milestone",
        "date": "2025-01-05T00:00:00.000Z"
      }
    ],
    "comparison": {
      "avgPointsOfSimilarUsers": "4800.50",
      "avgStreakOfSimilarUsers": "6.50",
      "similarUserCount": 10
    },
    "timeframe": "30 days"
  }
}
```

#### 2. Performance Trends
**GET** `/analytics/performance-trends`

Get detailed performance trends over time.

**Headers:** Requires Authentication

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

#### 3. Cheat Detection Logs
**GET** `/analytics/cheat-detection`

Get cheat detection logs for the current user.

**Headers:** Requires Authentication

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "detectionType": "rapid_completion",
        "severity": "high",
        "description": "Task completed 3.5s after previous task",
        "confidenceScore": 0.85,
        "isResolved": false,
        "taskTitle": "Introduction to Variables",
        "createdAt": "2025-01-08T10:00:00.000Z"
      }
    ],
    "summary": {
      "totalFlags": 5,
      "criticalCount": 0,
      "highCount": 2,
      "mediumCount": 2,
      "lowCount": 1,
      "unresolvedCount": 3
    }
  }
}
```

---

### Notification Endpoints

#### 1. Get Notifications
**GET** `/notifications`

Get user's notifications.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `unreadOnly` (optional): true/false

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "rank_change",
        "title": "Rank Update!",
        "message": "Your rank changed from #45 to #42",
        "oldRank": 45,
        "newRank": 42,
        "rankChange": 3,
        "groupName": null,
        "isRead": false,
        "createdAt": "2025-01-08T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "pages": 1
    },
    "unreadCount": 3
  }
}
```

#### 2. Mark Notification as Read
**PUT** `/notifications/:id/read`

Mark a specific notification as read.

**Headers:** Requires Authentication

#### 3. Mark All as Read
**PUT** `/notifications/read-all`

Mark all notifications as read.

**Headers:** Requires Authentication

#### 4. Delete Notification
**DELETE** `/notifications/:id`

Delete a notification.

**Headers:** Requires Authentication

#### 5. Check Rank Changes
**POST** `/notifications/check-rank-changes`

Manually trigger rank change check.

**Headers:** Requires Authentication

---

### User Endpoints

#### 1. Get User Profile
**GET** `/users/:id`

Get user profile by ID.

**Headers:** Requires Authentication

#### 2. Get User Score History
**GET** `/users/:id/history`

Get user's score history.

**Headers:** Requires Authentication

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

#### 3. Get User Streaks
**GET** `/users/:id/streaks`

Get user's streak history.

**Headers:** Requires Authentication

**Query Parameters:**
- `days` (optional): Number of days (default: 30)

---

## Error Handling

All errors follow this structure:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default**: 100 requests per 15 minutes per IP address
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Examples

### Complete Workflow Example

#### 1. Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "Password123!",
    "displayName": "New User"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "Password123!"
  }'
```

#### 3. Get tasks (using token from login)
```bash
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Complete a task
```bash
curl -X POST http://localhost:5000/api/tasks/TASK_UUID/complete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timeTaken": 480
  }'
```

#### 5. Check global leaderboard
```bash
curl -X GET "http://localhost:5000/api/leaderboard/global?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 6. Get analytics dashboard
```bash
curl -X GET "http://localhost:5000/api/analytics/dashboard?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Key Features

### 1. Optimized SQL Ranking
- Uses PostgreSQL window functions (RANK(), DENSE_RANK())
- Materialized views for all-time rankings (refreshed periodically)
- Dynamic ranking for timeframe-specific leaderboards

### 2. Concurrent Score Updates
- Uses database row-level locking (FOR UPDATE)
- Transactions ensure atomic operations
- Prevents race conditions during simultaneous task completions

### 3. Streak Tracking
- Daily activity tracking
- Automatic streak calculation
- Historical streak data

### 4. Cheat Detection
- Rapid completion detection
- Impossible time detection
- Excessive rate detection
- Pattern anomaly detection
- Statistical outlier detection
- Configurable rules and thresholds

### 5. Rank Change Notifications
- Automatic notifications for significant rank changes (10+ positions)
- Top 100 entry notifications
- Group-specific rank notifications

### 6. Performance Analytics
- Daily trends visualization
- Category and difficulty breakdowns
- Comparison with similar users
- Achievement tracking
- Historical rank progression

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=leaderboard_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

CHEAT_DETECTION_ENABLED=true
MAX_TASKS_PER_HOUR=50
MIN_TASK_TIME_SECONDS=10

RANKING_REFRESH_INTERVAL=5
SIGNIFICANT_RANK_CHANGE=10
```

---

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create PostgreSQL database:
```bash
createdb leaderboard_db
```

3. Run migrations:
```bash
npm run migrate
```

4. Seed database (optional):
```bash
npm run seed
```

5. Start server:
```bash
npm start
# or for development
npm run dev
```

---

## Database Schema Highlights

### Key Tables
- `users`: User accounts and stats
- `tasks`: Available tasks/challenges
- `user_task_completions`: Task completion records
- `score_history`: Point change history
- `streaks`: Daily activity tracking
- `friend_groups`: Friend group management
- `group_memberships`: Group membership records
- `rank_notifications`: Rank change notifications
- `cheat_detection_logs`: Suspicious activity logs
- `performance_metrics`: Daily performance metrics

### Materialized View
- `global_rankings`: Optimized global leaderboard (refreshed periodically)

### Key Functions
- `update_user_points()`: Automatically updates user points on task completion
- `update_user_streak()`: Updates user's streak information
- `check_rank_change()`: Checks for significant rank changes and creates notifications

---

## Support

For issues, questions, or contributions, please refer to the project repository.
