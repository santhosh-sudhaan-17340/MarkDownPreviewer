# Gamified Learning Leaderboard API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Tasks](#tasks)
  - [Leaderboard](#leaderboard)
  - [Groups](#groups)
  - [Notifications](#notifications)
  - [Analytics](#analytics)

---

## Overview

Base URL: `http://localhost:3000/api/v1`

All API responses follow this format:
```json
{
  "success": true/false,
  "message": "Optional message",
  "data": { /* response data */ }
}
```

---

## Authentication

Most endpoints require authentication via JWT Bearer token.

### Headers
```
Authorization: Bearer <your_jwt_token>
```

---

## Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes
- **Strict endpoints** (login/register): 5 requests per minute

---

## Endpoints

### Auth

#### Register User
```
POST /auth/register
```

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
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
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "displayName": "John Doe"
    },
    "token": "jwt_token_here"
  }
}
```

#### Change Password
```
POST /auth/change-password
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

#### Get Current User
```
GET /auth/me
```
**Auth Required:** Yes

---

### Users

#### Get User Profile
```
GET /users/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "https://...",
      "totalPoints": 1500,
      "globalRank": 42,
      "currentStreak": 7,
      "longestStreak": 14,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

#### Get User Stats
```
GET /users/:userId/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 1500,
    "globalRank": 42,
    "currentStreak": 7,
    "longestStreak": 14,
    "totalCompleted": 45,
    "totalPointsEarned": 1500,
    "avgAccuracy": 87.5,
    "avgCompletionTime": 245,
    "activeDays": 30
  }
}
```

#### Get User Streak
```
GET /users/:userId/streak
```

#### Get Streak History
```
GET /users/:userId/streak/history?days=30
```

#### Update Profile
```
PATCH /users/me
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "displayName": "John Smith",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

#### Search Users
```
GET /users?query=john&limit=20
```

---

### Tasks

#### Get All Tasks
```
GET /tasks?category=programming&difficulty=intermediate&isActive=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Build a REST API",
        "description": "Create a RESTful API using Express",
        "category": "programming",
        "difficulty": "intermediate",
        "basePoints": 100,
        "bonusPoints": 20,
        "timeLimitMinutes": 60,
        "isActive": true
      }
    ],
    "count": 1
  }
}
```

#### Get Task by ID
```
GET /tasks/:taskId
```

#### Get User Task Progress
```
GET /tasks/user/progress
```
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "taskId": "uuid",
        "title": "Build a REST API",
        "category": "programming",
        "difficulty": "intermediate",
        "basePoints": 100,
        "pointsEarned": 120,
        "completionTimeSeconds": 3450,
        "accuracyPercentage": 95.5,
        "completedAt": "2025-01-01T12:00:00Z",
        "isValid": true
      }
    ],
    "count": 1
  }
}
```

#### Complete Task
```
POST /tasks/complete
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "taskId": "uuid",
  "completionTimeSeconds": 3450,
  "accuracyPercentage": 95.5
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
      "pointsEarned": 120,
      "completedAt": "2025-01-01T12:00:00Z"
    },
    "pointsEarned": 120,
    "totalPoints": 1620,
    "oldRank": 45,
    "newRank": 42,
    "streak": {
      "currentStreak": 8,
      "longestStreak": 14,
      "streakMaintained": true
    }
  }
}
```

#### Create Task
```
POST /tasks
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "Build a REST API",
  "description": "Create a RESTful API using Express",
  "category": "programming",
  "difficulty": "intermediate",
  "basePoints": 100,
  "bonusPoints": 20,
  "timeLimitMinutes": 60
}
```

#### Update Task
```
PATCH /tasks/:taskId
```
**Auth Required:** Yes

---

### Leaderboard

#### Get Global Rankings
```
GET /leaderboard/global?limit=100&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "userId": "uuid",
        "username": "topplayer",
        "displayName": "Top Player",
        "avatarUrl": "https://...",
        "totalPoints": 5000,
        "currentStreak": 30,
        "rankChange": 2
      }
    ],
    "count": 100,
    "limit": 100,
    "offset": 0
  }
}
```

#### Get Group Rankings
```
GET /leaderboard/group/:groupId?limit=100&offset=0
```
**Auth Required:** Yes

#### Get User Rank (Global)
```
GET /leaderboard/user/:userId/rank
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rank": 42,
    "totalPoints": 1620,
    "totalUsers": 1000,
    "percentile": "95.80"
  }
}
```

#### Get User Rank (Group)
```
GET /leaderboard/user/:userId/rank/group/:groupId
```
**Auth Required:** Yes

#### Get Users Around Rank
```
GET /leaderboard/user/:userId/around?range=5
```
**Auth Required:** Yes

Returns users ranked above and below the specified user.

#### Get Top Performers
```
GET /leaderboard/top-performers?timeframe=week&limit=10
```

**Query Parameters:**
- `timeframe`: `day`, `week`, or `month`
- `limit`: Number of results (max 50)

#### Get Streak Leaderboard
```
GET /leaderboard/streaks?limit=10
```

---

### Groups

#### Get Public Groups
```
GET /groups/public?limit=50&offset=0
```

#### Get My Groups
```
GET /groups/my-groups
```
**Auth Required:** Yes

#### Get Group Details
```
GET /groups/:groupId
```
**Auth Required:** Yes

#### Get Group Members
```
GET /groups/:groupId/members
```
**Auth Required:** Yes

#### Create Group
```
POST /groups
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "Study Buddies",
  "description": "A group for studying together",
  "isPublic": true
}
```

#### Update Group
```
PATCH /groups/:groupId
```
**Auth Required:** Yes (Owner/Admin only)

#### Join Group
```
POST /groups/:groupId/join
```
**Auth Required:** Yes

(Only for public groups)

#### Leave Group
```
POST /groups/:groupId/leave
```
**Auth Required:** Yes

#### Delete Group
```
DELETE /groups/:groupId
```
**Auth Required:** Yes (Owner only)

---

### Notifications

#### Get Notifications
```
GET /notifications?limit=50&offset=0
```
**Auth Required:** Yes

#### Get Unread Notifications
```
GET /notifications/unread
```
**Auth Required:** Yes

#### Get Notification Stats
```
GET /notifications/stats
```
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "unread": 5,
    "read": 145,
    "rankChanges": 20,
    "achievements": 30,
    "streakBroken": 2
  }
}
```

#### Mark Notification as Read
```
PATCH /notifications/:notificationId/read
```
**Auth Required:** Yes

#### Mark All as Read
```
PATCH /notifications/read-all
```
**Auth Required:** Yes

#### Delete Notification
```
DELETE /notifications/:notificationId
```
**Auth Required:** Yes

---

### Analytics

#### Get User Performance Metrics
```
GET /analytics/performance/:userId?days=30
```
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "metricDate": "2025-01-01",
        "tasksCompleted": 5,
        "pointsEarned": 250,
        "avgAccuracy": 92.5,
        "avgCompletionTimeSeconds": 300,
        "categoriesAttempted": {"programming": 3, "math": 2},
        "streakMaintained": true
      }
    ],
    "days": 30
  }
}
```

#### Get Category Breakdown
```
GET /analytics/categories/:userId
```
**Auth Required:** Yes

#### Get Difficulty Breakdown
```
GET /analytics/difficulty/:userId
```
**Auth Required:** Yes

#### Get Progress Over Time
```
GET /analytics/progress/:userId?interval=day&limit=30
```
**Auth Required:** Yes

**Query Parameters:**
- `interval`: `day`, `week`, or `month`
- `limit`: Number of periods (max 100)

#### Get Cheat Detection Logs
```
GET /analytics/cheat-detection/:userId?limit=10
```
**Auth Required:** Yes

#### Get Cheat Detection Stats
```
GET /analytics/cheat-detection/stats/:userId
```
**Auth Required:** Yes

#### Get Global Analytics
```
GET /analytics/global
```
**Auth Required:** Yes

#### Get Activity Feed
```
GET /analytics/activity/:userId?limit=20
```
**Auth Required:** Yes

---

## WebSocket Events

The API supports real-time notifications via Socket.IO.

### Client Events

#### Join User Room
```javascript
socket.emit('join-room', userId);
```

### Server Events

#### Task Completed
```javascript
socket.on('task_completed', (data) => {
  // data contains completion details
});
```

#### Notification Received
```javascript
socket.on('notification', (notification) => {
  // notification object
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Cheat Detection

The system automatically monitors for:

1. **Impossible Speed** - Completing tasks too quickly
2. **Suspicious Accuracy** - Consistently perfect scores
3. **Excessive Completion Rate** - Too many tasks in short time
4. **Suspicious Timing Patterns** - Multiple tasks at exact same times
5. **Performance Spikes** - Sudden unexplained improvements

Flagged activities are logged and can be reviewed via analytics endpoints.

---

## Best Practices

1. **Always include authentication token** for protected endpoints
2. **Handle rate limiting** - Implement exponential backoff
3. **Cache leaderboard data** on client side (updated every 5 minutes)
4. **Use pagination** for large datasets
5. **Subscribe to WebSocket events** for real-time updates
6. **Validate input** before sending requests

---

## Support

For issues or questions, please contact the development team or open an issue in the repository.
