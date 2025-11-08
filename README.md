# Skill Barter Marketplace

A peer-to-peer platform for exchanging skills without money. Trade coding for guitar lessons, design for language tutoring, or any skill combination you can imagine.

## Features

### Core Functionality
- **User Authentication** - Secure JWT-based authentication system
- **Smart Matching Engine** - AI-powered algorithm that matches users based on:
  - Skill compatibility (what you offer vs what others want)
  - Reputation scores
  - Availability overlap
  - Activity levels
- **Reputation System** - Build trust through detailed reviews and ratings
- **Time Credits Escrow** - Fair exchange guaranteed with automated credit management
- **Video Sessions** - Integrated WebRTC video calling for face-to-face learning
- **Session Scheduling** - Easy booking and management of skill exchange sessions

### Key Features Breakdown

#### 1. Smart Matching Engine
The matching algorithm scores potential matches (0-100) based on:
- **Skill Match (40%)** - Bidirectional skill compatibility
- **Reputation (30%)** - Partner's rating and review count
- **Availability (20%)** - Time slot overlap
- **Activity (10%)** - Completed sessions history

#### 2. Reputation System
- 5-star rating system
- Detailed reviews with skill, communication, and punctuality ratings
- Review tags (helpful, knowledgeable, patient, etc.)
- Bonus credits for high ratings (4+ stars)

#### 3. Time Credits Escrow
- Automatic credit locking when sessions are scheduled
- Credits released upon session completion
- Automatic refunds for cancellations
- Penalty system for late cancellations (within 24 hours)
- Starting balance: 10 credits for new users
- Rate: 1 credit per 30 minutes

#### 4. Video Sessions
- WebRTC peer-to-peer video calling
- Audio/video toggle controls
- Real-time session status updates
- Support for multiple concurrent sessions

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.io Client** - WebSocket client
- **Simple Peer** - WebRTC wrapper
- **Tailwind CSS** - Styling
- **React Icons** - Icon library
- **React Toastify** - Notifications

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Configure environment variables**
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skill-barter
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

5. **Start MongoDB**
Make sure MongoDB is running on your system:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

6. **Run the application**

Development mode (runs both backend and frontend):
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### User Endpoints

#### Get User Profile
```http
GET /api/users/:id
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "bio": "Full-stack developer...",
  "availability": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

#### Add Skill Offered
```http
POST /api/users/skills/offered
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "React Development",
  "category": "Programming",
  "level": "Advanced",
  "description": "Build modern web apps with React",
  "hoursAvailable": 10
}
```

#### Add Skill Wanted
```http
POST /api/users/skills/wanted
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Guitar Lessons",
  "category": "Music",
  "level": "Beginner"
}
```

### Match Endpoints

#### Find Matches
```http
GET /api/matches/find
Authorization: Bearer <token>
```

#### Get User Matches
```http
GET /api/matches
Authorization: Bearer <token>
```

#### Accept Match
```http
PUT /api/matches/:id/accept
Authorization: Bearer <token>
```

#### Decline Match
```http
PUT /api/matches/:id/decline
Authorization: Bearer <token>
```

### Session Endpoints

#### Create Session
```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "matchId": "match_id",
  "teacherId": "teacher_id",
  "skill": "React Development",
  "scheduledStart": "2025-11-15T10:00:00Z",
  "duration": 60
}
```

#### Get Sessions
```http
GET /api/sessions?upcoming=true&status=scheduled
Authorization: Bearer <token>
```

#### Start Session
```http
PUT /api/sessions/:id/start
Authorization: Bearer <token>
```

#### Complete Session
```http
PUT /api/sessions/:id/complete
Authorization: Bearer <token>
```

#### Cancel Session
```http
PUT /api/sessions/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

### Review Endpoints

#### Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session_id",
  "revieweeId": "user_id",
  "rating": 5,
  "skillRating": 5,
  "communicationRating": 5,
  "punctualityRating": 5,
  "comment": "Excellent teacher!",
  "tags": ["knowledgeable", "patient", "helpful"]
}
```

#### Get User Reviews
```http
GET /api/reviews/user/:userId
```

## Database Schema

### User
- Authentication (email, password)
- Profile (name, bio, profileImage)
- Skills offered and wanted
- Time credits (available and escrowed)
- Reputation (rating and review count)
- Availability schedule
- Activity metrics

### Match
- Two users with their offered/wanted skills
- Match score (0-100)
- Status (pending, accepted, declined, expired)
- Expiration date

### Session
- Participants (teacher and learner)
- Skill being taught
- Scheduling (start/end times, duration)
- Credits locked
- Video room ID
- Status tracking

### Review
- Session reference
- Reviewer and reviewee
- Ratings (overall, skill, communication, punctuality)
- Comment and tags
- Visibility settings

### Transaction
- Credit movement tracking
- Types: escrow, release, refund, bonus, penalty
- Status and metadata

## Project Structure

```
skill-barter-marketplace/
├── server/
│   ├── config/
│   │   └── db.js                 # Database connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── userController.js     # User management
│   │   ├── matchController.js    # Matching logic
│   │   ├── sessionController.js  # Session management
│   │   └── reviewController.js   # Review system
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── errorHandler.js       # Error handling
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Match.js              # Match schema
│   │   ├── Session.js            # Session schema
│   │   ├── Review.js             # Review schema
│   │   └── Transaction.js        # Transaction schema
│   ├── routes/
│   │   ├── auth.js               # Auth routes
│   │   ├── users.js              # User routes
│   │   ├── matches.js            # Match routes
│   │   ├── sessions.js           # Session routes
│   │   └── reviews.js            # Review routes
│   ├── utils/
│   │   ├── matchingEngine.js     # Smart matching algorithm
│   │   └── escrowService.js      # Credit management
│   └── index.js                  # Server entry point
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.js         # Navigation bar
│   │   ├── context/
│   │   │   └── AuthContext.js    # Authentication context
│   │   ├── pages/
│   │   │   ├── Home.js           # Landing page
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Register.js       # Registration page
│   │   │   ├── Dashboard.js      # User dashboard
│   │   │   ├── Profile.js        # User profile
│   │   │   ├── Matches.js        # Match browsing
│   │   │   ├── Sessions.js       # Session management
│   │   │   └── VideoRoom.js      # Video calling
│   │   ├── App.js                # Main app component
│   │   ├── index.js              # React entry point
│   │   └── index.css             # Global styles
│   └── package.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Usage Guide

### Getting Started

1. **Create an Account**
   - Sign up with your name, email, and password
   - You'll receive 10 starting credits

2. **Set Up Your Profile**
   - Add skills you can offer (e.g., "React Development", "Guitar Lessons")
   - Add skills you want to learn
   - Set your availability schedule

3. **Find Matches**
   - Click "Find Matches" to discover compatible users
   - The algorithm will show you the best matches based on mutual interests

4. **Accept Matches**
   - Review potential matches and their profiles
   - Accept matches that interest you
   - Both users must accept for a match to be confirmed

5. **Schedule Sessions**
   - Once matched, schedule a session
   - Credits are automatically locked in escrow
   - You can cancel up to 24 hours before without penalty

6. **Join Video Sessions**
   - Join the video room 10 minutes before the scheduled time
   - Use the built-in video/audio controls
   - Complete the session when finished

7. **Leave Reviews**
   - Rate your experience after each session
   - Earn bonus credits for receiving 4+ star reviews
   - Build your reputation to attract more matches

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected API routes
- Input validation and sanitization
- CORS configuration
- Secure escrow system

## Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Group sessions support
- [ ] Advanced search and filters
- [ ] Messaging system
- [ ] Calendar integration
- [ ] Payment integration for premium features
- [ ] Skill verification badges
- [ ] Automated session reminders
- [ ] Analytics dashboard
- [ ] Multi-language support

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- Built with modern web technologies
- Inspired by the sharing economy and peer-to-peer learning
- Special thanks to the open-source community

---

**Happy Skill Swapping!** 🚀
