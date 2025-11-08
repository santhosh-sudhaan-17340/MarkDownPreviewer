# Codeial - Social Media Application

A full-featured social media application similar to Facebook, built with Node.js, Express, MongoDB, and EJS templates.

## Features

### User Authentication & Authorization
- Sign up and Sign in with email/password
- Google OAuth integration
- Password encryption with bcrypt
- Session management with Passport.js
- JWT token authentication for API

### User Profiles
- Create and edit user profiles
- Upload profile pictures
- Bio, location, and relationship status
- View posts on user profiles
- Friend count and post statistics

### Posts & Feed
- Create, edit, and delete posts
- Upload images with posts
- Privacy settings (Public, Friends, Only Me)
- News feed showing posts from friends
- Like posts
- Rich text content

### Comments System
- Comment on posts
- Nested comments/replies support
- Like comments
- Delete own comments

### Friends System
- Send friend requests
- Accept/reject friend requests
- Remove friends
- Friend suggestions
- View friends list on profile

### Real-time Features
- Socket.io integration for real-time updates
- Chat/messaging system ready
- Notification system

### Notifications
- Notification for likes
- Notification for comments
- Notification for friend requests
- Notification for friend acceptance
- Mark as read functionality

### Messages
- Direct messaging between users
- Conversation history
- Real-time message delivery (with Socket.io)
- Message read status

### Search
- Search for users
- Search for posts

### API Endpoints
- RESTful API for posts
- JWT authentication for API
- JSON responses

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB

### Authentication
- **Passport.js** - Authentication middleware
- **Passport-Local** - Local authentication strategy
- **Passport-JWT** - JWT authentication strategy
- **Passport-Google-OAuth** - Google OAuth strategy
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token generation

### File Upload
- **Multer** - File upload middleware

### Real-time
- **Socket.io** - Real-time bidirectional communication

### View Engine
- **EJS** - Embedded JavaScript templates
- **express-ejs-layouts** - Layout support for EJS

### Session & Storage
- **express-session** - Session middleware
- **connect-mongo** - MongoDB session store
- **cookie-parser** - Cookie parsing

### Other
- **dotenv** - Environment variable management
- **connect-flash** - Flash messages
- **nodemailer** - Email notifications (optional)
- **morgan** - HTTP request logger
- **express-validator** - Input validation

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd codeial
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
The `.env` file is already configured with default values. You can modify it as needed:
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/codeial
SESSION_SECRET=codeial_secret_session_key_2024
JWT_SECRET=codeial_jwt_secret_key_2024
```

For Google OAuth and email features, add your credentials:
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 4: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# On Linux/Mac
sudo systemctl start mongod

# Or using mongod directly
mongod
```

### Step 5: Run the Application
```bash
# Development mode with nodemon
npm start

# Or without nodemon
node index.js
```

The application will be available at `http://localhost:8000`

## Project Structure

```
codeial/
├── assets/
│   ├── css/              # Stylesheets
│   │   ├── layout.css
│   │   ├── header.css
│   │   ├── footer.css
│   │   ├── home.css
│   │   ├── auth.css
│   │   ├── profile.css
│   │   ├── notifications.css
│   │   ├── messages.css
│   │   └── friends.css
│   └── js/               # Client-side JavaScript
│       ├── main.js
│       └── home.js
├── config/
│   ├── mongoose.js              # MongoDB connection
│   ├── passport-local-strategy.js
│   ├── passport-jwt-strategy.js
│   ├── passport-google-oauth2-strategy.js
│   ├── middleware.js            # Custom middleware
│   ├── multer.js               # File upload configuration
│   └── chat_sockets.js         # Socket.io configuration
├── controllers/
│   ├── home_controller.js
│   ├── users_controller.js
│   ├── posts_controller.js
│   ├── comments_controller.js
│   ├── likes_controller.js
│   ├── friends_controller.js
│   ├── notifications_controller.js
│   ├── messages_controller.js
│   └── api/
│       └── v1/
│           ├── posts_api.js
│           └── users_api.js
├── models/
│   ├── user.js
│   ├── post.js
│   ├── comment.js
│   ├── like.js
│   ├── friendship.js
│   ├── notification.js
│   └── message.js
├── routes/
│   ├── index.js
│   ├── users.js
│   ├── posts.js
│   ├── comments.js
│   ├── likes.js
│   ├── friends.js
│   ├── notifications.js
│   ├── messages.js
│   └── api/
│       └── v1/
│           ├── index.js
│           ├── posts.js
│           └── users.js
├── views/
│   ├── layout.ejs
│   ├── _header.ejs
│   ├── _footer.ejs
│   ├── home.ejs
│   ├── _post.ejs
│   ├── _comment.ejs
│   ├── user_sign_in.ejs
│   ├── user_sign_up.ejs
│   ├── user_profile.ejs
│   ├── notifications.ejs
│   ├── messages.ejs
│   ├── conversation.ejs
│   └── friend_suggestions.ejs
├── uploads/              # User uploaded files
│   ├── users/
│   │   └── avatars/
│   └── posts/
├── .env                  # Environment variables
├── .gitignore
├── index.js             # Application entry point
├── package.json
└── README.md
```

## Usage Guide

### 1. Creating an Account
1. Navigate to `/users/sign-up`
2. Fill in your name, email, and password
3. Click "Sign Up"
4. You'll be redirected to sign in

### 2. Signing In
1. Navigate to `/users/sign-in`
2. Enter your email and password
3. Click "Sign In"
4. Or use "Continue with Google" for Google OAuth

### 3. Creating Posts
1. On the home page, use the "Create Post" form
2. Write your content
3. Optionally upload an image
4. Select privacy setting
5. Click "Post"

### 4. Interacting with Posts
- **Like**: Click the "Like" button
- **Comment**: Click "Comment", write your comment, and submit
- **Delete**: If it's your post, click the trash icon

### 5. Managing Friends
1. Visit another user's profile
2. Click "Add Friend" to send a request
3. Accept/reject requests from your profile
4. View friend suggestions at `/friends/suggestions`

### 6. Messaging
1. Visit a user's profile
2. Click "Message" button
3. Type your message and send

### 7. Notifications
- Click the bell icon in the navigation
- View all notifications
- Mark as read or mark all as read

### 8. Editing Profile
1. Go to your profile
2. Click "Edit Profile"
3. Update your information
4. Upload a new profile picture
5. Save changes

## API Documentation

### Authentication

#### Create Session (Login)
```
POST /api/v1/users/create-session
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Sign in successful, here is your token, please keep it safe!",
  "data": {
    "token": "jwt_token_here"
  }
}
```

### Posts

#### Get All Posts
```
GET /api/v1/posts

Response:
{
  "message": "List of posts",
  "posts": [...]
}
```

#### Delete Post
```
DELETE /api/v1/posts/:id
Authorization: Bearer <jwt_token>

Response:
{
  "message": "Post and associated comments deleted successfully"
}
```

## Security Features

- Password hashing with bcrypt
- CSRF protection
- XSS prevention
- SQL injection prevention (using Mongoose)
- Session security with HTTP-only cookies
- File upload validation
- Input sanitization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

- [ ] Video upload support
- [ ] Stories feature
- [ ] Group chat
- [ ] Event creation and management
- [ ] Photo albums
- [ ] Advanced search filters
- [ ] Mobile app
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Admin dashboard
- [ ] Report and block users
- [ ] Post sharing
- [ ] Hashtags
- [ ] Mentions
- [ ] Emoji reactions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Acknowledgments

- Express.js team
- Passport.js team
- MongoDB team
- Socket.io team
- All open-source contributors

---

**Codeial** - Connecting developers worldwide! 🚀
